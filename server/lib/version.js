// server/lib/version.js
//
// Single source of truth for the deployed-build fingerprint that operators use
// to confirm what's actually running in production.
//
// The fingerprint is exposed in two places, and they MUST agree:
//   1. GET /            -> JSON body field `fingerprint`           (server/server.js)
//   2. POST /api/orders/create -> response header X-Orders-Create-Version
//                                                                  (server/routes/orders.admin.js)
//
// Why a shared constant:
//   In an earlier iteration these two strings drifted (server.js stayed at
//   "v2-orderNumber-..." while orders.admin.js advanced to "v3-tranzilaKey-...").
//   That defeats the whole point of a fingerprint - operators can no longer tell
//   "v2 server, v3 orders route" (which is impossible from one repo) from "stale
//   replica serving traffic" (which is what the fingerprint is meant to detect).
//   Importing the same constant from both endpoints makes that drift impossible.
//
// Bumping rules:
//   Bump this version any time a deployed code change has user-visible behavioral
//   semantics that an operator might need to confirm post-deploy. Use the format
//   `vN-shortSlug-YYYY-MM-DD`. Bump N when behavior changes; the slug describes
//   the most prominent change in the bundle; the date is the bump date.

export const DEPLOY_FINGERPRINT = "v3-tranzilaKey-2026-04-27";
