// ESM-safe, singleton Firebase Admin init
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const hasEnv =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

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
    return {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    };
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

const app = getApps().length ? getApps()[0] : initializeApp(buildConfig());

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
