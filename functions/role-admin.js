/* ============================================================
   Bestify — Role & account-status Cloud Functions (STEP 1)

   syncMyRole      — any signed-in user. Moves a legacy admin onto
                     the claim-based role system, and makes the
                     owner (SUPER_ADMIN_EMAILS) a superAdmin.
   setUserRole     — superAdmin only. Grants / changes / removes a
                     staff role. (UI for this comes in STEP 2.)
   setUserBlocked  — admin+. Blocks/unblocks an account for real:
                     disables Firebase Auth sign-in, signs them out
                     everywhere, and sets users/{uid}.blocked.

   SETUP — who is the Super Admin?
   Put the owner's login email(s) in functions/.env :

       SUPER_ADMIN_EMAILS=owner@example.com

   (comma-separate several). It is read at deploy time. The listed
   account becomes superAdmin the next time it opens the admin
   panel — only if that email is verified OR the account is already
   a legacy admin, so nobody can claim it by registering the email.
   ============================================================ */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const { ROLES, ADMIN_ROLES, assertRole } = require("./roles");

const SUPER_ADMIN_EMAILS = defineString("SUPER_ADMIN_EMAILS", { default: "" });

const db = admin.firestore();

function superAdminEmails() {
  return String(SUPER_ADMIN_EMAILS.value() || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

async function writeAudit(request, action, details) {
  try {
    await db.collection("auditLogs").add({
      action,
      module: "Roles",
      details,
      performedBy: request.auth?.token?.email || request.auth?.uid || "system",
      performedByUid: request.auth?.uid || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error("Audit write failed", error);
  }
}

/**
 * Sets (or clears, when role is null) the `role` claim, keeps any
 * other claims, and mirrors it onto the user's profile doc.
 */
async function applyRole(uid, role, actorUid) {

  const user = await admin.auth().getUser(uid);
  const claims = { ...(user.customClaims || {}) };

  if (role) claims.role = role;
  else delete claims.role;

  // The old dashboard looked for claims.admin — keep it consistent
  // with the new role so the two can never disagree.
  if (ADMIN_ROLES.includes(role)) claims.admin = true;
  else delete claims.admin;

  await admin.auth().setCustomUserClaims(uid, claims);

  await db.doc(`users/${uid}`).set({
    role: role || null,
    // Legacy flag kept in step with the role, so older admin screens
    // and firestore.rules' legacy fallback agree with the claim.
    isAdmin: ADMIN_ROLES.includes(role),
    roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    roleUpdatedBy: actorUid || "system"
  }, { merge: true });

}

async function countSuperAdmins() {
  const snap = await db.collection("users").where("role", "==", "superAdmin").get();
  return snap.size;
}


/* ============================================================
   syncMyRole
   ============================================================ */

exports.syncMyRole = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const uid = request.auth.uid;
  const email = String(request.auth.token?.email || "").toLowerCase();
  const emailVerified = request.auth.token?.email_verified === true;

  // Strictly the new `role` claim (not the legacy fallbacks), so a
  // legacy admin actually gets migrated onto a real role claim.
  const current = ROLES.includes(request.auth.token?.role) ? request.auth.token.role : null;
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  if (userData.blocked === true) {
    return { role: current, changed: false };
  }

  const isLegacyAdmin = userData.isAdmin === true || request.auth.token?.admin === true;
  const isOwnerEmail = email && superAdminEmails().includes(email);

  let target = current;

  if (isOwnerEmail && (emailVerified || isLegacyAdmin)) {
    target = "superAdmin";
  } else if (!current && isLegacyAdmin) {
    target = "admin";
  }

  if (!target || target === current) {
    return { role: current, changed: false };
  }

  await applyRole(uid, target, uid);
  await writeAudit(request, "Role synced", { uid, from: current, to: target });

  logger.info("Role synced", { uid, from: current, to: target });

  return { role: target, changed: true };

});


/* ============================================================
   setUserRole  (superAdmin only)
   data: { uid, role }   role = superAdmin | admin | support |
                                technician | null (customer)
   ============================================================ */

exports.setUserRole = onCall(async (request) => {

  await assertRole(request, ["superAdmin"], "Only a Super Admin can change roles.");

  const { uid } = request.data || {};
  const rawRole = request.data?.role;
  const role = rawRole === null || rawRole === "" || rawRole === "customer" ? null : rawRole;

  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "A user is required.");
  }
  if (role !== null && !ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "Unknown role.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You can't change your own role.");
  }

  let target;
  try {
    target = await admin.auth().getUser(uid);
  } catch (error) {
    throw new HttpsError("not-found", "User not found.");
  }

  const previous = ROLES.includes(target.customClaims?.role) ? target.customClaims.role : null;

  if (previous === "superAdmin" && role !== "superAdmin" && (await countSuperAdmins()) <= 1) {
    throw new HttpsError("failed-precondition", "There must always be at least one Super Admin.");
  }

  await applyRole(uid, role, request.auth.uid);

  // Losing access should take effect now, not whenever their
  // current login token happens to expire.
  const rank = (r) => (r ? ROLES.length - ROLES.indexOf(r) : 0);
  if (rank(role) < rank(previous)) {
    await admin.auth().revokeRefreshTokens(uid);
  }

  await writeAudit(request, "Changed user role", { uid, from: previous, to: role });

  return { success: true, uid, role };

});


/* ============================================================
   setUserBlocked  (admin or superAdmin)
   data: { uid, blocked: true|false }
   ============================================================ */

exports.setUserBlocked = onCall(async (request) => {

  const callerRole = await assertRole(request, ADMIN_ROLES, "Admin access required.");

  const { uid } = request.data || {};
  const blocked = request.data?.blocked === true;

  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "A user is required.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You can't block your own account.");
  }

  let target;
  try {
    target = await admin.auth().getUser(uid);
  } catch (error) {
    throw new HttpsError("not-found", "User not found.");
  }

  const targetSnap = await db.doc(`users/${uid}`).get();
  const targetRole = ROLES.includes(target.customClaims?.role)
    ? target.customClaims.role
    : ((target.customClaims?.admin === true || (targetSnap.exists && targetSnap.data().isAdmin === true)) ? "admin" : null);

  if (targetRole === "superAdmin") {
    throw new HttpsError("failed-precondition", "A Super Admin can't be blocked. Change their role first.");
  }
  if (targetRole && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Only a Super Admin can block staff accounts.");
  }

  await admin.auth().updateUser(uid, { disabled: blocked });

  if (blocked) {
    await admin.auth().revokeRefreshTokens(uid);
  }

  await db.doc(`users/${uid}`).set({
    blocked,
    ...(blocked
      ? { blockedAt: admin.firestore.FieldValue.serverTimestamp(), blockedBy: request.auth.uid }
      : { unblockedAt: admin.firestore.FieldValue.serverTimestamp(), unblockedBy: request.auth.uid })
  }, { merge: true });

  await writeAudit(request, blocked ? "Blocked user" : "Unblocked user", { uid });

  return { success: true, uid, blocked };

});
