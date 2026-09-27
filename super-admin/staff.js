/* Super Admin — Staff & Admins (Phase A preview, no Firebase writes) */

import {
  initSuperAdminPage, stateBlock, escapeHtml, formatDateTime, formatDate,
  roleBadge, roleMeta, initials, openSaModal, phaseB
} from "./shell.js";

import { STAFF, ROLES } from "./preview-data.js";

const STATUS = {
  active:    { label: "Active",    badge: "bf-badge-success" },
  suspended: { label: "Suspended", badge: "bf-badge-danger" },
  invited:   { label: "Invite sent", badge: "bf-badge-warning" }
};

const TABS = [
  { key: "all",        label: "All",         match: () => true },
  ...ROLES.map((r) => ({ key: r.key, label: r.label, match: (s) => s.role === r.key })),
  { key: "suspended",  label: "Suspended",   match: (s) => s.status === "suspended" }
];

let activeTab = "all";
let search = "";
let statusFilter = "any";

function statusBadge(status) {
  const s = STATUS[status] || { label: status, badge: "bf-badge-neutral" };
  return `<span class="bf-badge ${s.badge}">${escapeHtml(s.label)}</span>`;
}

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>Staff &amp; Admins</h1>
        <p>Everyone who can sign in to the Admin, Customer Care or Repairs side of Bestify, and what role they have.</p>
      </div>
      <div class="bf-sa-page-actions">
        <button type="button" class="bf-btn bf-btn-primary" id="saAddStaffBtn">+ Add staff</button>
      </div>
    </div>`;
}

function filtered() {
  const tab = TABS.find((t) => t.key === activeTab) || TABS[0];
  const q = search.trim().toLowerCase();
  return STAFF.filter((s) =>
    tab.match(s) &&
    (statusFilter === "any" || s.status === statusFilter) &&
    (!q || [s.name, s.email, s.phone].some((v) => String(v).toLowerCase().includes(q)))
  );
}

function tabsHtml() {
  return `
    <div class="bf-sa-tabs" role="tablist" aria-label="Filter by role">
      ${TABS.map((t) => `
        <button type="button" class="bf-sa-tab" role="tab" data-tab="${t.key}"
                aria-selected="${t.key === activeTab}">
          ${escapeHtml(t.label)} <span class="bf-sa-tab-count">${STAFF.filter(t.match).length}</span>
        </button>`).join("")}
    </div>`;
}

function toolbarHtml() {
  return `
    <div class="bf-sa-toolbar">
      <input type="search" class="bf-input" id="saStaffSearch" placeholder="Search by name, email or phone"
             value="${escapeHtml(search)}" aria-label="Search staff">
      <select class="bf-select" id="saStaffStatus" aria-label="Filter by status">
        <option value="any" ${statusFilter === "any" ? "selected" : ""}>Any status</option>
        <option value="active" ${statusFilter === "active" ? "selected" : ""}>Active</option>
        <option value="invited" ${statusFilter === "invited" ? "selected" : ""}>Invite sent</option>
        <option value="suspended" ${statusFilter === "suspended" ? "selected" : ""}>Suspended</option>
      </select>
    </div>`;
}

function tableHtml(rows) {

  if (!rows.length) {
    return stateBlock("empty", {
      title: "No staff match these filters",
      text: search ? `Nobody matches “${search}”. Try a different name or clear the filters.` : "Try another role or status.",
      actionLabel: "Clear filters",
      actionId: "saClearFilters"
    });
  }

  return `
    <p class="bf-sa-muted" style="margin:0 0 8px;">Showing ${rows.length} of ${STAFF.length}</p>
    <div class="bf-sa-table-wrap">
      <table class="bf-sa-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Last active</th>
            <th scope="col"><span class="bf-sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((s) => `
            <tr>
              <td class="bf-sa-td-full">
                <div class="bf-sa-person">
                  <span class="bf-admin-avatar" aria-hidden="true">${escapeHtml(initials(s.name))}</span>
                  <div>
                    <div class="bf-sa-person-name">${escapeHtml(s.name)}</div>
                    <div class="bf-sa-person-sub">${escapeHtml(s.email)}</div>
                  </div>
                </div>
              </td>
              <td data-label="Role">${roleBadge(s.role)}</td>
              <td data-label="Status">${statusBadge(s.status)}</td>
              <td data-label="Last active" class="bf-sa-muted">${escapeHtml(s.status === "invited" ? "Hasn't signed in" : formatDateTime(s.lastActive))}</td>
              <td class="bf-sa-td-full">
                <div class="bf-sa-row-actions">
                  <button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" data-role-for="${s.id}">Change role</button>
                  ${s.status === "suspended"
                    ? `<button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" data-reactivate="${s.id}">Reactivate</button>`
                    : s.status === "invited"
                      ? `<button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" data-cancel-invite="${s.id}" style="color:var(--bf-danger);">Cancel invite</button>`
                      : `<button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" data-suspend="${s.id}" style="color:var(--bf-danger);">Suspend</button>`}
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Modals ---------- */

function roleOptions(name, selected) {
  return ROLES.map((r) => `
    <label class="bf-sa-role-option">
      <input type="radio" name="${name}" value="${r.key}" ${r.key === selected ? "checked" : ""}>
      <span><strong>${escapeHtml(r.label)}</strong><span>${escapeHtml(r.summary)}</span></span>
    </label>`).join("");
}

function openAddStaff() {
  openSaModal({
    title: "Add staff member",
    body: `
      <p class="bf-sa-muted" style="margin:0 0 8px;">They'll get an email to set up their login. Nothing is sent from this preview.</p>
      <div class="bf-field">
        <label class="bf-label" for="saNewName">Full name</label>
        <input class="bf-input" id="saNewName" autocomplete="off">
        <p class="bf-error-text bf-hidden" id="saNewNameErr">Enter their name.</p>
      </div>
      <div class="bf-field">
        <label class="bf-label" for="saNewEmail">Email</label>
        <input class="bf-input" id="saNewEmail" type="email" autocomplete="off" placeholder="name@example.com">
        <p class="bf-error-text bf-hidden" id="saNewEmailErr">Enter a valid email address.</p>
      </div>
      <div class="bf-field">
        <label class="bf-label" for="saNewPhone">Phone (optional)</label>
        <input class="bf-input" id="saNewPhone" type="tel" autocomplete="off">
      </div>
      <fieldset style="border:none;padding:0;margin:14px 0 0;">
        <legend class="bf-label">Role</legend>
        ${roleOptions("saNewRole", "support")}
      </fieldset>`,
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      {
        label: "Send invite",
        variant: "primary",
        onClick(box) {
          const name = box.querySelector("#saNewName");
          const email = box.querySelector("#saNewEmail");
          const nameOk = name.value.trim().length > 1;
          const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
          box.querySelector("#saNewNameErr").classList.toggle("bf-hidden", nameOk);
          box.querySelector("#saNewEmailErr").classList.toggle("bf-hidden", emailOk);
          name.classList.toggle("bf-input-error", !nameOk);
          email.classList.toggle("bf-input-error", !emailOk);
          if (nameOk && emailOk) phaseB();
          return false; // stay open: nothing was sent
        }
      }
    ]
  });
}

function openChangeRole(staff) {
  const superAdmins = STAFF.filter((s) => s.role === "superAdmin").length;
  const isLastSuper = staff.role === "superAdmin" && superAdmins <= 1;

  openSaModal({
    title: `Change role for ${staff.name}`,
    body: `
      <dl class="bf-sa-kv" style="margin-bottom:14px;">
        <dt>Current role</dt><dd>${roleBadge(staff.role)}</dd>
        <dt>Email</dt><dd>${escapeHtml(staff.email)}</dd>
        <dt>Joined</dt><dd>${escapeHtml(formatDate(staff.joined))}</dd>
      </dl>
      ${isLastSuper ? `
        <div class="bf-alert bf-alert-warning" role="note">
          <span aria-hidden="true">⚠️</span>
          <span>${escapeHtml(staff.name)} is the only Super Admin. Bestify always needs at least one, so make someone else Super Admin first.</span>
        </div>` : ""}
      <fieldset style="border:none;padding:0;margin:0;" ${isLastSuper ? "disabled" : ""}>
        <legend class="bf-label">New role</legend>
        ${roleOptions("saChangeRole", staff.role)}
      </fieldset>
      <p class="bf-sa-hint">Lowering someone's role signs them out on every device.</p>`,
    onMount(box) {
      const hint = box.querySelector(".bf-sa-hint");
      const original = hint.textContent;
      box.addEventListener("change", () => { hint.textContent = original; });
    },
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      {
        label: "Save role",
        variant: "primary",
        disabled: isLastSuper,
        onClick(box) {
          if (isLastSuper) return false;
          const picked = box.querySelector('input[name="saChangeRole"]:checked')?.value;
          if (picked === staff.role) {
            box.querySelector(".bf-sa-hint").textContent = `${staff.name} is already ${roleMeta(picked).label}. Pick a different role to change it.`;
            return false;
          }
          phaseB();
          return false;
        }
      }
    ]
  });
}

function openSuspend(staff) {
  const isSuper = staff.role === "superAdmin";
  openSaModal({
    title: `Suspend ${staff.name}?`,
    body: isSuper ? `
      <div class="bf-alert bf-alert-warning" role="note">
        <span aria-hidden="true">⚠️</span>
        <span>A Super Admin can't be suspended. Change their role first.</span>
      </div>` : `
      <p style="margin:0 0 12px;">They'll be signed out straight away and can't log in until you reactivate them. Their past actions stay in the audit log.</p>
      <div class="bf-field">
        <label class="bf-label" for="saSuspendReason">Reason (only staff with audit access see this)</label>
        <textarea class="bf-textarea" id="saSuspendReason" placeholder="e.g. On leave until October"></textarea>
      </div>`,
    actions: isSuper
      ? [{ label: "Close", variant: "ghost", close: true }]
      : [
          { label: "Keep account", variant: "ghost", close: true },
          { label: "Suspend account", variant: "danger", onClick: () => { phaseB(); return false; } }
        ]
  });
}

function openCancelInvite(staff) {
  openSaModal({
    title: `Cancel ${staff.name}'s invite?`,
    body: `<p style="margin:0;">The invite link sent to ${escapeHtml(staff.email)} will stop working. You can invite them again later.</p>`,
    actions: [
      { label: "Keep invite", variant: "ghost", close: true },
      { label: "Cancel invite", variant: "danger", onClick: () => { phaseB(); return false; } }
    ]
  });
}

function openReactivate(staff) {
  openSaModal({
    title: `Reactivate ${staff.name}?`,
    body: `
      <p style="margin:0 0 8px;">They'll be able to log in again with the same role (${escapeHtml(roleMeta(staff.role).label)}).</p>
      ${staff.suspendedReason ? `<p class="bf-sa-muted" style="margin:0;">Suspended because: ${escapeHtml(staff.suspendedReason)}</p>` : ""}`,
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      { label: "Reactivate account", variant: "primary", onClick: () => { phaseB(); return false; } }
    ]
  });
}

/* ---------- Page ---------- */

initSuperAdminPage({
  key: "staff",
  title: "Staff & Admins",
  render(ctx) {

    if (ctx.state === "loading") {
      ctx.el.innerHTML = head() + stateBlock("loading");
      document.getElementById("saAddStaffBtn").addEventListener("click", openAddStaff);
      return;
    }
    if (ctx.state === "error") {
      ctx.el.innerHTML = head() + stateBlock("error", {
        title: "Couldn't load staff",
        text: "The staff list didn't load. Check your connection and try again.",
        actionLabel: "Try again", actionId: "saRetry"
      });
      document.getElementById("saRetry").addEventListener("click", () => ctx.setState("data"));
      document.getElementById("saAddStaffBtn").addEventListener("click", openAddStaff);
      return;
    }
    if (ctx.state === "empty") {
      ctx.el.innerHTML = head() + stateBlock("empty", {
        title: "No staff yet",
        text: "Only you can sign in to the admin side right now. Add someone to help with orders, chats or repairs.",
        actionLabel: "+ Add staff", actionId: "saEmptyAdd"
      });
      document.getElementById("saEmptyAdd").addEventListener("click", openAddStaff);
      document.getElementById("saAddStaffBtn").addEventListener("click", openAddStaff);
      return;
    }

    const drawList = () => {
      document.getElementById("saStaffTable").innerHTML = tableHtml(filtered());
      document.getElementById("saClearFilters")?.addEventListener("click", () => {
        activeTab = "all"; search = ""; statusFilter = "any";
        ctx.rerender();
      });
    };

    ctx.el.innerHTML = `${head()}${tabsHtml()}${toolbarHtml()}<div id="saStaffTable"></div>`;
    drawList();

    document.getElementById("saAddStaffBtn").addEventListener("click", openAddStaff);

    ctx.el.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      ctx.el.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      drawList();
    }));

    document.getElementById("saStaffSearch").addEventListener("input", (e) => { search = e.target.value; drawList(); });
    document.getElementById("saStaffStatus").addEventListener("change", (e) => { statusFilter = e.target.value; drawList(); });

    document.getElementById("saStaffTable").addEventListener("click", (e) => {
      const byId = (id) => STAFF.find((s) => s.id === id);
      const roleBtn = e.target.closest("[data-role-for]");
      const suspendBtn = e.target.closest("[data-suspend]");
      const reactivateBtn = e.target.closest("[data-reactivate]");
      const cancelInviteBtn = e.target.closest("[data-cancel-invite]");
      if (cancelInviteBtn) openCancelInvite(byId(cancelInviteBtn.dataset.cancelInvite));
      if (roleBtn) openChangeRole(byId(roleBtn.dataset.roleFor));
      if (suspendBtn) openSuspend(byId(suspendBtn.dataset.suspend));
      if (reactivateBtn) openReactivate(byId(reactivateBtn.dataset.reactivate));
    });
  }
});
