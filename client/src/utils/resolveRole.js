// src/utils/resolveRole.js
const API = import.meta.env.VITE_API_BASE_URL || "";

export async function resolveRole(user) {
    if (!user) return null;

    try {
        // 1) Admin by email (simple check - no API call needed)
        if (user.email === "moh12asad10@gmail.com") return "admin";

        // 2) Get user data from backend API (which includes role)
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("resolveRole: Failed to fetch user data:", res.status);
            // Fallback to "user" if API call fails
            return "user";
        }

        const userData = await res.json();
        const role = userData.role;

        console.log("resolveRole: User role from backend:", role);

        // Map backend roles to frontend roles
        if (role === "ADMIN") {
            console.log("resolveRole: User is ADMIN");
            return "admin";
        }
        
        // Default to regular user (CUSTOMER role)
        console.log("resolveRole: User is regular user (CUSTOMER)");
        return "user";
    } catch (error) {
        console.error("resolveRole: Error resolving role:", error);
        // Fallback to "user" on error
        return "user";
    }
}
