import { Router } from "express";
import { adminAuth, db } from "../lib/firebaseAdmin.js";
import { requireRole } from "../middlewares/roles.js";
import admin from "firebase-admin";

const router = Router();

// Get current user's profile - MUST be first to avoid conflicts with /:uid
router.get("/me", async (req, res) => {
  try {
    console.log("GET /api/users/me - Request received", { uid: req.user?.uid, email: req.user?.email });
    
    if (!req.user || !req.user.uid) {
      console.log("GET /api/users/me - Unauthorized: no user in request");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { uid } = req.user;
    console.log("GET /api/users/me - Fetching user data for:", uid);
    const userDoc = await db.collection("users").doc(uid).get();
    const authUser = await adminAuth.getUser(uid);
    
    const userData = userDoc.exists ? userDoc.data() : {};
    const response = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || userData.displayName || "",
      phone: userData.phone || authUser.phoneNumber || "",
      address: userData.address || {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: ""
      },
      ...userData
    };
    console.log("GET /api/users/me - Success for:", uid);
    res.json(response);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Failed to fetch profile", details: error.message });
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

// Update current user's profile
router.put("/me", async (req, res) => {
  try {
    const { uid } = req.user;
    const { displayName, email, phone, address } = req.body;

    // Update Firestore user document
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    await db.collection("users").doc(uid).set(updateData, { merge: true });

    // Update Firebase Auth if displayName changed
    if (displayName !== undefined) {
      await adminAuth.updateUser(uid, { displayName });
    }

    res.json({ ok: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update profile", details: error.message });
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