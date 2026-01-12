import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/roles.js";
import { db } from "../lib/firebaseAdmin.js";
import { sendPromotionalEmail } from "../lib/promotionalEmail.js";

const router = Router();

// All routes require authentication and ADMIN role
router.use(verifyFirebaseToken);
router.use(requireRole("ADMIN"));

// Get count of subscribers (users with emailConsent = true)
router.get("/subscribers", async (req, res) => {
  try {
    const usersSnapshot = await db
      .collection("users")
      .where("emailConsent", "==", true)
      .get();

    // Count only users with valid email addresses
    let count = 0;
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.email && userData.email.trim()) {
        count++;
      }
    });

    // Also get total user count and count without emailConsent
    const allUsersSnapshot = await db.collection("users").get();
    let totalUsers = 0;
    let usersWithoutConsent = 0;
    let usersWithoutEmail = 0;

    allUsersSnapshot.forEach((doc) => {
      const userData = doc.data();
      totalUsers++;
      if (!userData.email || !userData.email.trim()) {
        usersWithoutEmail++;
      } else if (userData.emailConsent !== true) {
        usersWithoutConsent++;
      }
    });

    res.json({ 
      count,
      totalUsers,
      usersWithoutConsent,
      usersWithoutEmail,
      message: `${count} users will receive emails. ${usersWithoutConsent} users have emailConsent=false or undefined, ${usersWithoutEmail} users have no email address.`
    });
  } catch (error) {
    console.error("Error counting subscribers:", error);
    res.status(500).json({
      error: "Failed to count subscribers",
      details: error.message,
    });
  }
});

// Send bulk email to all subscribers
router.post("/send", async (req, res) => {
  try {
    const { subject, message } = req.body;

    // Validate required fields
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        error: "Subject is required",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    // Get all users with emailConsent = true
    const usersSnapshot = await db
      .collection("users")
      .where("emailConsent", "==", true)
      .get();

    if (usersSnapshot.empty) {
      return res.json({
        success: true,
        sentCount: 0,
        message: "No subscribers found",
      });
    }

    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      // Only include users with valid email addresses
      if (userData.email && userData.email.trim()) {
        users.push({
          uid: doc.id,
          email: userData.email.trim(),
          displayName: userData.displayName || "Customer",
        });
      } else {
        console.warn(`[BULK-EMAIL] User ${doc.id} skipped: no email address`);
      }
    });

    console.log(`[BULK-EMAIL] Sending to ${users.length} subscribers`);

    // Send emails in batches to avoid overwhelming the email service
    const batchSize = 10; // Send 10 emails at a time
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // Send emails in parallel for this batch
      const batchPromises = batch.map(async (user) => {
        try {
          const result = await sendPromotionalEmail(
            user.email,
            user.displayName,
            subject.trim(),
            message.trim()
          );

          if (result.success) {
            sentCount++;
            return { success: true, email: user.email };
          } else {
            failedCount++;
            errors.push({
              email: user.email,
              error: result.error,
            });
            return { success: false, email: user.email, error: result.error };
          }
        } catch (error) {
          failedCount++;
          errors.push({
            email: user.email,
            error: error.message,
          });
          return { success: false, email: user.email, error: error.message };
        }
      });

      await Promise.all(batchPromises);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(
      `[BULK-EMAIL] Completed: ${sentCount} sent, ${failedCount} failed`
    );

    res.json({
      success: true,
      sentCount,
      failedCount,
      totalCount: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error sending bulk email:", error);
    res.status(500).json({
      error: "Failed to send bulk email",
      details: error.message,
    });
  }
});

export default router;

