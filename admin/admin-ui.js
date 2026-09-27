/* ============================================================
   Bestify Admin — shared UI behaviour (A2)

   Loaded by every page in admin/ AFTER the page's own script.
   UI ONLY. This file never reads or writes Firestore and never calls
   a Cloud Function. The only Firebase it touches:
     - Auth (read-only) to show the signed-in email in the header
     - signOut() for "Log out" (the same thing the dashboard's
       existing Log out button does)

   What it adds
   - Mobile drawer on every page: ☰ button, overlay, ✕ close, Esc.
     (Only the dashboard had one; on the other 19 pages the sidebar
     was unreachable below 1024px.)
   - Header bell (opens the existing Activity page) and a profile
     menu on pages that had neither.
   - Esc closes the open modal by pressing its own ✕ button, so the
     page's existing close logic runs unchanged.
   - Dashboard KPI numbers drop their loading shimmer once filled.
   - A Cancel button beside Submit in every form modal (it presses
     the modal's own ✕ — no new close logic).
   - One look for loading / empty / error message cards (CSS classes
     only; the page's own text is kept).

   The dashboard (index.html) keeps its own drawer and profile code
   in admin.js; this file only adds what that page is missing.
   ============================================================ */

import { auth } from "../firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const shell = document.querySelector(".bf-admin-shell");
const sidebar = shell?.querySelector(".bf-admin-sidebar");
const header = shell?.querySelector(".bf-admin-header");
const onAlertsPage = /\/alerts\.html$/.test(window.location.pathname);

// The dashboard wires its own hamburger / overlay / profile menu.
const hasOwnDrawer = !!document.getElementById("hamburgerBtn");

let hamburger = document.getElementById("hamburgerBtn");

/* ---------- helpers ---------- */

function isDrawerOpen() {
  return shell.classList.contains("bf-admin-drawer-open");
}

function setDrawer(open) {
  shell.classList.toggle("bf-admin-drawer-open", open);
  hamburger?.setAttribute("aria-expanded", String(open));
  if (hamburger) hamburger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

/* ============================================================
   1. Drawer
   ============================================================ */

function setUpDrawer() {

  if (!shell || !sidebar || !header) return;

  if (!sidebar.id) sidebar.id = "adminSidebar";

  if (!hasOwnDrawer) {

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "bf-admin-drawer-overlay";
    overlay.addEventListener("click", () => setDrawer(false));
    shell.insertBefore(overlay, shell.firstChild);

    // ☰ button, same markup/classes as the dashboard's
    hamburger = document.createElement("button");
    hamburger.type = "button";
    hamburger.className = "bf-admin-hamburger";
    hamburger.setAttribute("aria-label", "Open menu");
    hamburger.setAttribute("aria-controls", sidebar.id);
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.innerHTML = "<span></span><span></span><span></span>";
    hamburger.addEventListener("click", () => setDrawer(!isDrawerOpen()));
    header.insertBefore(hamburger, header.firstChild);

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024 && isDrawerOpen()) setDrawer(false);
    });
  }

  // ✕ inside the drawer (all pages, incl. dashboard)
  const brand = sidebar.querySelector(".bf-admin-sidebar-brand");
  if (brand && !brand.querySelector(".bf-admin-drawer-close")) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "bf-admin-drawer-close";
    close.setAttribute("aria-label", "Close menu");
    close.textContent = "✕";
    close.addEventListener("click", () => {
      setDrawer(false);
      hamburger?.focus();
    });
    brand.appendChild(close);
  }

  // Open the Vendor group when one of its pages is the current page
  sidebar.querySelectorAll(".bf-admin-nav-group").forEach((group) => {
    if (group.querySelector(".bf-admin-nav-subitem-active")) group.classList.add("open");
  });

  // Mark the current page for screen readers
  sidebar.querySelectorAll(".bf-admin-nav-active, .bf-admin-nav-subitem-active")
    .forEach((el) => el.setAttribute("aria-current", "page"));

  // Leaving the page from the drawer: close it first so the next
  // page (or the back button) doesn't flash it open.
  sidebar.addEventListener("click", (e) => {
    const item = e.target.closest(".bf-admin-nav-item:not(.bf-admin-nav-group-toggle), .bf-admin-nav-subitem");
    if (item && window.innerWidth < 1024) setDrawer(false);
  });
}

/* ============================================================
   2. Header actions for pages that have none
   ============================================================ */

function setUpHeaderActions() {

  if (!header || header.querySelector(".bf-admin-header-actions")) {
    // Dashboard: its bell button had no action — open Activity.
    const dashBell = document.getElementById("notifBtn");
    if (dashBell && !dashBell.dataset.bfWired) {
      dashBell.dataset.bfWired = "1";
      dashBell.setAttribute("aria-label", "Activity");
      dashBell.title = "Activity";
      dashBell.addEventListener("click", () => { window.location.href = "alerts.html"; });
    }
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "bf-admin-ui-actions";
  wrap.innerHTML = `
    ${onAlertsPage ? "" : `
      <a class="bf-admin-icon-btn" href="alerts.html" aria-label="Activity" title="Activity">🔔</a>`}
    <div class="bf-admin-profile bf-admin-ui-menu-wrap">
      <button type="button" class="bf-admin-profile-btn" id="bfUiProfileBtn"
              aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
        <span class="bf-admin-avatar" id="bfUiAvatar">?</span>
        <span class="bf-admin-user-info">
          <span class="bf-admin-user-name" id="bfUiName">—</span>
          <span class="bf-admin-user-email" id="bfUiEmail">—</span>
        </span>
      </button>
      <div class="bf-admin-profile-menu bf-admin-ui-menu bf-hidden" id="bfUiMenu">
        <div class="bf-admin-ui-menu-who" id="bfUiWho"></div>
        <a href="index.html">📊 Dashboard</a>
        <a href="../home.html">🏬 View store</a>
        <button type="button" class="bf-admin-logout-btn" id="bfUiLogout">🚪 Log out</button>
      </div>
    </div>`;
  header.appendChild(wrap);

  const btn = wrap.querySelector("#bfUiProfileBtn");
  const menu = wrap.querySelector("#bfUiMenu");

  const closeMenu = () => {
    menu.classList.add("bf-hidden");
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = menu.classList.contains("bf-hidden");
    menu.classList.toggle("bf-hidden", !open);
    btn.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  wrap.querySelector("#bfUiLogout").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      await signOut(auth);
      window.location.href = "../login.html";
    } catch (error) {
      console.error("Logout failed:", error);
      b.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "Admin");
    wrap.querySelector("#bfUiAvatar").textContent = (name[0] || "A").toUpperCase();
    wrap.querySelector("#bfUiName").textContent = name;
    wrap.querySelector("#bfUiEmail").textContent = user.email || "";
    wrap.querySelector("#bfUiWho").innerHTML =
      `<strong>${escapeHtml(name)}</strong>${escapeHtml(user.email || "")}`;
  });
}

/* ============================================================
   3. Esc key: drawer first, then the top-most open modal
   ============================================================ */

// Open-modal patterns used across the admin pages, and the button
// that page already uses to close each one.
const MODAL_PATTERNS = [
  { open: ".bf-modal-overlay.bf-open", close: ".bf-modal-close" },
  { open: ".hop-modal-overlay.open", close: ".hop-close-btn" },
  { open: "#sales-modal.flex:not(.hidden)", close: "#closeSalesModalBtn" },
  { open: "#edit-modal.flex:not(.hidden)", close: "#closeEditModalBtn" }
];

function closeTopModal() {
  const open = [];
  MODAL_PATTERNS.forEach((p) => {
    document.querySelectorAll(p.open).forEach((el) => open.push({ el, close: p.close }));
  });
  if (!open.length) return false;

  // Last one in the document is drawn on top
  open.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const top = open[open.length - 1];
  const btn = top.el.querySelector(top.close) || document.querySelector(top.close);
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

// Products page: its Tailwind modals had no "tap outside to close".
// Tapping the dark backdrop presses the modal's own ✕ button.
[["sales-modal", "closeSalesModalBtn"], ["edit-modal", "closeEditModalBtn"]].forEach(([modalId, closeId]) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) document.getElementById(closeId)?.click();
  });
});

/* Products page modals (Tailwind markup) had no click-outside close.
   A click on the dimmed backdrop presses the modal's own ✕, so the
   page's existing close logic runs. Other admin modals already close
   on the backdrop via design-system.js / home-orders.js. */
const BACKDROP_CLOSE = [
  { overlay: "#edit-modal", close: "#closeEditModalBtn" },
  { overlay: "#sales-modal", close: "#closeSalesModalBtn" }
];
document.addEventListener("click", (e) => {
  for (const b of BACKDROP_CLOSE) {
    const overlay = document.querySelector(b.overlay);
    if (overlay && e.target === overlay) {
      document.querySelector(b.close)?.click();
      return;
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (shell && isDrawerOpen()) {
    setDrawer(false);
    hamburger?.focus();
    return;
  }
  closeTopModal();
});

/* ============================================================
   4. Dashboard KPI shimmer
   The six metric values keep the "bf-skeleton" class after
   admin.js fills them in, so the loading shimmer never stopped.
   ============================================================ */

function watchMetricValues() {
  document.querySelectorAll(".bf-admin-metric-value.bf-skeleton").forEach((el) => {
    const settle = () => {
      if (el.textContent.trim()) {
        el.classList.remove("bf-skeleton", "bf-skeleton-title");
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(settle);
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    settle();
  });
}

/* ============================================================
   5. Cancel button in form modals
   Every form modal had only ✕ to back out. Add a Cancel button next
   to the submit button that simply presses that same ✕, so the
   page's own close logic runs (nothing is saved, nothing reset
   differently). The submit button keeps its id and listeners — it
   is only moved into a two-button row.
   ============================================================ */

function addModalCancelButtons() {
  document.querySelectorAll(".bf-modal-overlay .bf-modal form").forEach((form) => {
    // Only the full-width "form modal" submit pattern (not e.g. the chat
    // reply box, whose Send button sits inline next to the text field).
    const submit = form.querySelector('button[type="submit"].bf-btn-block');
    const close = form.closest(".bf-modal")?.querySelector(".bf-modal-close");
    if (!submit || !close || form.querySelector("[data-bf-cancel]")) return;
    const hasCancel = [...form.querySelectorAll("button")]
      .some((b) => /^(cancel|close)$/i.test(b.textContent.trim()));
    if (hasCancel) return;

    const row = document.createElement("div");
    row.className = "bf-admin-ui-form-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "bf-btn bf-btn-ghost";
    cancel.dataset.bfCancel = "";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => close.click());

    submit.parentNode.insertBefore(row, submit);
    row.append(cancel, submit);
  });
}

/* ============================================================
   6. Consistent loading / empty / error states
   Many pages print a one-line card into their list ("No users
   found.", "❌ Unable to load users.", "Loading…"). Tag those cards
   so admin-ui.css can draw them all the same way. Only CSS classes
   are added — the page's own text and markup stay as they are, and
   the page can still replace them whenever it re-renders.
   ============================================================ */

const STATE_RULES = [
  { cls: "bf-admin-ui-state-error",   test: /^(❌|⚠️)?\s*(unable to load|couldn'?t load|failed to load|error loading)/i },
  { cls: "bf-admin-ui-state-loading", test: /^loading\b/i },
  { cls: "bf-admin-ui-state-empty",   test: /^(🎉\s*)?(no |nothing |0 results)/i }
];
const STATE_CLASSES = ["bf-admin-ui-state", "bf-admin-ui-state-own-icon", ...STATE_RULES.map((r) => r.cls)];

function classifyStateCard(card) {
  // Only simple message cards: no inputs, no lists, at most a Retry button.
  if (card.querySelector(".bf-state, input, select, textarea, img, .bf-card")) return null;
  if (card.querySelectorAll("button").length > 1) return null;
  const text = card.textContent.replace(/\s+/g, " ").trim();
  if (!text || text.length > 140) return null;
  const rule = STATE_RULES.find((r) => r.test.test(text));
  return rule ? rule.cls : null;
}

function polishList(list) {
  const cards = [...list.children];
  const only = cards.length === 1 && cards[0].classList.contains("bf-card") ? cards[0] : null;
  const cls = only ? classifyStateCard(only) : null;

  list.querySelectorAll(":scope > .bf-admin-ui-state").forEach((c) => {
    if (c !== only || !cls) c.classList.remove(...STATE_CLASSES);
  });
  if (only && cls && !only.classList.contains(cls)) {
    only.classList.remove(...STATE_CLASSES);
    only.classList.add("bf-admin-ui-state", cls);
  }

  // The list's "Loading users…" counter just above it is stale once the
  // list shows an error — hide it until the page writes a real count.
  // (Skips hidden bars in between, e.g. the Orders bulk-action bar.)
  let label = list.previousElementSibling;
  for (let i = 0; label && i < 3 && getComputedStyle(label).display === "none" && !label.classList.contains("bf-admin-ui-stale"); i++) {
    label = label.previousElementSibling;
  }
  if (label && !label.matches(".bf-card, form, .bf-modal-overlay")) {
    const stale = cls === "bf-admin-ui-state-error" && /^loading\b/i.test(label.textContent.trim());
    label.classList.toggle("bf-admin-ui-stale", stale);
  }

  // Message already starts with its own emoji (❌, 🎉…): don't add a second icon.
  if (only && cls) {
    const first = only.textContent.trim().codePointAt(0) || 0;
    only.classList.toggle("bf-admin-ui-state-own-icon", first > 0x2000);
  }
}

// A status card that is itself the element with the id (e.g. the
// Settings page's #settingsLoading card, which shows "Unable to load
// settings. [Retry]" in place).
function polishCard(card) {
  const cls = classifyStateCard(card);
  if (!cls) {
    if (card.classList.contains("bf-admin-ui-state")) card.classList.remove(...STATE_CLASSES);
    return;
  }
  if (!card.classList.contains(cls)) {
    card.classList.remove(...STATE_CLASSES);
    card.classList.add("bf-admin-ui-state", cls);
  }
  const first = card.textContent.trim().codePointAt(0) || 0;
  card.classList.toggle("bf-admin-ui-state-own-icon", first > 0x2000);
}

function watchStates() {
  const content = document.querySelector(".bf-admin-content");
  if (!content) return;
  const lists = () => content.querySelectorAll("[id]:not(.bf-modal-overlay)");
  let queued = false;
  const run = () => {
    queued = false;
    lists().forEach((el) => {
      if (el.classList.contains("bf-card")) polishCard(el);
      else if (el.children.length === 1 && el.firstElementChild.classList.contains("bf-card")) polishList(el);
      else if (el.querySelector(":scope > .bf-admin-ui-state")) polishList(el);
    });
  };
  new MutationObserver(() => {
    if (!queued) { queued = true; requestAnimationFrame(run); }
  }).observe(content, { childList: true, subtree: true, characterData: true });
  run();
}

setUpDrawer();
setUpHeaderActions();
watchStates();
watchMetricValues();
addModalCancelButtons();
