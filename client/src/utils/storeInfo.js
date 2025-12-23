/**
 * Store Information Utility
 * 
 * This utility provides functions to fetch and access store information
 * including working hours, contact details, and location.
 * 
 * Store information is managed by admins in the Settings page.
 */

const API = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Fetches store information from the API
 * @returns {Promise<Object>} Store information object
 */
export async function getStoreInfo() {
  try {
    const response = await fetch(`${API}/api/settings`);
    const data = await response.json();
    
    if (response.ok && data.settings) {
      return data.settings;
    }
    
    // Return default values if no settings exist
    return getDefaultStoreInfo();
  } catch (error) {
    console.error("Error fetching store info:", error);
    return getDefaultStoreInfo();
  }
}

/**
 * Returns default store information structure
 * @returns {Object} Default store information
 */
export function getDefaultStoreInfo() {
  return {
    whatsappNumber: "",
    storeName: "",
    storeEmail: "",
    storePhone: "",
    location: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    workingHours: {
      monday: { open: "", close: "", closed: false },
      tuesday: { open: "", close: "", closed: false },
      wednesday: { open: "", close: "", closed: false },
      thursday: { open: "", close: "", closed: false },
      friday: { open: "", close: "", closed: false },
      saturday: { open: "", close: "", closed: false },
      sunday: { open: "", close: "", closed: false },
    },
  };
}

/**
 * Formats working hours for display
 * @param {Object} workingHours - Working hours object
 * @returns {Array} Array of formatted day-hour strings
 */
export function formatWorkingHours(workingHours) {
  if (!workingHours) return [];
  
  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];
  
  return days.map(({ key, label }) => {
    const dayHours = workingHours[key];
    if (!dayHours || dayHours.closed) {
      return `${label}: Closed`;
    }
    if (dayHours.open && dayHours.close) {
      return `${label}: ${dayHours.open} - ${dayHours.close}`;
    }
    return `${label}: Not set`;
  });
}

/**
 * Formats full address from location object
 * @param {Object} location - Location object
 * @returns {string} Formatted address string
 */
export function formatAddress(location) {
  if (!location) return "";
  
  const parts = [
    location.address,
    location.city,
    location.state,
    location.zipCode,
    location.country,
  ].filter(Boolean);
  
  return parts.join(", ");
}

/**
 * Gets WhatsApp link for the store
 * @param {string} whatsappNumber - WhatsApp number with country code
 * @param {string} message - Optional message to pre-fill
 * @returns {string} WhatsApp URL
 */
export function getWhatsAppLink(whatsappNumber, message = "") {
  if (!whatsappNumber) return "#";
  
  const cleanNumber = whatsappNumber.replace(/[^\d+]/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}${message ? `?text=${encodedMessage}` : ""}`;
}

