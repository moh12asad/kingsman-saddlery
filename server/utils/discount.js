// server/utils/discount.js
import { db } from "../lib/firebaseAdmin.js";

/**
 * Discount configuration constants
 */
export const NEW_USER_DISCOUNT = {
  PERCENTAGE: 5, // 5% discount
  DURATION_MONTHS: 3, // Valid for first 3 months
};

/**
 * Checks if a user is eligible for the new user discount (5% for first 3 months)
 * This is a server-side security check - never trust client-side calculations
 * 
 * @param {string} userId - The user's UID
 * @returns {Promise<{eligible: boolean, discountPercentage: number, reason?: string}>}
 */
export async function checkNewUserDiscountEligibility(userId) {
  try {
    if (!userId || typeof userId !== "string") {
      return {
        eligible: false,
        discountPercentage: 0,
        reason: "Invalid user ID"
      };
    }

    // Fetch user document from Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return {
        eligible: false,
        discountPercentage: 0,
        reason: "User document not found"
      };
    }

    const userData = userDoc.data();
    const createdAt = userData.createdAt;

    // If no createdAt timestamp, user is not eligible
    if (!createdAt) {
      return {
        eligible: false,
        discountPercentage: 0,
        reason: "User creation date not found"
      };
    }

    // Convert Firestore timestamp to Date
    const accountCreationDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();

    // Calculate the difference in milliseconds
    const diffMs = now.getTime() - accountCreationDate.getTime();
    
    // Calculate months difference (approximate - using average month length)
    // More accurate than simple division by 30 days
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month

    // Check if user is within first 3 months
    const isWithinFirstThreeMonths = diffMonths < NEW_USER_DISCOUNT.DURATION_MONTHS;

    if (isWithinFirstThreeMonths) {
      return {
        eligible: true,
        discountPercentage: NEW_USER_DISCOUNT.PERCENTAGE,
        accountCreationDate: accountCreationDate.toISOString(),
        monthsSinceCreation: diffMonths
      };
    }

    return {
      eligible: false,
      discountPercentage: 0,
      reason: `Account created more than ${NEW_USER_DISCOUNT.DURATION_MONTHS} months ago`,
      accountCreationDate: accountCreationDate.toISOString(),
      monthsSinceCreation: diffMonths
    };
  } catch (error) {
    console.error("Error checking new user discount eligibility:", error);
    // On error, default to not eligible for security
    return {
      eligible: false,
      discountPercentage: 0,
      reason: "Error checking eligibility"
    };
  }
}

/**
 * Calculates the discount amount for a given subtotal
 * 
 * @param {number} subtotal - The order subtotal before discount
 * @param {number} discountPercentage - The discount percentage (e.g., 5 for 5%)
 * @returns {number} - The discount amount
 */
export function calculateDiscountAmount(subtotal, discountPercentage) {
  // SECURITY: Validate inputs
  if (typeof subtotal !== "number" || subtotal < 0 || !isFinite(subtotal)) {
    return 0;
  }
  if (typeof discountPercentage !== "number" || discountPercentage < 0 || discountPercentage > 100 || !isFinite(discountPercentage)) {
    return 0;
  }
  
  // Calculate discount and ensure it doesn't exceed subtotal
  const discount = (subtotal * discountPercentage / 100);
  
  // Round to 2 decimal places to avoid floating point issues
  const roundedDiscount = Math.round(discount * 100) / 100;
  
  // SECURITY: Ensure discount never exceeds subtotal
  return Math.min(roundedDiscount, subtotal);
}

