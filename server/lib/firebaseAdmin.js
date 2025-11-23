// ESM-safe, singleton Firebase Admin init
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

// Check for environment variables (Railway will set these)
const hasEnv =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

// Debug logging
if (!hasEnv) {
  console.log("⚠️  Firebase environment variables check:");
  console.log("  FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "✓ Set" : "✗ Missing");
  console.log("  FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "✓ Set" : "✗ Missing");
  console.log("  FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "✓ Set" : "✗ Missing");
  console.log("  → Will try to load from file instead...");
} else {
  console.log("✓ Firebase environment variables detected - using env vars");
}

// Get the directory of this file (works in both CommonJS and ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible paths for the service account file
const possiblePaths = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS) : null,
  resolve(__dirname, "firebase-service-account.json"), // Same directory as this file
  resolve(process.cwd(), "firebase-service-account.json"), // Current working directory
  resolve(process.cwd(), "server/firebase-service-account.json"), // server subdirectory from root
].filter(Boolean);

const defaultServiceAccountPath = possiblePaths.find(path => existsSync(path)) || possiblePaths[0];

function buildConfig() {
  if (hasEnv) {
    console.log("✓ Using Firebase credentials from environment variables");
    console.log("  Project ID:", process.env.FIREBASE_PROJECT_ID);
    console.log("  Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
    try {
      // Handle private key newlines - Railway might store them differently
      let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
      
      // Check if it's base64 encoded (Railway sometimes encodes secrets)
      if (!privateKey.includes("BEGIN") && !privateKey.includes("PRIVATE")) {
        try {
          const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
          if (decoded.includes("BEGIN")) {
            console.log("  Detected base64-encoded private key, decoding...");
            privateKey = decoded;
          }
        } catch (e) {
          // Not base64, continue with normal processing
        }
      }
      
      // Replace escaped newlines with actual newlines
      // Handle multiple formats: \\n (double-escaped), \n (single-escaped), or actual newlines
      if (privateKey.includes("\\n")) {
        // Replace \\n with actual newlines
        privateKey = privateKey.replace(/\\n/g, "\n");
      } else if (!privateKey.includes("\n") && privateKey.includes("BEGIN")) {
        // If it has BEGIN but no newlines, it might be all on one line
        // This shouldn't happen, but handle it
        console.warn("⚠️  Private key appears to be on a single line");
      }
      
      // Ensure the key has proper BEGIN/END markers
      if (!privateKey.includes("BEGIN PRIVATE KEY") && !privateKey.includes("BEGIN RSA PRIVATE KEY")) {
        console.error("❌ Private key missing BEGIN marker");
        throw new Error("Invalid private key format - missing BEGIN marker");
      }
      
      if (!privateKey.includes("END PRIVATE KEY") && !privateKey.includes("END RSA PRIVATE KEY")) {
        console.error("❌ Private key missing END marker");
        throw new Error("Invalid private key format - missing END marker");
      }
      
      // Log first/last few chars for debugging (without exposing the full key)
      console.log("  Private Key format check:");
      console.log("    Has BEGIN:", privateKey.includes("BEGIN"));
      console.log("    Has END:", privateKey.includes("END"));
      console.log("    Has newlines:", privateKey.includes("\n"));
      console.log("    Length:", privateKey.length);
      
      const config = {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      };
      
      // Explicitly set projectId to ensure it matches client tokens
      if (process.env.FIREBASE_PROJECT_ID) {
        config.projectId = process.env.FIREBASE_PROJECT_ID;
      }
      
      return config;
    } catch (err) {
      console.error("❌ Failed to create Firebase credential from env vars:", err.message);
      console.error("   Error details:", err);
      throw err;
    }
  }

  if (existsSync(defaultServiceAccountPath)) {
    try {
      const raw = readFileSync(defaultServiceAccountPath, "utf8");
      const serviceAccount = JSON.parse(raw);
      
      // Validate required fields
      if (!serviceAccount.project_id) {
        throw new Error("serviceAccount missing project_id");
      }
      if (!serviceAccount.private_key) {
        throw new Error("serviceAccount missing private_key");
      }
      if (!serviceAccount.client_email) {
        throw new Error("serviceAccount missing client_email");
      }
      
      // Ensure private key has proper newlines
      if (serviceAccount.private_key && !serviceAccount.private_key.includes("\n")) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      }
      
      console.log(`✓ Loaded Firebase service account for project: ${serviceAccount.project_id}`);
      console.log(`  Service account email: ${serviceAccount.client_email}`);
      console.log(`  Key ID: ${serviceAccount.private_key_id}`);
      console.log(`\n⚠️  If you get authentication errors:`);
      console.log(`   1. "Invalid JWT Signature" → Generate a new service account key:`);
      console.log(`      https://console.firebase.google.com/project/${serviceAccount.project_id}/settings/serviceaccounts/adminsdk`);
      console.log(`   2. "UNAUTHENTICATED" → Grant IAM permissions:`);
      console.log(`      Google Cloud Console → IAM & Admin → IAM → Find: ${serviceAccount.client_email}`);
      console.log(`      Add role: "Firebase Admin SDK Administrator Service Agent"`);
      
      return { credential: cert(serviceAccount) };
    } catch (err) {
      console.error("❌ Failed to load firebase-service-account.json:", err.message);
      console.error("   Path:", defaultServiceAccountPath);
      throw err;
    }
  } else {
    console.warn(`⚠️  Service account file not found at: ${defaultServiceAccountPath}`);
    console.warn(`   Tried paths:`, possiblePaths);
  }

  try {
    return { credential: applicationDefault() };
  } catch (err) {
    throw new Error(
      `Firebase Admin credentials not configured. Provide FIREBASE_* env vars or place firebase-service-account.json in the server directory.\n` +
      `Expected path: ${defaultServiceAccountPath}`
    );
  }
}

const config = buildConfig();

// Ensure projectId is explicitly set
if (process.env.FIREBASE_PROJECT_ID && !config.projectId) {
  config.projectId = process.env.FIREBASE_PROJECT_ID;
}

const app = getApps().length ? getApps()[0] : initializeApp(config);

// Log the project ID being used
console.log("✓ Firebase Admin initialized with project ID:", app.options.projectId || config.projectId || process.env.FIREBASE_PROJECT_ID || "unknown");

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
