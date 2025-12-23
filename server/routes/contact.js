// server/routes/contact.js
import { Router } from "express";
import admin from "firebase-admin";
import { sendContactFormEmail } from "../lib/emailService.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/roles.js";

const db = admin.firestore();
const router = Router();

// Submit contact form (public endpoint)
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: "Missing required fields: name, email, subject, and message are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Save contact submission to Firestore
    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      subject: subject.trim(),
      message: message.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "new", // new, read, replied
    };

    const contactRef = await db.collection("contact_submissions").add(contactData);

    // Send email notification
    try {
      await sendContactFormEmail({
        ...contactData,
        id: contactRef.id,
      });
    } catch (emailError) {
      console.error("Error sending contact form email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    res.json({ 
      success: true, 
      message: "Thank you for contacting us! We'll get back to you soon.",
      id: contactRef.id 
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    res.status(500).json({ 
      error: "Failed to submit contact form", 
      details: error.message 
    });
  }
});

// ========== ADMIN ROUTES ==========
// All admin routes require authentication and ADMIN role
router.use("/submissions", verifyFirebaseToken);
router.use("/submissions", requireRole("ADMIN"));

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return timestamp;
}

// Get all contact submissions (ADMIN only)
router.get("/submissions", async (req, res) => {
  try {
    const submissionsSnapshot = await db
      .collection("contact_submissions")
      .orderBy("createdAt", "desc")
      .get();

    const submissions = submissionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    });

    res.json({ submissions });
  } catch (error) {
    console.error("Error fetching contact submissions:", error);
    res.status(500).json({
      error: "Failed to fetch contact submissions",
      details: error.message,
    });
  }
});

// Get single contact submission (ADMIN only)
router.get("/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const submissionDoc = await db.collection("contact_submissions").doc(id).get();

    if (!submissionDoc.exists) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const data = submissionDoc.data();
    res.json({
      id: submissionDoc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    });
  } catch (error) {
    console.error("Error fetching contact submission:", error);
    res.status(500).json({
      error: "Failed to fetch contact submission",
      details: error.message,
    });
  }
});

// Update contact submission status (ADMIN only)
router.patch("/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["new", "read", "replied"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be 'new', 'read', or 'replied'",
      });
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("contact_submissions").doc(id).update(updateData);

    res.json({ ok: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating contact submission:", error);
    res.status(500).json({
      error: "Failed to update contact submission",
      details: error.message,
    });
  }
});

// Delete contact submission (ADMIN only)
router.delete("/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const submissionDoc = await db.collection("contact_submissions").doc(id).get();

    if (!submissionDoc.exists) {
      return res.status(404).json({ error: "Submission not found" });
    }

    await db.collection("contact_submissions").doc(id).delete();

    res.json({ ok: true, message: "Submission deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact submission:", error);
    res.status(500).json({
      error: "Failed to delete contact submission",
      details: error.message,
    });
  }
});

export default router;

