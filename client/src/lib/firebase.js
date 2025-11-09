import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; //for uploading images

// Vite exposes envs with import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
};

// Validate Firebase configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId', 'messagingSenderId', 'storageBucket'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field] || firebaseConfig[field] === 'undefined');

if (missingFields.length > 0) {
  const errorMsg = `❌ Missing Firebase configuration: ${missingFields.join(', ')}.\n\nPlease create a .env file in the client/ directory with:\n\nVITE_FIREBASE_API_KEY=your-api-key\nVITE_FIREBASE_AUTH_DOMAIN=kingsman-saddlery.firebaseapp.com\nVITE_FIREBASE_PROJECT_ID=kingsman-saddlery\nVITE_FIREBASE_APP_ID=your-app-id\nVITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id\nVITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery.appspot.com\n\nGet these values from Firebase Console → Project Settings → General → Your apps`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Log the config (without sensitive data)
console.log("✓ Firebase config loaded:");
console.log("  Project ID:", firebaseConfig.projectId);
console.log("  Auth Domain:", firebaseConfig.authDomain);
console.log("  Storage Bucket:", firebaseConfig.storageBucket);
console.log("  API Key (first 20 chars):", firebaseConfig.apiKey?.substring(0, 20) + "...");
console.log("  App ID:", firebaseConfig.appId);
console.log("  Messaging Sender ID:", firebaseConfig.messagingSenderId);

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("✓ Firebase app initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error.message);
  if (error.message.includes("already exists")) {
    // App already initialized, get the existing app
    const apps = getApps();
    app = apps[0];
    console.log("✓ Using existing Firebase app");
  } else {
    throw new Error(`Firebase initialization failed: ${error.message}. Please check your .env file and ensure the Firebase project exists.`);
  }
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); //for uploading images
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  await signOut(auth);
}

// Helper: get ID token (to call secure Node APIs)
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(/* forceRefresh */ true);
}

// Subscribe to auth changes
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getSecondaryAuth() {
    const name = `secondary-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, name);
    const secondaryAuth = getAuth(secondaryApp);
    return { secondaryApp, secondaryAuth,
        destroy: () => deleteApp(secondaryApp) };
}