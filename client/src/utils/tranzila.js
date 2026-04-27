/**
 * Extract a per-transaction unique identifier from Tranzila response params.
 *
 * IMPORTANT: TranzilaTK is a CARD TOKEN, not a transaction ID. The same card
 * produces the same TranzilaTK across multiple transactions. Using it alone
 * as the idempotency key causes the server's idempotency lock to incorrectly
 * treat a SECOND legitimate payment with the same card as a duplicate of the
 * first - so the second order is never created and the order number does not
 * increase.
 *
 * Per-transaction unique fields, in priority order:
 *   - transactionId / RefNo / TransactionId  (explicit fields, if upstream
 *     code already extracted one - assumed already validated)
 *   - ConfirmationCode  (bank approval code from Shva, unique per transaction)
 *   - index             (Tranzila's per-transaction sequence number)
 *   - Tempref           (Tranzila's temporary reference)
 *
 * When TranzilaTK is present alongside any per-transaction field, we COMBINE
 * them. This makes the resulting key:
 *   - same card + same transaction        -> same key  (idempotent retries work)
 *   - same card + different transaction   -> different key (new order created)
 *   - different card                      -> different key (new order created)
 *
 * If ONLY TranzilaTK is available (no per-transaction field), we REFUSE to
 * return it and return null instead. The caller MUST treat this as "not
 * enough information yet - wait for a later signal that includes per-tx data
 * (typically the iframe redirect URL, which always carries ConfirmationCode,
 * index, and Tempref)". Returning the bare TranzilaTK was the original bug:
 * it created idempotency locks keyed on the card token, so every later order
 * paid with the same card was incorrectly reported as a duplicate.
 *
 * @param {URLSearchParams|Object|null|undefined} params
 *   Either a URLSearchParams instance or a plain object map of param names
 *   to values (e.g. the postMessage payload from Tranzila's iframe).
 * @returns {string|null} Per-transaction identifier, or null if none could be derived.
 */
export function extractTranzilaTransactionId(params) {
  if (!params) return null;

  const get = (key) => {
    if (typeof params.get === "function") return params.get(key);
    return params[key] != null ? String(params[key]) : null;
  };

  const explicit = get("transactionId") || get("RefNo") || get("TransactionId");
  // Only trust an explicit transactionId if it doesn't look like a bare
  // TranzilaTK (which would mean an upstream extractor fell back unsafely).
  if (explicit && !looksLikeBareTranzilaTk(explicit, get("TranzilaTK"))) {
    return explicit;
  }

  const confirmationCode = get("ConfirmationCode");
  const index = get("index");
  const tempref = get("Tempref");
  const tk = get("TranzilaTK");

  const perTxField = confirmationCode || index || tempref;

  if (tk && perTxField) {
    return `${tk}-${perTxField}`;
  }

  if (perTxField) return perTxField;

  if (tk) {
    console.warn(
      "[Tranzila] No per-transaction identifier (ConfirmationCode/index/Tempref) " +
        "was returned. Refusing to use TranzilaTK alone as a transaction ID, " +
        "since it is a CARD TOKEN that is identical for repeated payments with " +
        "the same card. Caller should wait for a richer signal (e.g. the iframe " +
        "redirect URL)."
    );
    return null;
  }

  return null;
}

/**
 * Returns true if `candidate` is the same string as `tk` (the bare
 * TranzilaTK), which means an upstream extractor returned a bare card token
 * masquerading as a transaction ID. We must not trust this.
 */
function looksLikeBareTranzilaTk(candidate, tk) {
  if (!candidate || !tk) return false;
  return candidate === tk;
}
