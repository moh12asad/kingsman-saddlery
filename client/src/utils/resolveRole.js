// src/utils/resolveRole.js
import { db } from "../lib/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";

export async function resolveRole(user) {
    // Example strategies — customize to your app:
    // 1) Admin by email (simple)
    if (user.email === "moh12asad10@gmail.com") return "admin";

    // 2) Owner if they exist in owners (prefer doc by uid; fallback email)
    let ownerSnap = await getDoc(doc(db, "owners", user.uid));
    if (ownerSnap.exists()){
        return "owner";
    }

    const q = query(collection(db, "owners"), where("email", "==", user.email));
    const byEmail = await getDocs(q);
    if (!byEmail.empty) return "owner";

    // 3) Else regular user
    return "user";
}
