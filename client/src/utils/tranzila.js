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
 *     code already extracted one)
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
  if (explicit) return explicit;

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
        "was returned. Falling back to TranzilaTK alone, which is a CARD TOKEN " +
        "and is identical for repeated payments with the same card. The server " +
        "idempotency lock may incorrectly block legitimate subsequent orders."
    );
    return tk;
  }

  return null;
}
