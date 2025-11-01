// server/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import * as dotenv from "dotenv";
import admin from "firebase-admin";

import usersAdmin from "./routes/users.admin.basic.js";
import productsAdmin from "./routes/products.admin.basic.js";
import { verifyFirebaseToken } from "./middlewares/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => res.json({ ok: true, service: "kingsman API" })); // 200 instead of 404


// ---------- Firebase Admin init ----------
/**
 * Preferred: set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON file path.
 * Alternative: set FIREBASE_SERVICE_ACCOUNT_JSON to the raw JSON string.
 */
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Will read GOOGLE_APPLICATION_CREDENTIALS if provided (file path).
    admin.initializeApp();
  }
}

// ---------- Middleware ----------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ---------- Health ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- Routes ----------
app.use("/api/users", verifyFirebaseToken, usersAdmin);
// Public GET is allowed for listing products; POST/PATCH protected inside the router:
app.use("/api/products", productsAdmin);

// ---------- Fallback ----------
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;
