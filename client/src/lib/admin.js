import { auth } from "./firebase";


// adjust if firebase.js is in src/

export async function deleteUser(id) {
/*    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    const token = await user.getIdToken();
    const API = import.meta.env.VITE_API_BASE_URL || "";
    console.log("API is: ",API);

    const res = await fetch(`${API}/api/admin/owners/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to delete owner ${id}`);
    }

    return res.json();*/
}
