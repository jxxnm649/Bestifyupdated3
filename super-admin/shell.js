/* ============================================================
   Bestify Super Admin — shared page shell (Phase A, UI only)

   Every super-admin page calls initSuperAdminPage({...}). This file
   builds the sidebar / mobile drawer, header, notifications bell,
   profile menu, PREVIEW bar, full-page states, and one shared modal,
   so the seven pages stay consistent and none of this is copied.

   Firebase use here is READ-ONLY and limited to page protection:
   the signed-in user (Auth) and the existing admin guard from
   STEP 1 (../admin/admin-guard.js). No Firestore writes anywhere.
   ============================================================ */

import { auth } from "../firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import { getStaffAccess, ADMIN_ROLES } from "../admin/admin-guard.js";
import { showToast, openModal, closeModal } from "../design-system.js";
import { NOTIFICATIONS, ROLES } from "./preview-data.js";

/* ============================================================
   Navigation
   ============================================================ */

const NAV = [
  { key: "dashboard", icon: "📊", label: "Dashboard",           href: "index.html" },
  { key: "staff",     icon: "🧑‍💼", label: "Staff & Admins",      href: "staff.html" },
  { key: "roles",     icon: "🔐", label: "Roles & Permissions", href: "roles.html" },
  { key: "audit",     icon: "📜", label: "Audit Log",           href: "audit-log.html" },
  { key: "finance",   icon: "💰", label: "Finance Overview",    href: "finance.html" },
  { key: "settings",  icon: "⚙️", label: "Platform Settings",   href: "settings.html" },
  { key: "profile",   icon: "👤", label: "My Profile",          href: "profile.html" }
];

/* ============================================================
   Small shared helpers (exported for the page scripts)
   ============================================================ */

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatINR(amount) {
  return `₹${inr.format(Number(amount) || 0)}`;
}

export function formatDateTime(value) {
  if (!value) return "Never";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function roleMeta(key) {
  return ROLES.find((r) => r.key === key) || { key, label: key || "Customer", badge: "bf-badge-neutral", summary: "" };
}

export function roleBadge(key) {
  const r = roleMeta(key);
  return `<span class="bf-badge ${r.badge}">${escapeHtml(r.label)}</span>`;
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
}

/** The one message every save / update / delete shows in Phase A. */
export const PHASE_B_MESSAGE = "Available in Phase B";

export function phaseB() {
  showToast(PHASE_B_MESSAGE, "info", 3200);
}

/* ---------- Content-level states ---------- */

/**
 * HTML for a loading / empty / error block inside a page.
 * opts: { title, text, actionLabel, actionId }
 */
export function stateBlock(kind, opts = {}) {

  if (kind === "loading") {
    return `
      <div class="bf-sa-skeleton-rows" aria-busy="true" aria-live="polite">
        <span class="bf-sr-only">Loading…</span>
        <span class="bf-skeleton bf-skeleton-title"></span>
        <span class="bf-skeleton" style="height:64px;"></span>
        <span class="bf-skeleton" style="height:64px;"></span>
        <span class="bf-skeleton" style="height:64px;"></span>
      </div>`;
  }

  const isError = kind === "error";
  const icon = isError ? "⚠️" : "🗂️";
  const title = opts.title || (isError ? "Couldn't load this page" : "Nothing here yet");
  const text = opts.text || (isError
    ? "The data didn't load. Check your connection and try again."
    : "There's no data to show for this view.");

  return `
    <div class="bf-card">
      <div class="bf-state ${isError ? "bf-state-error" : ""}" role="${isError ? "alert" : "status"}">
        <div class="bf-state-icon" aria-hidden="true">${icon}</div>
        <p class="bf-state-title">${escapeHtml(title)}</p>
        <p class="bf-state-text">${escapeHtml(text)}</p>
        ${opts.actionLabel
          ? `<button type="button" class="bf-btn ${isError ? "bf-btn-ghost" : "bf-btn-primary"}" id="${escapeHtml(opts.actionId || "saStateAction")}">${escapeHtml(opts.actionLabel)}</button>`
          : ""}
      </div>
    </div>`;
}

/* ============================================================
   Shared modal (one overlay, content swapped per use)
   ============================================================ */

let modalCleanup = null;

/**
 * openSaModal({ title, body, actions, onMount })
 * actions: [{ label, variant: "primary"|"ghost"|"danger", onClick(modalEl), close: bool, disabled: bool }]
 * An action's onClick may return false to keep the modal open.
 */
export function openSaModal({ title, body, actions = [], onMount }) {

  // A previous modal that was closed by the overlay still has its
  // Escape listener — remove it before opening the next one.
  if (modalCleanup) { modalCleanup(); modalCleanup = null; }

  const overlay = document.getElementById("saModal");
  const box = overlay.querySelector(".bf-modal");

  box.innerHTML = `
    <button type="button" class="bf-modal-close" data-sa-modal-close aria-label="Close">✕</button>
    <h2 class="bf-modal-title" id="saModalTitle">${escapeHtml(title)}</h2>
    <div class="bf-sa-modal-body">${body}</div>
    ${actions.length ? `
      <div class="bf-sa-modal-actions">
        ${actions.map((a, i) => `
          <button type="button" class="bf-btn bf-btn-${a.variant || "ghost"}" data-sa-action="${i}">
            ${escapeHtml(a.label)}
          </button>`).join("")}
      </div>` : ""}
  `;

  box.querySelectorAll("[data-sa-modal-close]").forEach((btn) =>
    btn.addEventListener("click", closeSaModal));

  box.querySelectorAll("[data-sa-action]").forEach((btn) => {
    const action = actions[Number(btn.dataset.saAction)];
    if (action.disabled) btn.disabled = true;
    btn.addEventListener("click", () => {
      const keepOpen = action.onClick ? action.onClick(box) === false : false;
      if (action.close && !keepOpen) closeSaModal();
    });
  });

  openModal("saModal");

  const onKey = (e) => { if (e.key === "Escape") closeSaModal(); };
  // Overlay click: handled here (not only by design-system.js) so the
  // Escape listener is always cleaned up, however the modal is closed.
  const onOverlay = (e) => { if (e.target === overlay) closeSaModal(); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", onOverlay);
  modalCleanup = () => {
    document.removeEventListener("keydown", onKey);
    overlay.removeEventListener("click", onOverlay);
  };

  if (onMount) onMount(box);

  const firstField = box.querySelector("input, select, textarea");
  (firstField || box.querySelector(".bf-modal-close"))?.focus();
}

export function closeSaModal() {
  closeModal("saModal");
  if (modalCleanup) { modalCleanup(); modalCleanup = null; }
}

/* ============================================================
   Page scaffolding
   ============================================================ */

function fullState(id, icon, title, text, actionHtml, hidden = true) {
  return `
    <div id="${id}" class="bf-admin-fullstate${hidden ? " bf-hidden" : ""}">
      <div class="bf-state${id === "saDeniedState" || id === "saErrorState" ? " bf-state-error" : ""}">
        ${icon ? `<div class="bf-state-icon" aria-hidden="true">${icon}</div>` : `<span class="bf-skeleton bf-skeleton-circle" style="margin:0 auto 16px;"></span>`}
        <p class="bf-state-title">${title}</p>
        ${text ? `<p class="bf-state-text">${text}</p>` : ""}
        ${actionHtml || ""}
      </div>
    </div>`;
}

function shellMarkup(activeKey, title) {

  const unread = NOTIFICATIONS.filter((n) => n.unread).length;

  return `
    ${fullState("saLoadingState", "", "Loading Super Admin…", "", "", false)}
    ${fullState("saAuthState", "🔒", "Please log in", "Log in with your admin account to open the Super Admin panel.",
      `<a href="../login.html" class="bf-btn bf-btn-primary">Go to login</a>`)}
    ${fullState("saDeniedState", "⛔", "No access to this panel", "This account isn't an admin. Ask the shop owner for access.",
      `<a href="../home.html" class="bf-btn bf-btn-ghost">Back to store</a>`)}
    ${fullState("saErrorState", "⚠️", "Couldn't check your access", "Check your internet connection and reload the page.",
      `<button type="button" class="bf-btn bf-btn-ghost" id="saReloadBtn">Reload</button>`)}

    <div id="saShell" class="bf-admin-shell bf-hidden">

      <div class="bf-admin-drawer-overlay" id="saDrawerOverlay"></div>

      <aside class="bf-admin-sidebar" id="saSidebar" aria-label="Super Admin navigation">
        <div class="bf-admin-sidebar-brand">
          <img src="../bestify-logo.jpeg" alt="" class="bf-admin-logo-img">
          <span class="bf-admin-brand-text">Bestify</span>
          <button type="button" class="bf-sa-drawer-close" id="saDrawerClose" aria-label="Close menu">✕</button>
        </div>
        <span class="bf-sa-tier">Super Admin</span>

        <nav class="bf-admin-nav">
          ${NAV.map((item) => `
            <a href="${item.href}"
               class="bf-admin-nav-item${item.key === activeKey ? " bf-admin-nav-active" : ""}"
               ${item.key === activeKey ? 'aria-current="page"' : ""}>
              <span class="bf-admin-nav-icon" aria-hidden="true">${item.icon}</span>
              <span>${item.label}</span>
            </a>`).join("")}
        </nav>

        <div class="bf-sa-sidebar-foot">
          <a href="../admin/index.html" class="bf-admin-nav-item">
            <span class="bf-admin-nav-icon" aria-hidden="true">🛠️</span><span>Open Admin panel</span>
          </a>
          <a href="../home.html" class="bf-admin-nav-item">
            <span class="bf-admin-nav-icon" aria-hidden="true">🏬</span><span>View store</span>
          </a>
        </div>
      </aside>

      <div class="bf-admin-main-col">

        <header class="bf-admin-header">

          <button type="button" class="bf-admin-hamburger" id="saHamburger"
                  aria-label="Open menu" aria-controls="saSidebar" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>

          <div class="bf-admin-header-title">
            <span class="bf-admin-header-brand">${escapeHtml(title)}</span>
            <span class="bf-admin-header-label">Super Admin</span>
          </div>

          <div class="bf-admin-header-actions">

            <div class="bf-sa-dropdown-wrap">
              <button type="button" class="bf-admin-icon-btn" id="saBellBtn"
                      aria-label="Notifications, ${unread} unread" aria-haspopup="true" aria-expanded="false">🔔</button>
              ${unread ? `<span class="bf-sa-bell-dot" aria-hidden="true">${unread}</span>` : ""}
              <div class="bf-sa-dropdown bf-hidden" id="saBellMenu" role="dialog" aria-label="Notifications">
                <div class="bf-sa-dropdown-head">
                  <span>Notifications</span>
                  <button type="button" id="saMarkAllRead">Mark all as read</button>
                </div>
                <ul class="bf-sa-list">
                  ${NOTIFICATIONS.map((n) => `
                    <li class="${n.unread ? "bf-sa-unread" : ""}">
                      <div class="bf-sa-list-row">
                        <span class="bf-sa-list-icon" aria-hidden="true">${n.icon}</span>
                        <div class="bf-sa-list-body">
                          <p class="bf-sa-list-title">${escapeHtml(n.text)}</p>
                          <p class="bf-sa-list-detail">${escapeHtml(formatDateTime(n.at))}</p>
                        </div>
                      </div>
                    </li>`).join("")}
                </ul>
              </div>
            </div>

            <div class="bf-admin-profile">
              <button type="button" class="bf-admin-profile-btn" id="saProfileBtn"
                      aria-haspopup="true" aria-expanded="false">
                <span class="bf-admin-avatar" id="saAvatar">?</span>
                <span class="bf-admin-user-info">
                  <span class="bf-admin-user-name" id="saUserName">—</span>
                  <span class="bf-admin-user-email" id="saUserEmail">—</span>
                </span>
              </button>
              <div class="bf-admin-profile-menu bf-hidden" id="saProfileMenu">
                <a href="profile.html" class="bf-sa-profile-menu-link">👤 My profile</a>
                <a href="../admin/index.html" class="bf-sa-profile-menu-link">🛠️ Admin panel</a>
                <button type="button" class="bf-admin-logout-btn" id="saLogoutBtn">🚪 Log out</button>
              </div>
            </div>

          </div>
        </header>

        <main class="bf-admin-content" id="saMain">

          <div class="bf-sa-preview-bar" role="note">
            <span class="bf-sa-preview-tag">PREVIEW</span>
            <p id="saPreviewText">Sample data only. Nothing on this page is read from or saved to your store yet — that's Phase B.</p>
            <div class="bf-sa-state-switch" role="group" aria-label="Preview page state">
              <button type="button" data-sa-state="data" aria-pressed="true">Data</button>
              <button type="button" data-sa-state="loading" aria-pressed="false">Loading</button>
              <button type="button" data-sa-state="empty" aria-pressed="false">Empty</button>
              <button type="button" data-sa-state="error" aria-pressed="false">Error</button>
            </div>
          </div>

          <div id="saPage"></div>

        </main>
      </div>
    </div>

    <div id="saModal" class="bf-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="saModalTitle">
      <div class="bf-modal"></div>
    </div>
  `;
}

function show(id) {
  ["saLoadingState", "saAuthState", "saDeniedState", "saErrorState", "saShell"].forEach((x) => {
    document.getElementById(x)?.classList.toggle("bf-hidden", x !== id);
  });
}

/* ---------- Drawer, dropdowns ---------- */

function wireChrome() {

  const shell = document.getElementById("saShell");
  const hamburger = document.getElementById("saHamburger");
  const overlay = document.getElementById("saDrawerOverlay");

  const setDrawer = (open) => {
    shell.classList.toggle("bf-admin-drawer-open", open);
    hamburger.setAttribute("aria-expanded", String(open));
  };

  hamburger.addEventListener("click", () => setDrawer(!shell.classList.contains("bf-admin-drawer-open")));
  overlay.addEventListener("click", () => setDrawer(false));
  document.getElementById("saDrawerClose").addEventListener("click", () => {
    setDrawer(false);
    hamburger.focus();
  });

  const bellBtn = document.getElementById("saBellBtn");
  const bellMenu = document.getElementById("saBellMenu");
  const profileBtn = document.getElementById("saProfileBtn");
  const profileMenu = document.getElementById("saProfileMenu");

  const closeMenus = () => {
    bellMenu.classList.add("bf-hidden");
    profileMenu.classList.add("bf-hidden");
    bellBtn.setAttribute("aria-expanded", "false");
    profileBtn.setAttribute("aria-expanded", "false");
  };

  const toggle = (btn, menu) => (e) => {
    e.stopPropagation();
    const willOpen = menu.classList.contains("bf-hidden");
    closeMenus();
    if (willOpen) {
      menu.classList.remove("bf-hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  };

  bellBtn.addEventListener("click", toggle(bellBtn, bellMenu));
  profileBtn.addEventListener("click", toggle(profileBtn, profileMenu));
  bellMenu.addEventListener("click", (e) => e.stopPropagation());
  profileMenu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeMenus);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeMenus(); setDrawer(false); }
  });

  document.getElementById("saMarkAllRead").addEventListener("click", phaseB);

  document.getElementById("saLogoutBtn").addEventListener("click", async () => {
    try {
      await signOut(auth);
    } finally {
      window.location.href = "../login.html";
    }
  });
}

function fillUser(user) {
  const name = user.displayName || (user.email ? user.email.split("@")[0] : "Admin");
  document.getElementById("saAvatar").textContent = initials(name);
  document.getElementById("saUserName").textContent = name;
  document.getElementById("saUserEmail").textContent = user.email || "";
}

/* ============================================================
   initSuperAdminPage
   render(ctx) is called with:
     ctx.state   "data" | "loading" | "empty" | "error"
     ctx.el      the page container
     ctx.user    Firebase Auth user (read-only)
     ctx.role    role from the existing admin guard
     ctx.rerender()        redraw with the same state
     ctx.setState(state)   switch preview state and redraw
   ============================================================ */

export function initSuperAdminPage({ key, title, render }) {

  document.body.classList.add("bf-admin-body", "bf-sa");
  document.getElementById("saRoot").innerHTML = shellMarkup(key, title);
  document.title = `${title} — Bestify Super Admin`;

  document.getElementById("saReloadBtn").addEventListener("click", () => window.location.reload());

  const params = new URLSearchParams(window.location.search);
  let state = ["loading", "empty", "error"].includes(params.get("preview")) ? params.get("preview") : "data";

  const ctx = {
    state,
    el: null,
    user: null,
    role: null,
    rerender: () => draw(),
    // Used by "Try again" / "Clear" buttons inside preview states.
    setState: (next) => { state = next; syncSwitch(); draw(); }
  };

  function syncSwitch() {
    document.querySelectorAll("[data-sa-state]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.saState === state)));
  }

  function draw() {
    ctx.state = state;
    ctx.el = document.getElementById("saPage");
    render(ctx);
  }

  document.querySelectorAll("[data-sa-state]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state = btn.dataset.saState;
      syncSwitch();
      draw();
    });
  });

  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      show("saAuthState");
      return;
    }

    try {

      // Existing STEP 1 guard, unchanged — basic page protection only.
      const { role } = await getStaffAccess(user);

      if (!ADMIN_ROLES.includes(role)) {
        show("saDeniedState");
        return;
      }

      ctx.user = user;
      ctx.role = role;

      if (role !== "superAdmin") {
        document.getElementById("saPreviewText").textContent =
          "Sample data only — nothing here is read from or saved to your store yet. You're signed in as Admin; in Phase B this panel will be for Super Admins only.";
      }

      fillUser(user);
      wireChrome();
      syncSwitch();
      show("saShell");
      draw();

    } catch (error) {
      console.error("Super Admin access check failed:", error);
      show("saErrorState");
    }

  });
}
