// src/utils/checkProfileComplete.js
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Checks if the user's profile is complete (has name, phone, and address)
 * @param {Object} user - Firebase Auth user object
 * @returns {Promise<boolean>} - True if profile is complete, false otherwise
 */
export async function checkProfileComplete(user, retries = 3) {
  if (!user) {
    console.log("checkProfileComplete: No user provided");
    return false;
  }

  if (!API) {
    console.error("checkProfileComplete: API_BASE_URL is not set!");
    return false;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`checkProfileComplete: Attempt ${attempt}/${retries} for user:`, user.email);
      const token = await user.getIdToken(true); // Force refresh token
      
      const apiUrl = `${API}/api/users/me`;
      console.log("checkProfileComplete: Fetching user profile from API:", apiUrl);
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error("checkProfileComplete: API request failed:", res.status, res.statusText);
        if (attempt < retries && res.status === 404) {
          // User document might not be created yet, wait and retry
          console.log("checkProfileComplete: User document not found, retrying in 500ms...");
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        const errorText = await res.text().catch(() => "");
        console.error("checkProfileComplete: Error response:", errorText);
        return false;
      }

      const data = await res.json();
      console.log("checkProfileComplete: User data received:", data);
      
      // Check if all required fields are present and not empty
      const hasName = data.displayName && data.displayName.trim() !== "";
      const hasPhone = data.phone && data.phone.trim() !== "";
      const hasAddress = data.address && 
        data.address.street && data.address.street.trim() !== "" &&
        data.address.city && data.address.city.trim() !== "" &&
        data.address.zipCode && data.address.zipCode.trim() !== "" &&
        data.address.country && data.address.country.trim() !== "";

      console.log("checkProfileComplete: Validation results:", {
        hasName,
        hasPhone,
        hasAddress,
        name: data.displayName,
        phone: data.phone,
        address: data.address
      });

      const isComplete = hasName && hasPhone && hasAddress;
      console.log("checkProfileComplete: Profile complete:", isComplete);
      
      return isComplete;
    } catch (error) {
      console.error(`checkProfileComplete: Error on attempt ${attempt}:`, error);
      if (attempt < retries) {
        console.log(`checkProfileComplete: Retrying in 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return false;
    }
  }
  
  return false;
}

