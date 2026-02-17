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
    
    let userData = userDoc.exists ? userDoc.data() : {};
    let needsRefetch = false;
    
    // If user document doesn't exist, create it with CUSTOMER role
    if (!userDoc.exists) {
      console.log("GET /api/users/me - User document not found, creating with CUSTOMER role");
      await db.collection("users").doc(uid).set({
        role: "CUSTOMER",
        active: true,
        email: authUser.email || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      needsRefetch = true;
    }
    
    // Ensure role is set to CUSTOMER if not already set (for existing users without roles)
    if (!userData.role || userData.role === "") {
      await db.collection("users").doc(uid).set({
        role: "CUSTOMER",
        active: userData.active !== undefined ? userData.active : true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      needsRefetch = true;
    }
    
    // Refetch the document if we just created or updated it to get resolved timestamps
    if (needsRefetch) {
      const refreshedDoc = await db.collection("users").doc(uid).get();
      userData = refreshedDoc.exists ? refreshedDoc.data() : {};
    }
    
    // Convert Firestore timestamps to ISO strings
    let createdAt = null;
    let updatedAt = null;
    
    if (userData.createdAt) {
      if (userData.createdAt.toDate) {
        // Firestore Timestamp object
        createdAt = userData.createdAt.toDate().toISOString();
      } else if (userData.createdAt._seconds) {
        // Serialized Firestore timestamp (from JSON)
        createdAt = new Date(userData.createdAt._seconds * 1000).toISOString();
      } else if (userData.createdAt.seconds) {
        // Firestore timestamp with seconds property
        createdAt = new Date(userData.createdAt.seconds * 1000).toISOString();
      } else if (typeof userData.createdAt === 'string') {
        createdAt = userData.createdAt;
      }
    }
    
    if (userData.updatedAt) {
      if (userData.updatedAt.toDate) {
        updatedAt = userData.updatedAt.toDate().toISOString();
      } else if (userData.updatedAt._seconds) {
        updatedAt = new Date(userData.updatedAt._seconds * 1000).toISOString();
      } else if (userData.updatedAt.seconds) {
        updatedAt = new Date(userData.updatedAt.seconds * 1000).toISOString();
      } else if (typeof userData.updatedAt === 'string') {
        updatedAt = userData.updatedAt;
      }
    }

    const response = {
      uid: authUser.uid,
      email: authUser.email,
      realEmail: userData.realEmail || null, // Real email for users with Apple Private Relay
      displayName: authUser.displayName || userData.displayName || "",
      phone: userData.phone || authUser.phoneNumber || "",
      address: userData.address || {
        street: "",
        city: "",
        zipCode: "",
        country: ""
      },
      ...userData,
      createdAt: createdAt || null,
      updatedAt: updatedAt || null
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
        
        // Convert Firestore timestamps to ISO strings
        let createdAt = null;
        let updatedAt = null;
        
        if (userData.createdAt) {
          if (userData.createdAt.toDate) {
            // Firestore Timestamp object
            createdAt = userData.createdAt.toDate().toISOString();
          } else if (userData.createdAt._seconds) {
            // Serialized Firestore timestamp (from JSON)
            createdAt = new Date(userData.createdAt._seconds * 1000).toISOString();
          } else if (userData.createdAt.seconds) {
            // Firestore timestamp with seconds property
            createdAt = new Date(userData.createdAt.seconds * 1000).toISOString();
          } else if (typeof userData.createdAt === 'string') {
            createdAt = userData.createdAt;
          }
        }
        
        if (userData.updatedAt) {
          if (userData.updatedAt.toDate) {
            updatedAt = userData.updatedAt.toDate().toISOString();
          } else if (userData.updatedAt._seconds) {
            updatedAt = new Date(userData.updatedAt._seconds * 1000).toISOString();
          } else if (userData.updatedAt.seconds) {
            updatedAt = new Date(userData.updatedAt.seconds * 1000).toISOString();
          } else if (typeof userData.updatedAt === 'string') {
            updatedAt = userData.updatedAt;
          }
        }
        
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          metadata: user.metadata,
          ...userData, // Include role, active, name, phone from Firestore
          createdAt: createdAt || null,
          updatedAt: updatedAt || null
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
    const { displayName, email, phone, address, emailConsent, smsConsent, realEmail } = req.body;

    // Get existing user document to check if role is already set
    const userDoc = await db.collection("users").doc(uid).get();
    const existingData = userDoc.exists ? userDoc.data() : {};

    // Update Firestore user document
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (emailConsent !== undefined) updateData.emailConsent = emailConsent;
    if (smsConsent !== undefined) updateData.smsConsent = smsConsent;
    
    // Store real email for users with Apple Private Relay emails
    if (realEmail !== undefined) {
      updateData.realEmail = realEmail.trim().toLowerCase();
    }

    // Automatically assign CUSTOMER role if user doesn't have a role yet
    // Only assign CUSTOMER if they don't already have ADMIN, STAFF, or other roles
    if (!existingData.role || existingData.role === "") {
      updateData.role = "CUSTOMER";
      updateData.active = existingData.active !== undefined ? existingData.active : true;
    }

    // Set email if not already set
    if (!existingData.email && req.user.email) {
      updateData.email = req.user.email;
    }

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