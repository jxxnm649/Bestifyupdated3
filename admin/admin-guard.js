/* ============================================================
   Bestify Admin — shared access check (STEP 1 role system)

   ONE rule for every admin page (it used to be two different
   checks: the dashboard read a custom claim, the other pages read
   users/{uid}.isAdmin):

     access = role claim is "superAdmin" or "admin"
              (legacy: users/{uid}.isAdmin == true, or claims.admin)

   A legacy admin is quietly moved onto a real role claim the first
   time they open any admin page (syncMyRole Cloud Function). If that
   call fails, legacy access still works — nobody gets locked out.

   This only decides what the PAGE shows. Real protection is done by
   firestore.rules and the Cloud Functions, which check the same role.
   ============================================================ */

import { db } from "../firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-functions.js";

export const STAFF_ROLES = ["superAdmin", "admin", "support", "technician"];
export const ADMIN_ROLES = ["superAdmin", "admin"];

function roleFromClaims(claims) {
  if (STAFF_ROLES.includes(claims?.role)) return claims.role;
  if (claims?.admin === true) return "admin";
  return null;
}

const SYNC_FLAG = "bf_role_synced";

async function trySyncRole(user) {
  // At most once per browser session — role changes are rare.
  try {
    if (sessionStorage.getItem(SYNC_FLAG) === user.uid) return null;
    sessionStorage.setItem(SYNC_FLAG, user.uid);
  } catch (error) {
    // sessionStorage unavailable — just try once.
  }
  try {
    const syncMyRole = httpsCallable(getFunctions(), "syncMyRole");
    const { data } = await syncMyRole();
    if (data?.changed) {
      const refreshed = await user.getIdTokenResult(true);
      return refreshed.claims || {};
    }
  } catch (error) {
    // Not fatal — legacy access below still applies.
    console.warn("syncMyRole failed (continuing with legacy check):", error);
  }
  return null;
}

/**
 * Resolves the signed-in user's staff role, or null for a customer.
 * Returns { role, claims }.
 */
export async function getStaffAccess(user) {

  if (!user) return { role: null, claims: {} };

  let claims = (await user.getIdTokenResult()).claims || {};

  // Migrates a legacy admin onto a real role claim, and upgrades the
  // owner (SUPER_ADMIN_EMAILS) to superAdmin. Skipped for superAdmins.
  if (claims.role !== "superAdmin") {
    const synced = await trySyncRole(user);
    if (synced) claims = synced;
  }

  let role = roleFromClaims(claims);

  // Still no role claim — fall back to the legacy isAdmin flag.
  if (!role) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().isAdmin === true && snap.data().blocked !== true) {
        role = "admin";
      }
    } catch (error) {
      console.error("Admin check error:", error);
    }
  }

  return { role, claims };
}

/** True when the user may open the admin panel (superAdmin/admin). */
export async function hasAdminAccess(user) {
  const { role } = await getStaffAccess(user);
  return ADMIN_ROLES.includes(role);
}
