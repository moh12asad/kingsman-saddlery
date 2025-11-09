import { Router } from "express";
import { adminAuth, db } from "../lib/firebaseAdmin.js";
import { requireRole } from "../middlewares/roles.js";
import admin from "firebase-admin";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const list = await adminAuth.listUsers(500);
    // Merge with Firestore user documents to get roles
    const usersWithRoles = await Promise.all(
      list.users.map(async (user) => {
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          metadata: user.metadata,
          ...userData, // Include role, active, name, phone from Firestore
        };
      })
    );
    res.json({ users: usersWithRoles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const snap = await db.collection("stats").doc("global").get();
    res.json({ stats: snap.exists ? snap.data() : {} });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Update user (ADMIN only)
router.patch("/:uid", requireRole("ADMIN"), async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, role, active } = req.body;

    // Update Firestore user document
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    await db.collection("users").doc(uid).set(updateData, { merge: true });

    // Optionally update Firebase Auth user if needed
    if (req.body.disabled !== undefined) {
      await adminAuth.updateUser(uid, { disabled: req.body.disabled });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user", details: error.message });
  }
});

export default router;