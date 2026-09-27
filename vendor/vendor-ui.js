/* ============================================================
   Bestify Supplier Portal — shared UI behaviour (A3 Part 1)

   Loaded by every page in vendor/ AFTER the page's own script.
   UI ONLY: this file never reads or writes Firestore and never calls
   a Cloud Function. The only Firebase it touches is Auth, read-only,
   to show the signed-in email in the profile menu.

   What it adds
   - Mobile drawer: ☰ button, overlay, ✕ close, Esc (below 1024px the
     sidebar was unreachable — the pages had no menu button at all).
   - "Supplier" tag under the brand.
   - Profile menu in the header. The page's existing Log out button
     (#logoutBtn, already wired by wireLogout() in vendor-common.js)
     is MOVED into the menu, so its click handler is unchanged.
   - Esc closes an open .bf-modal-overlay by pressing its own ✕.
   - (Part 2) One look for loading / empty / error message cards.
   ============================================================ */

import { auth } from "../firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const shell = document.querySelector(".bf-admin-shell");
const sidebar = shell?.querySelector(".bf-admin-sidebar");
const header = shell?.querySelector(".bf-admin-header");

let hamburger = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

function isDrawerOpen() {
  return !!shell?.classList.contains("bf-admin-drawer-open");
}

function setDrawer(open) {
  if (!shell) return;
  shell.classList.toggle("bf-admin-drawer-open", open);
  if (hamburger) {
    hamburger.setAttribute("aria-expanded", String(open));
    hamburger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
}

/* ---------- 1. Drawer ---------- */

function setUpDrawer() {

  if (!shell || !sidebar || !header) return;

  if (!sidebar.id) sidebar.id = "vendorSidebar";
  sidebar.setAttribute("aria-label", "Supplier Portal navigation");

  const overlay = document.createElement("div");
  overlay.className = "bf-admin-drawer-overlay";
  overlay.addEventListener("click", () => setDrawer(false));
  shell.insertBefore(overlay, shell.firstChild);

  hamburger = document.createElement("button");
  hamburger.type = "button";
  hamburger.className = "bf-admin-hamburger";
  hamburger.setAttribute("aria-label", "Open menu");
  hamburger.setAttribute("aria-controls", sidebar.id);
  hamburger.setAttribute("aria-expanded", "false");
  hamburger.innerHTML = "<span></span><span></span><span></span>";
  hamburger.addEventListener("click", () => setDrawer(!isDrawerOpen()));
  header.insertBefore(hamburger, header.firstChild);

  const brand = sidebar.querySelector(".bf-admin-sidebar-brand");
  if (brand) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "bf-vd-drawer-close";
    close.setAttribute("aria-label", "Close menu");
    close.textContent = "✕";
    close.addEventListener("click", () => {
      setDrawer(false);
      hamburger.focus();
    });
    brand.appendChild(close);

    const tier = document.createElement("span");
    tier.className = "bf-vd-tier";
    tier.textContent = "Supplier";
    brand.insertAdjacentElement("afterend", tier);
  }

  sidebar.querySelectorAll(".bf-admin-nav-active").forEach((el) => el.setAttribute("aria-current", "page"));

  // Leaving the page from the drawer: close it first.
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest(".bf-admin-nav-item") && window.innerWidth < 1024) setDrawer(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024 && isDrawerOpen()) setDrawer(false);
  });
}

/* ---------- 2. Profile menu ---------- */

let closeProfileMenu = () => {};

function setUpProfileMenu() {

  if (!header) return;

  const logoutBtn = document.getElementById("logoutBtn");

  const wrap = document.createElement("div");
  wrap.className = "bf-vd-header-actions";
  wrap.innerHTML = `
    <div class="bf-admin-profile bf-vd-menu-wrap">
      <button type="button" class="bf-admin-profile-btn" id="vdProfileBtn"
              aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
        <span class="bf-admin-avatar" id="vdAvatar">?</span>
        <span class="bf-admin-user-info">
          <span class="bf-admin-user-name" id="vdName">Supplier</span>
          <span class="bf-admin-user-email" id="vdEmail"></span>
        </span>
      </button>
      <div class="bf-admin-profile-menu bf-vd-menu bf-hidden" id="vdMenu">
        <div class="bf-vd-menu-who" id="vdWho"></div>
        <a href="profile.html">🏪 Shop profile</a>
        <a href="withdraw.html">💸 Withdraw</a>
        <a href="../home.html">🏬 View store</a>
      </div>
    </div>`;
  header.appendChild(wrap);

  const btn = wrap.querySelector("#vdProfileBtn");
  const menu = wrap.querySelector("#vdMenu");

  // Move (not copy) the existing, already-wired Log out button.
  if (logoutBtn) {
    logoutBtn.classList.remove("bf-btn", "bf-btn-ghost", "bf-btn-sm");
    menu.appendChild(logoutBtn);
  }

  closeProfileMenu = () => {
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
  document.addEventListener("click", () => closeProfileMenu());

  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "Supplier");
    wrap.querySelector("#vdAvatar").textContent = (name[0] || "S").toUpperCase();
    wrap.querySelector("#vdName").textContent = name;
    wrap.querySelector("#vdEmail").textContent = user.email || "";
    wrap.querySelector("#vdWho").innerHTML =
      `<strong>${escapeHtml(name)}</strong>${escapeHtml(user.email || "")}`;
  });
}

/* ---------- 3. Esc: drawer, then menu, then the open modal ---------- */

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (isDrawerOpen()) {
    setDrawer(false);
    hamburger?.focus();
    return;
  }
  closeProfileMenu();
  const open = [...document.querySelectorAll(".bf-modal-overlay.bf-open")].pop();
  open?.querySelector(".bf-modal-close")?.click();
});

/* ---------- 4. Consistent loading / empty / error states ----------
   The pages print one-line message cards into their lists. Tag them
   so vendor-ui.css draws every state the same way. Only CSS classes
   are added; the page's own text stays. Also:
   - [data-vd-fill] values start as a shimmer and settle once the page
     writes a value; if the page's list shows an error instead, they
     show "—" rather than shimmering forever.
   - A "Loading …" counter above a list that failed is hidden. */

const STATE_RULES = [
  // An optional leading emoji (❌ 📦 🎉 …) is allowed before the words.
  { cls: "bf-vd-ui-state-error",   test: /^(\p{Extended_Pictographic}\uFE0F?\s*)?(unable to load|couldn'?t load|failed to load|error loading)/iu },
  { cls: "bf-vd-ui-state-loading", test: /^loading\b/i },
  { cls: "bf-vd-ui-state-empty",   test: /^(\p{Extended_Pictographic}\uFE0F?\s*)?(no |nothing |you haven't|0 results)/iu }
];
const STATE_CLASSES = ["bf-vd-ui-state", "bf-vd-ui-own-icon", ...STATE_RULES.map((r) => r.cls)];

function classify(card) {
  if (card.querySelector(".bf-state, input, select, textarea, img, .bf-card, button + button")) return null;
  const text = card.textContent.replace(/\s+/g, " ").trim();
  if (!text || text.length > 160) return null;
  const rule = STATE_RULES.find((r) => r.test.test(text));
  return rule ? rule.cls : null;
}

function polishList(list) {
  const kids = [...list.children];
  const only = kids.length === 1 && kids[0].classList.contains("bf-card") ? kids[0] : null;
  const cls = only ? classify(only) : null;

  kids.forEach((c) => { if (c !== only || !cls) c.classList.remove(...STATE_CLASSES); });
  if (only && cls && !only.classList.contains(cls)) {
    only.classList.remove(...STATE_CLASSES);
    only.classList.add("bf-vd-ui-state", cls);
  }
  if (only && cls) {
    const first = only.textContent.trim().codePointAt(0) || 0;
    only.classList.toggle("bf-vd-ui-own-icon", first > 0x2000);
  }

  let label = list.previousElementSibling;
  if (label && label.classList.contains("bf-vd-count-row")) label = label.querySelector(".bf-vd-count");
  if (label && !label.matches(".bf-card, form")) {
    const stale = cls === "bf-vd-ui-state-error" && /^loading\b/i.test(label.textContent.trim());
    label.classList.toggle("bf-vd-ui-stale", stale);
  }

  if (cls === "bf-vd-ui-state-error") {
    document.querySelectorAll("[data-vd-fill].bf-skeleton").forEach((el) => {
      if (!el.textContent.trim()) el.textContent = "—";
    });
  }
}

function settleFills() {
  document.querySelectorAll("[data-vd-fill].bf-skeleton").forEach((el) => {
    if (el.textContent.trim()) el.classList.remove("bf-skeleton");
  });
}

function watchStates() {
  const content = document.querySelector(".bf-admin-content");
  if (!content) return;
  let queued = false;
  const run = () => {
    queued = false;
    content.querySelectorAll("[id]").forEach((el) => {
      if ((el.children.length === 1 && el.firstElementChild.classList.contains("bf-card")) ||
          el.querySelector(":scope > .bf-vd-ui-state")) polishList(el);
    });
    settleFills();
  };
  new MutationObserver(() => {
    if (!queued) { queued = true; requestAnimationFrame(run); }
  }).observe(content, { childList: true, subtree: true, characterData: true });
  run();
}

setUpDrawer();
setUpProfileMenu();
watchStates();
