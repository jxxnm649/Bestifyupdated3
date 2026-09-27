/* Super Admin — Platform Settings (Phase A preview, no Firebase writes) */

import { initSuperAdminPage, stateBlock, escapeHtml, phaseB } from "./shell.js";
import { PLATFORM_SETTINGS } from "./preview-data.js";

// Each field: [group, key, label, type, hint, extra]
const FIELDS = {
  store: [
    ["store", "name", "Store name", "text", "Shown on invoices and emails"],
    ["store", "supportPhone", "Support phone", "tel", "Customers call or WhatsApp this number"],
    ["store", "supportEmail", "Support email", "email", ""],
    ["store", "gstin", "GSTIN", "text", "Leave empty if not registered"],
    ["store", "address", "Shop address", "textarea", "Used for store pickup and invoices", { span: true }]
  ],
  orders: [
    ["orders", "minOrderAmount", "Minimum order (₹)", "number", "Orders below this can't be placed", { min: 0 }],
    ["orders", "codMaxAmount", "Largest COD order (₹)", "number", "Above this, customers must pay online", { min: 0 }]
  ],
  cashback: [
    ["cashback", "ratePercent", "Cashback rate (%)", "number", "Share of the order total given back", { min: 0, max: 50 }],
    ["cashback", "maxAmount", "Most cashback per order (₹)", "number", "", { min: 0 }]
  ],
  vendors: [
    ["vendors", "defaultCommission", "Default commission (%)", "number", "Applied to newly approved vendors", { min: 0, max: 50 }],
    ["vendors", "minWithdrawal", "Smallest vendor withdrawal (₹)", "number", "", { min: 0 }]
  ],
  security: [
    ["security", "sessionTimeoutHours", "Sign staff out after (hours)", "number", "Inactive staff sessions end after this", { min: 1, max: 72 }]
  ]
};

const TOGGLES = {
  orders: [
    ["orders", "codEnabled", "Cash on Delivery", "Let customers pay when the order arrives"],
    ["orders", "storePickupEnabled", "Store pickup", "Let customers collect from the Kolavi shop"]
  ],
  cashback: [
    ["cashback", "enabled", "Cashback on orders", "Credited to the wallet after delivery"]
  ],
  vendors: [
    ["vendors", "newProductsNeedApproval", "Review new vendor products", "Vendor listings stay hidden until an admin approves them"]
  ],
  security: [
    ["security", "requireStrongPassword", "Strong passwords for staff", "At least 10 characters with a number"]
  ]
};

const SECTIONS = [
  { key: "store",    title: "Store details" },
  { key: "orders",   title: "Orders & payment" },
  { key: "cashback", title: "Cashback" },
  { key: "vendors",  title: "Vendors" },
  { key: "security", title: "Staff security" }
];

let draft = structuredClone(PLATFORM_SETTINGS);

function isDirty() {
  return JSON.stringify(draft) !== JSON.stringify(PLATFORM_SETTINGS);
}

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>Platform Settings</h1>
        <p>Store-wide rules that apply to every customer, vendor and staff member.</p>
      </div>
    </div>`;
}

function fieldHtml([group, key, label, type, hint, extra = {}]) {
  const id = `sa_${group}_${key}`;
  const value = draft[group][key];
  const attrs = [
    extra.min !== undefined ? `min="${extra.min}"` : "",
    extra.max !== undefined ? `max="${extra.max}"` : ""
  ].join(" ");
  const control = type === "textarea"
    ? `<textarea class="bf-textarea" id="${id}" data-group="${group}" data-key="${key}" style="min-height:72px;">${escapeHtml(value)}</textarea>`
    : `<input class="bf-input" id="${id}" type="${type}" ${attrs} data-group="${group}" data-key="${key}" value="${escapeHtml(value)}"${type === "number" ? ' inputmode="numeric"' : ""}>`;
  return `
    <div class="bf-field${extra.span ? " bf-sa-span-2" : ""}">
      <label class="bf-label" for="${id}">${escapeHtml(label)}</label>
      ${control}
      ${hint ? `<p class="bf-sa-hint">${escapeHtml(hint)}</p>` : ""}
      <p class="bf-error-text bf-hidden" data-err-for="${id}"></p>
    </div>`;
}

function toggleHtml([group, key, label, hint]) {
  const id = `sa_${group}_${key}`;
  return `
    <div class="bf-sa-toggle-row">
      <label for="${id}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(hint)}</span></label>
      <span class="bf-sa-switch">
        <input type="checkbox" role="switch" id="${id}" data-group="${group}" data-key="${key}" ${draft[group][key] ? "checked" : ""}>
        <i aria-hidden="true"></i>
      </span>
    </div>`;
}

function sectionsHtml() {
  return SECTIONS.map((s) => `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head"><h2>${escapeHtml(s.title)}</h2></div>
      <div class="bf-card">
        ${(TOGGLES[s.key] || []).length ? `<div style="margin-bottom:8px;">${TOGGLES[s.key].map(toggleHtml).join("")}</div>` : ""}
        <div class="bf-sa-form-grid">${(FIELDS[s.key] || []).map(fieldHtml).join("")}</div>
      </div>
    </section>`).join("");
}

function saveBar() {
  return `
    <div class="bf-sa-unsaved${isDirty() ? "" : " bf-hidden"}" id="saSettingsBar" role="status" style="position:sticky;bottom:12px;z-index:5;">
      <span>You have unsaved changes. This is a preview, so they aren't stored.</span>
      <span style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" id="saDiscard">Discard</button>
        <button type="button" class="bf-btn bf-btn-primary bf-btn-sm" id="saSaveSettings">Save changes</button>
      </span>
    </div>`;
}

// Text fields that must be filled in / well-formed.
const TEXT_RULES = {
  sa_store_name:         (v) => (v.trim().length >= 2 ? "" : "Enter the store name."),
  sa_store_supportPhone: (v) => (v.replace(/\D/g, "").length >= 10 ? "" : "Enter a 10-digit phone number."),
  sa_store_supportEmail: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email address."),
  sa_store_gstin:        (v) => (!v.trim() || /^[0-9A-Z]{15}$/.test(v.trim().toUpperCase()) ? "" : "A GSTIN has 15 letters and numbers."),
  sa_store_address:      (v) => (v.trim().length >= 10 ? "" : "Enter the full shop address.")
};

function setError(root, input, msg) {
  const err = root.querySelector(`[data-err-for="${input.id}"]`);
  err.textContent = msg;
  err.classList.toggle("bf-hidden", !msg);
  input.classList.toggle("bf-input-error", !!msg);
}

function validate(root) {
  let ok = true;
  Object.entries(TEXT_RULES).forEach(([id, rule]) => {
    const input = root.querySelector(`#${id}`);
    const msg = rule(input.value);
    setError(root, input, msg);
    if (msg) ok = false;
  });
  root.querySelectorAll('input[type="number"]').forEach((input) => {
    const v = Number(input.value);
    const min = input.min === "" ? -Infinity : Number(input.min);
    const max = input.max === "" ? Infinity : Number(input.max);
    let msg = "";
    if (input.value.trim() === "" || !Number.isFinite(v)) msg = "Enter a number.";
    else if (v < min) msg = `Must be ${min} or more.`;
    else if (v > max) msg = `Must be ${max} or less.`;
    setError(root, input, msg);
    if (msg) ok = false;
  });
  if (!ok) root.querySelector(".bf-input-error")?.focus();
  return ok;
}

initSuperAdminPage({
  key: "settings",
  title: "Platform Settings",
  render(ctx) {

    if (ctx.state !== "data") {
      ctx.el.innerHTML = head() + (
        ctx.state === "loading" ? stateBlock("loading")
        : ctx.state === "error" ? stateBlock("error", {
            title: "Couldn't load settings",
            text: "Your settings didn't load, so editing is off to avoid overwriting them. Try again.",
            actionLabel: "Try again", actionId: "saRetry"
          })
        : stateBlock("empty", {
            title: "No settings saved yet",
            text: "Your store is using the default settings. In Phase B you'll be able to change them here."
          })
      );
      document.getElementById("saRetry")?.addEventListener("click", () => ctx.setState("data"));
      return;
    }

    ctx.el.innerHTML = `${head()}<form id="saSettingsForm" novalidate>${sectionsHtml()}${saveBar()}</form>`;

    const form = document.getElementById("saSettingsForm");
    const bar = () => document.getElementById("saSettingsBar").classList.toggle("bf-hidden", !isDirty());

    form.addEventListener("input", (e) => {
      const el = e.target;
      if (!el.dataset.group) return;
      const current = PLATFORM_SETTINGS[el.dataset.group][el.dataset.key];
      draft[el.dataset.group][el.dataset.key] =
        el.type === "checkbox" ? el.checked
        : typeof current === "number" ? (el.value === "" ? "" : Number(el.value))
        : el.value;
      bar();
    });

    form.addEventListener("submit", (e) => e.preventDefault());

    document.getElementById("saDiscard").addEventListener("click", () => {
      draft = structuredClone(PLATFORM_SETTINGS);
      ctx.rerender();
    });

    document.getElementById("saSaveSettings").addEventListener("click", () => {
      if (validate(form)) phaseB();
    });
  }
});
