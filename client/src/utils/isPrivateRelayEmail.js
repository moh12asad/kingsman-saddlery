/**
 * Returns true if the email is Apple's private relay address (Hide My Email).
 * We do not accept these as valid contact emails for orders and support.
 * @param {string | null | undefined} email
 * @returns {boolean}
 */
export function isPrivateRelayEmail(email) {
  if (email == null || typeof email !== "string") return true;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return true;
  return normalized.endsWith("@privaterelay.appleid.com") || normalized.includes("privaterelay.appleid.com");
}
