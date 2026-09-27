/* Super Admin — Audit Log (Phase A preview, read-only sample data) */

import {
  initSuperAdminPage, stateBlock, escapeHtml, formatDateTime,
  roleBadge, openSaModal, phaseB
} from "./shell.js";

import { AUDIT_LOG, AUDIT_MODULES, ROLES } from "./preview-data.js";

const PAGE_SIZE = 8;

let search = "";
let moduleFilter = "all";
let roleFilter = "all";
let period = "all";
let visible = PAGE_SIZE;

// Periods are measured from the newest entry, so the preview reads
// the same whatever day you open it.
const NEWEST = Math.max(...AUDIT_LOG.map((e) => new Date(e.at).getTime()));
const DAY = 24 * 60 * 60 * 1000;

function inPeriod(entry) {
  if (period === "all") return true;
  const age = NEWEST - new Date(entry.at).getTime();
  if (period === "today") return new Date(entry.at).toDateString() === new Date(NEWEST).toDateString();
  if (period === "7d") return age <= 7 * DAY;
  return true;
}

function filtered() {
  const q = search.trim().toLowerCase();
  return AUDIT_LOG.filter((e) =>
    (moduleFilter === "all" || e.module === moduleFilter) &&
    (roleFilter === "all" || e.actorRole === roleFilter) &&
    inPeriod(e) &&
    (!q || [e.actor, e.action, e.target].some((v) => String(v).toLowerCase().includes(q)))
  );
}

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>Audit Log</h1>
        <p>A permanent record of what staff changed, when, and from which device. Entries can't be edited or deleted.</p>
      </div>
      <div class="bf-sa-page-actions">
        <button type="button" class="bf-btn bf-btn-ghost" id="saExportAudit">Download CSV</button>
      </div>
    </div>`;
}

function toolbar() {
  const opt = (value, label, current) => `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label)}</option>`;
  return `
    <div class="bf-sa-toolbar">
      <input type="search" class="bf-input" id="saAuditSearch" placeholder="Search person, action or item"
             value="${escapeHtml(search)}" aria-label="Search audit log">
      <select class="bf-select" id="saAuditModule" aria-label="Filter by module">
        ${opt("all", "All modules", moduleFilter)}
        ${AUDIT_MODULES.map((m) => opt(m, m, moduleFilter)).join("")}
      </select>
      <select class="bf-select" id="saAuditRole" aria-label="Filter by role">
        ${opt("all", "Anyone", roleFilter)}
        ${ROLES.map((r) => opt(r.key, r.label, roleFilter)).join("")}
      </select>
      <select class="bf-select" id="saAuditPeriod" aria-label="Filter by date">
        ${opt("all", "Any time", period)}
        ${opt("today", "Today", period)}
        ${opt("7d", "Last 7 days", period)}
      </select>
    </div>`;
}

function table(rows) {

  if (!rows.length) {
    return stateBlock("empty", {
      title: "No entries match",
      text: "Nothing was logged for these filters. Try a wider date range or another module.",
      actionLabel: "Clear filters", actionId: "saAuditClear"
    });
  }

  const shown = rows.slice(0, visible);

  return `
    <p class="bf-sa-muted" style="margin:0 0 8px;">Showing ${shown.length} of ${rows.length} entries</p>
    <div class="bf-sa-table-wrap">
      <table class="bf-sa-table">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Who</th>
            <th scope="col">Action</th>
            <th scope="col">Module</th>
            <th scope="col">Item</th>
          </tr>
        </thead>
        <tbody>
          ${shown.map((e) => `
            <tr class="bf-sa-row-click" data-entry="${e.id}" tabindex="0" aria-label="${escapeHtml(`${e.action} by ${e.actor}. Open details`)}">
              <td data-label="When" class="bf-sa-muted" style="white-space:nowrap;">${escapeHtml(formatDateTime(e.at))}</td>
              <td data-label="Who">
                <span class="bf-sa-cell"><span class="bf-sa-person-name">${escapeHtml(e.actor)}</span>${roleBadge(e.actorRole)}</span>
              </td>
              <td data-label="Action">${escapeHtml(e.action)}</td>
              <td data-label="Module"><span class="bf-badge bf-badge-neutral">${escapeHtml(e.module)}</span></td>
              <td data-label="Item">${escapeHtml(e.target)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${rows.length > visible ? `
      <div style="text-align:center;margin-top:14px;">
        <button type="button" class="bf-btn bf-btn-ghost" id="saAuditMore">Show ${Math.min(PAGE_SIZE, rows.length - visible)} more</button>
      </div>` : ""}`;
}

function openEntry(entry) {
  openSaModal({
    title: entry.action,
    body: `
      <dl class="bf-sa-kv">
        <dt>When</dt><dd>${escapeHtml(formatDateTime(entry.at))}</dd>
        <dt>Who</dt><dd>${escapeHtml(entry.actor)} ${roleBadge(entry.actorRole)}</dd>
        <dt>Module</dt><dd>${escapeHtml(entry.module)}</dd>
        <dt>Item</dt><dd>${escapeHtml(entry.target)}</dd>
        <dt>Device</dt><dd>${escapeHtml(entry.device)}</dd>
        <dt>Entry ID</dt><dd class="bf-sa-amount">${escapeHtml(entry.id)}</dd>
      </dl>
      <p class="bf-label" style="margin:16px 0 0;">What changed</p>
      <pre class="bf-sa-code">${escapeHtml(JSON.stringify(entry.details, null, 2))}</pre>`,
    actions: [{ label: "Close", variant: "ghost", close: true }]
  });
}

initSuperAdminPage({
  key: "audit",
  title: "Audit Log",
  render(ctx) {

    if (ctx.state !== "data") {
      ctx.el.innerHTML = head() + (
        ctx.state === "loading" ? stateBlock("loading")
        : ctx.state === "error" ? stateBlock("error", {
            title: "Couldn't load the audit log",
            text: "The log didn't load. Your entries are safe; try again in a moment.",
            actionLabel: "Try again", actionId: "saRetry"
          })
        : stateBlock("empty", {
            title: "No activity logged yet",
            text: "When staff change orders, products, money or roles, each change is recorded here."
          })
      );
      document.getElementById("saRetry")?.addEventListener("click", () => ctx.setState("data"));
      document.getElementById("saExportAudit").addEventListener("click", phaseB);
      return;
    }

    ctx.el.innerHTML = `${head()}${toolbar()}<div id="saAuditTable"></div>`;

    const draw = () => {
      document.getElementById("saAuditTable").innerHTML = table(filtered());
      document.getElementById("saAuditMore")?.addEventListener("click", () => { visible += PAGE_SIZE; draw(); });
      document.getElementById("saAuditClear")?.addEventListener("click", () => {
        search = ""; moduleFilter = "all"; roleFilter = "all"; period = "all"; visible = PAGE_SIZE;
        ctx.rerender();
      });
    };
    draw();

    document.getElementById("saExportAudit").addEventListener("click", phaseB);

    const onFilter = (fn) => (e) => { fn(e.target.value); visible = PAGE_SIZE; draw(); };
    document.getElementById("saAuditSearch").addEventListener("input", onFilter((v) => { search = v; }));
    document.getElementById("saAuditModule").addEventListener("change", onFilter((v) => { moduleFilter = v; }));
    document.getElementById("saAuditRole").addEventListener("change", onFilter((v) => { roleFilter = v; }));
    document.getElementById("saAuditPeriod").addEventListener("change", onFilter((v) => { period = v; }));

    const tableEl = document.getElementById("saAuditTable");
    const openFrom = (target) => {
      const row = target.closest("[data-entry]");
      if (row) openEntry(AUDIT_LOG.find((e) => e.id === row.dataset.entry));
    };
    tableEl.addEventListener("click", (e) => openFrom(e.target));
    tableEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFrom(e.target); }
    });
  }
});
