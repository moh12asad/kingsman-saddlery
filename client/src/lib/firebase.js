import { initializeApp, deleteApp } from "firebase/app";
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

console.log("Firebase config:", firebaseConfig);

const app = initializeApp(firebaseConfig);
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