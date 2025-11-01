import { Router } from "express";

import admin from "firebase-admin";

import admin from "../middlewares/auth.js";

const router = Router();

// Example secure endpoint
router.get("/hello", (req, res) => {
  const email = req.user?.email || "unknown";
  res.json({ message: `Hello, ${email}! You have accessed a protected admin API.` });
});

/**
 * DELETE /api/admin/owners/:id
 * Deletes the Firestore owner doc and the linked Firebase Auth user.
 */
router.delete("/owners/:id", async (req, res) => {
    const { id } = req.params;
    const db = admin.firestore();

    try {
        const snap = await db.collection("owners").doc(id).get();
        if (!snap.exists) {
            return res.status(404).json({ error: "Owner not found" });
        }

        const data = snap.data();
        const { uid, email } = data || {};

        // 1) Delete the Auth user if we can find one
        try {
            if (uid) {
                await admin.auth().deleteUser(uid);
            } else if (email) {
                // If uid wasn't stored, try by email
                const user = await admin.auth().getUserByEmail(email);
                await admin.auth().deleteUser(user.uid);
            }
        } catch (authErr) {
            // If the auth user doesn't exist anymore, that's fine—just log and continue
            const ignored = ["auth/user-not-found", "auth/invalid-uid"];
            if (!ignored.some(k => String(authErr.code || authErr.message).includes(k))) {
                console.warn("Auth deletion warning:", authErr.code || authErr.message);
            }
        }

        // 2) Delete the Firestore doc
        await db.collection("owners").doc(id).delete();

        return res.json({ ok: true, deletedOwnerId: id });
    } catch (err) {
        console.error("delete owner error:", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
