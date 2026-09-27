import { auth, db } from "../firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/**
 * Guards a vendor dashboard page.
 * - Redirects to login if not signed in.
 * - Redirects to the application page if no vendor record exists.
 * - Shows a pending/blocked full-page state if not yet Active.
 * - Calls onReady(user, vendorDoc) once the vendor is confirmed Active.
 */
export function guardVendorPage(onReady) {

  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      window.location.href = "../login.html";
      return;
    }

    try {

      const vendorSnap = await getDoc(doc(db, "vendors", user.uid));

      if (!vendorSnap.exists()) {
        window.location.href = "../vendor-apply.html";
        return;
      }

      const vendor = { id: vendorSnap.id, ...vendorSnap.data() };

      if (vendor.status !== "Active") {
        renderBlockedState(vendor.status);
        return;
      }

      onReady(user, vendor);

    } catch (error) {
      console.error("Vendor access check error:", error);
      renderErrorState();
    }

  });

}

function renderBlockedState(status) {

  const isPending = status === "Pending";

  // A3: same layout as the portal's other full-page states (design-system .bf-state).
  document.body.innerHTML = `
    <div class="bf-admin-fullstate" style="display:flex;">
      <div class="bf-card" style="max-width:420px;width:100%;">
        <div class="bf-state${isPending ? "" : " bf-state-error"}">
          <div class="bf-state-icon" aria-hidden="true">${isPending ? "⏳" : "🚫"}</div>
          <p class="bf-state-title">${isPending ? "Application Pending" : "Account Blocked"}</p>
          <p class="bf-state-text">
            ${isPending
              ? "Your supplier application is still under review."
              : "Your supplier account has been blocked. Contact support for details."}
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <a href="../home.html" class="bf-btn bf-btn-ghost">← Back to Home</a>
            <button type="button" id="blockedLogoutBtn" class="bf-btn bf-btn-ghost" style="width:auto;margin:0;color:var(--bf-danger, #C1442D);">🚪 Logout</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("blockedLogoutBtn").addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../login.html";
    } catch (error) {
      alert(error.message);
    }
  });

}

function renderErrorState() {
  // A3: same layout as the other full-page states, plus a Reload button.
  document.body.innerHTML = `
    <div class="bf-admin-fullstate" style="display:flex;">
      <div class="bf-card" style="max-width:420px;width:100%;">
        <div class="bf-state bf-state-error" role="alert">
          <div class="bf-state-icon" aria-hidden="true">⚠️</div>
          <p class="bf-state-title">Something went wrong</p>
          <p class="bf-state-text">Unable to verify your supplier account. Please try again.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button type="button" class="bf-btn bf-btn-primary" style="width:auto;margin:0;" onclick="location.reload()">Reload</button>
            <a href="../home.html" class="bf-btn bf-btn-ghost">← Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function wireLogout(logoutBtn) {
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../login.html";
    } catch (error) {
      alert(error.message);
    }
  });
}
