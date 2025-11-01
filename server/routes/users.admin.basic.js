import { Router } from "express";
import { adminAuth, db } from "../lib/firebaseAdmin.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const list = await adminAuth.listUsers(500);
    res.json({ users: list.users });
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

export default router;