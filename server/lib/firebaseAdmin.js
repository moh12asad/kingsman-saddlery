// ESM-safe, singleton Firebase Admin init
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const hasEnv =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

const app = getApps().length
  ? getApps()[0]
  : initializeApp(
      hasEnv
        ? {
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
          }
        : { credential: applicationDefault() }
    );

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
