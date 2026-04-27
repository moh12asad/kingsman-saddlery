// server/utils/tranzila.js
//
// Server-side mirror of client/src/utils/tranzila.js.
//
// Responsibility: derive a per-transaction unique identifier (suitable for use
// as the idempotency lock key on the orders_idempotency collection) from the
// data the client sends with POST /api/orders/create.
//
// Why this exists on the server:
//   The client also computes the same value, but the server must NOT trust the
//   client's value blindly. If the client (due to a stale bundle, a code bug,
//   or an attacker) sends a bare TranzilaTK as the transactionId, the server
//   would create or hit an idempotency lock keyed on the card token. Since
//   TranzilaTK is the SAME for every payment made with the same card, this
//   would either:
//     - silently report every later legitimate payment as a duplicate of the
//       first one (the symptom we're fixing), or
//     - create one global per-card lock that can never be safely reused.
//
//   The Tranzila redirect URL ALWAYS carries per-transaction fields
//   (ConfirmationCode from Shva, plus Tranzila's own `index` and `Tempref`).
//   When the client forwards `tranzilaResponse.url`, we can re-derive the
//   correct, per-transaction-unique key here even if `body.transactionId` is
//   the wrong shape.

const PER_TX_FIELDS = ["ConfirmationCode", "index", "Tempref"];

/**
 * Pull a per-transaction unique identifier out of an arbitrary set of
 * Tranzila-provided fields.
 *
 * @param {URLSearchParams|object|null|undefined} params
 * @returns {string|null}
 */
export function extractTranzilaTransactionId(params) {
  if (!params) return null;

  const get = (key) => {
    if (typeof params.get === "function") {
      const v = params.get(key);
      return v != null ? String(v) : null;
    }
    return params[key] != null ? String(params[key]) : null;
  };

  const tk = get("TranzilaTK");

  // An "explicit" transactionId field is only safe if it is NOT just a
  // re-spelling of TranzilaTK.
  const explicit = get("transactionId") || get("RefNo") || get("TransactionId");
  if (explicit && explicit !== tk) return explicit;

  let perTxField = null;
  for (const k of PER_TX_FIELDS) {
    const v = get(k);
    if (v) {
      perTxField = v;
      break;
    }
  }

  if (tk && perTxField) return `${tk}-${perTxField}`;
  if (perTxField) return perTxField;

  // Refuse to fall back to TranzilaTK alone - it is a card token, not a
  // transaction id, and using it as an idempotency key is the bug we are
  // here to prevent.
  return null;
}

/**
 * Derive the canonical idempotency key for a POST /api/orders/create call.
 *
 * Order of preference:
 *   1) Extract from `body.tranzilaResponse.url` - this is the URL Tranzila
 *      redirected the iframe to, and it always carries ConfirmationCode +
 *      index + Tempref. This is the most authoritative source.
 *   2) Extract from `body.tranzilaResponse` itself, treated as a flat field
 *      bag (postMessage payload from Tranzila or our own success page).
 *   3) Fall back to `body.transactionId` ONLY if it looks transaction-unique
 *      (i.e. it is not just the TranzilaTK from the response).
 *
 * @param {object} body POST /api/orders/create JSON body.
 * @returns {string|null} The derived id, or null if nothing trustworthy was found.
 */
export function deriveOrderIdempotencyKey(body) {
  if (!body || typeof body !== "object") return null;

  const { transactionId, tranzilaResponse } = body;

  // 1. Re-parse the redirect URL, if we have it. Most reliable.
  if (tranzilaResponse && typeof tranzilaResponse === "object" && tranzilaResponse.url) {
    try {
      const url = new URL(tranzilaResponse.url);
      const fromUrl = extractTranzilaTransactionId(url.searchParams);
      if (fromUrl) return fromUrl;
    } catch {
      // Bad URL - fall through to next strategies.
    }
  }

  // 2. Treat the postMessage payload itself as a flat field bag.
  if (tranzilaResponse && typeof tranzilaResponse === "object") {
    const fromBag = extractTranzilaTransactionId(tranzilaResponse);
    if (fromBag) return fromBag;
  }

  // 3. Final fallback: trust the client's transactionId, but ONLY if it is
  // not obviously a bare TranzilaTK. We can detect that by comparing it
  // to the TK we see in the response, when we have one.
  if (transactionId) {
    const tkInResponse =
      tranzilaResponse && typeof tranzilaResponse === "object"
        ? tranzilaResponse.TranzilaTK
        : null;
    if (tkInResponse && transactionId === tkInResponse) {
      // Client sent the bare card token. Refuse.
      return null;
    }
    return String(transactionId);
  }

  return null;
}
