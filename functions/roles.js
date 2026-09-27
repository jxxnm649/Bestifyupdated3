/* ============================================================
   Bestify — Role system (server side, STEP 1)

   SOURCE OF TRUTH
   A staff member's role lives in their Firebase Auth CUSTOM CLAIM
   `role`. Only Cloud Functions (Admin SDK) can set it — a browser
   can never write it. It is mirrored to users/{uid}.role purely
   for display, and firestore.rules blocks clients from editing it.

   ROLES (highest first)
     superAdmin  — everything, incl. creating/removing admins
     admin       — runs the store (orders, products, vendors, money)
     support     — customer care (panel comes in STEP 5)
     technician  — repairs      (panel comes in STEP 6)
     (none)      — normal customer

   Vendors are NOT a claim role: a vendor is a customer whose
   vendors/{uid}.status is "Active" (unchanged from before).

   LEGACY
   Before STEP 1, admins were marked with users/{uid}.isAdmin == true.
   That still counts as "admin" so nobody is locked out while
   accounts are migrated to claims (see syncMyRole in index.js).
   ============================================================ */

const { HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const ROLES = ["superAdmin", "admin", "support", "technician"];
const ADMIN_ROLES = ["superAdmin", "admin"];
const STAFF_ROLES = ROLES;

function claimRole(request) {
  const token = request.auth?.token || {};
  if (ROLES.includes(token.role)) return token.role;
  // Some accounts were given a bare { admin: true } claim by hand
  // before STEP 1 — treat that as "admin".
  if (token.admin === true) return "admin";
  return null;
}

/**
 * The caller's effective role: the custom claim if present, else
 * "admin" for a legacy isAdmin account, else null (customer).
 */
async function getCallerRole(request) {

  if (!request.auth) return null;

  const fromClaim = claimRole(request);
  if (fromClaim) return fromClaim;

  const snap = await admin.firestore().doc(`users/${request.auth.uid}`).get();
  if (snap.exists && snap.data().isAdmin === true) return "admin";

  return null;
}

/** Throws unless the caller holds one of `allowedRoles`. Returns the role. */
async function assertRole(request, allowedRoles, message) {

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const role = await getCallerRole(request);

  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError("permission-denied", message || "You don't have permission to do this.");
  }

  return role;
}

module.exports = {
  ROLES,
  ADMIN_ROLES,
  STAFF_ROLES,
  claimRole,
  getCallerRole,
  assertRole
};
