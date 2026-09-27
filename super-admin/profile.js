/* Super Admin — My Profile (Phase A preview)
   Name, email and role are read from the signed-in account (no
   writes). Sessions are preview data. Every change → Phase B toast. */

import {
  initSuperAdminPage, stateBlock, escapeHtml, formatDateTime,
  roleBadge, initials, openSaModal, phaseB
} from "./shell.js";

import { MY_SESSIONS } from "./preview-data.js";

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>My Profile</h1>
        <p>Your own account: how you sign in and where you're signed in.</p>
      </div>
    </div>`;
}

function accountCard(user, role) {
  const name = user.displayName || (user.email ? user.email.split("@")[0] : "Admin");
  return `
    <section class="bf-sa-section">
      <div class="bf-card bf-card-pad-lg">
        <div class="bf-sa-person" style="gap:14px;margin-bottom:18px;">
          <span class="bf-admin-avatar" style="width:56px;height:56px;font-size:20px;" aria-hidden="true">${escapeHtml(initials(name))}</span>
          <div>
            <div class="bf-sa-person-name" style="font-size:18px;">${escapeHtml(name)}</div>
            <div class="bf-sa-person-sub">${escapeHtml(user.email || "")}</div>
          </div>
        </div>
        <dl class="bf-sa-kv">
          <dt>Access right now</dt>
          <dd>${roleBadge(role)} <span class="bf-sa-muted">from your current login</span></dd>
          <dt>Email</dt>
          <dd>${escapeHtml(user.email || "—")}
            ${user.emailVerified
              ? '<span class="bf-badge bf-badge-success">Verified</span>'
              : '<span class="bf-badge bf-badge-warning">Not verified</span>'}
          </dd>
          <dt>Account ID</dt>
          <dd class="bf-sa-amount" style="font-size:12px;">${escapeHtml(user.uid)}</dd>
        </dl>
        ${role !== "superAdmin" ? `
          <div class="bf-alert bf-alert-info" role="note" style="margin-top:16px;">
            <span aria-hidden="true">ℹ️</span>
            <span>Your login doesn't have the Super Admin role yet. That's set up in Phase B (SUPER_ADMIN_EMAILS + deployed functions).</span>
          </div>` : ""}
        <div class="bf-sa-page-actions" style="margin-top:18px;">
          <button type="button" class="bf-btn bf-btn-ghost" id="saEditProfile">Edit name &amp; phone</button>
          <button type="button" class="bf-btn bf-btn-ghost" id="saResetPassword">Change password</button>
        </div>
      </div>
    </section>`;
}

function sessionsCard() {
  return `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head">
        <h2>Where you're signed in</h2>
        <span class="bf-sa-preview-tag">PREVIEW</span>
      </div>
      <div class="bf-card">
        <ul class="bf-sa-list">
          ${MY_SESSIONS.map((s) => `
            <li>
              <div class="bf-sa-list-row">
                <span class="bf-sa-list-icon" aria-hidden="true">${/android|iphone/i.test(s.device) ? "📱" : "💻"}</span>
                <span class="bf-sa-list-body">
                  <p class="bf-sa-list-title">${escapeHtml(s.device)}${s.current ? ' <span class="bf-badge bf-badge-success">This device</span>' : ""}</p>
                  <p class="bf-sa-list-detail">${escapeHtml(s.place)}, last active ${escapeHtml(formatDateTime(s.lastActive))}</p>
                </span>
              </div>
            </li>`).join("")}
        </ul>
        <button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" id="saSignOutOthers" style="margin-top:8px;">Sign out other devices</button>
      </div>
    </section>`;
}

function openEdit(user) {
  openSaModal({
    title: "Edit name & phone",
    body: `
      <div class="bf-field">
        <label class="bf-label" for="saMyName">Name</label>
        <input class="bf-input" id="saMyName" value="${escapeHtml(user.displayName || "")}">
        <p class="bf-error-text bf-hidden" id="saMyNameErr">Enter your name.</p>
      </div>
      <div class="bf-field">
        <label class="bf-label" for="saMyPhone">Phone (optional)</label>
        <input class="bf-input" id="saMyPhone" type="tel" inputmode="numeric">
        <p class="bf-error-text bf-hidden" id="saMyPhoneErr">Enter a 10-digit phone number, or leave it empty.</p>
      </div>`,
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      {
        label: "Save profile",
        variant: "primary",
        onClick(box) {
          const name = box.querySelector("#saMyName");
          const phone = box.querySelector("#saMyPhone");
          const nameOk = name.value.trim().length >= 2;
          const digits = phone.value.replace(/\D/g, "");
          const phoneOk = !phone.value.trim() || digits.length === 10;
          box.querySelector("#saMyNameErr").classList.toggle("bf-hidden", nameOk);
          box.querySelector("#saMyPhoneErr").classList.toggle("bf-hidden", phoneOk);
          name.classList.toggle("bf-input-error", !nameOk);
          phone.classList.toggle("bf-input-error", !phoneOk);
          if (nameOk && phoneOk) phaseB();
          return false;
        }
      }
    ]
  });
}

function openPassword(user) {
  openSaModal({
    title: "Change password",
    body: `<p style="margin:0;">We'll email a secure link to <strong>${escapeHtml(user.email || "your email")}</strong>. Open it to set a new password.</p>`,
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      { label: "Email me a link", variant: "primary", onClick: () => { phaseB(); return false; } }
    ]
  });
}

initSuperAdminPage({
  key: "profile",
  title: "My Profile",
  render(ctx) {

    if (ctx.state === "loading") {
      ctx.el.innerHTML = head() + stateBlock("loading");
      return;
    }
    if (ctx.state === "error") {
      ctx.el.innerHTML = head() + stateBlock("error", {
        title: "Couldn't load your profile",
        text: "Your account details didn't load. Try again, or log out and back in.",
        actionLabel: "Try again", actionId: "saRetry"
      });
      document.getElementById("saRetry").addEventListener("click", () => ctx.setState("data"));
      return;
    }

    const sessions = ctx.state === "empty"
      ? `<section class="bf-sa-section">${stateBlock("empty", {
          title: "No other sign-ins",
          text: "You're only signed in on this device."
        })}</section>`
      : sessionsCard();

    ctx.el.innerHTML = head() + accountCard(ctx.user, ctx.role) + sessions;

    document.getElementById("saEditProfile").addEventListener("click", () => openEdit(ctx.user));
    document.getElementById("saResetPassword").addEventListener("click", () => openPassword(ctx.user));
    document.getElementById("saSignOutOthers")?.addEventListener("click", phaseB);
  }
});
