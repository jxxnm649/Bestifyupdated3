/* Super Admin — Dashboard (Phase A preview, no Firebase data) */

import {
  initSuperAdminPage, stateBlock, escapeHtml, formatINR, formatDateTime,
  roleBadge, roleMeta
} from "./shell.js";

import {
  FINANCE_SUMMARY, STAFF, AUDIT_LOG, ATTENTION_ITEMS, LAUNCH_CHECKLIST, ROLES
} from "./preview-data.js";

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>Dashboard</h1>
        <p>Money waiting on you, who's on the team, and what changed recently across Bestify.</p>
      </div>
    </div>`;
}

function kpis() {
  const activeStaff = STAFF.filter((s) => s.status === "active").length;
  const pendingCount = 3;
  const cards = [
    { icon: "🧾", label: `Sales, ${FINANCE_SUMMARY.periodLabel.toLowerCase()}`, value: formatINR(FINANCE_SUMMARY.gmv), foot: `${FINANCE_SUMMARY.ordersCount} orders` },
    { icon: "🏷️", label: "Bestify commission", value: formatINR(FINANCE_SUMMARY.platformCommission), foot: "From vendor sales" },
    { icon: "💸", label: "Withdrawals waiting", value: formatINR(FINANCE_SUMMARY.pendingWithdrawals), foot: `${pendingCount} requests` },
    { icon: "🧑‍💼", label: "Active staff", value: String(activeStaff), foot: `${STAFF.length} accounts in total` }
  ];
  return `
    <div class="bf-admin-metrics">
      ${cards.map((c) => `
        <div class="bf-card bf-admin-metric-card">
          <span class="bf-admin-metric-icon" aria-hidden="true">${c.icon}</span>
          <span class="bf-admin-metric-label">${escapeHtml(c.label)}</span>
          <span class="bf-sa-kpi-value">${escapeHtml(c.value)}</span>
          <span class="bf-sa-kpi-foot">${escapeHtml(c.foot)}</span>
        </div>`).join("")}
    </div>`;
}

function attention() {
  return `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head"><h2>Needs your attention</h2></div>
      <div class="bf-card">
        <ul class="bf-sa-list">
          ${ATTENTION_ITEMS.map((a) => `
            <li>
              <a class="bf-sa-list-row" href="${escapeHtml(a.href)}">
                <span class="bf-sa-list-icon" aria-hidden="true">${a.icon}</span>
                <span class="bf-sa-list-body">
                  <p class="bf-sa-list-title">${escapeHtml(a.title)}</p>
                  <p class="bf-sa-list-detail">${escapeHtml(a.detail)}</p>
                </span>
              </a>
            </li>`).join("")}
        </ul>
      </div>
    </section>`;
}

function activity() {
  const recent = AUDIT_LOG.slice(0, 5);
  return `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head">
        <h2>Recent staff activity</h2>
        <a href="audit-log.html">Open audit log</a>
      </div>
      <div class="bf-card">
        <ul class="bf-sa-list">
          ${recent.map((e) => `
            <li>
              <div class="bf-sa-list-row">
                <span class="bf-admin-avatar" aria-hidden="true" style="width:30px;height:30px;font-size:12px;">${escapeHtml(e.actor[0])}</span>
                <span class="bf-sa-list-body">
                  <p class="bf-sa-list-title">${escapeHtml(e.actor)} <span class="bf-sa-muted" style="font-weight:400;">${escapeHtml(e.action.toLowerCase())}</span></p>
                  <p class="bf-sa-list-detail">${escapeHtml(e.target)}</p>
                </span>
                <span class="bf-sa-list-meta">${escapeHtml(formatDateTime(e.at))}</span>
              </div>
            </li>`).join("")}
        </ul>
      </div>
    </section>`;
}

function checklist() {
  return `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head"><h2>Before you go live</h2></div>
      <div class="bf-card">
        <p class="bf-sa-muted" style="margin:0 0 4px;">Setup steps from STEP 0 and STEP 1 that still need doing on your Firebase project.</p>
        <ul class="bf-sa-list">
          ${LAUNCH_CHECKLIST.map((c) => `
            <li>
              <div class="bf-sa-list-row">
                <span class="bf-sa-check" aria-hidden="true"></span>
                <span class="bf-sa-list-body">
                  <p class="bf-sa-list-title">${escapeHtml(c.title)}</p>
                  <p class="bf-sa-list-detail">${escapeHtml(c.detail)}</p>
                </span>
                <span class="bf-badge bf-badge-neutral">Not verified</span>
              </div>
            </li>`).join("")}
        </ul>
      </div>
    </section>`;
}

function team() {
  const counts = ROLES.map((r) => ({ ...r, n: STAFF.filter((s) => s.role === r.key).length }));
  const total = counts.reduce((a, c) => a + c.n, 0) || 1;
  const colors = ["var(--marigold)", "var(--bf-info)", "var(--bf-success)", "var(--bf-neutral)"];
  return `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head">
        <h2>Team by role</h2>
        <a href="staff.html">Manage staff</a>
      </div>
      <div class="bf-card">
        <div class="bf-sa-strip" role="img" aria-label="${counts.map((c) => `${c.n} ${c.label}`).join(", ")}">
          ${counts.map((c) => `<span style="width:${(c.n / total) * 100}%"></span>`).join("")}
        </div>
        <div class="bf-sa-strip-legend">
          ${counts.map((c, i) => `<span><i class="bf-sa-dot" style="background:${colors[i]}"></i>${c.n} ${escapeHtml(c.label)}</span>`).join("")}
        </div>
        <ul class="bf-sa-list" style="margin-top:10px;">
          ${STAFF.filter((s) => s.role === "superAdmin" || s.role === "admin").map((s) => `
            <li>
              <div class="bf-sa-list-row">
                <span class="bf-sa-list-body">
                  <p class="bf-sa-list-title">${escapeHtml(s.name)}</p>
                  <p class="bf-sa-list-detail">${escapeHtml(roleMeta(s.role).label)}, last active ${escapeHtml(formatDateTime(s.lastActive))}</p>
                </span>
                ${roleBadge(s.role)}
              </div>
            </li>`).join("")}
        </ul>
      </div>
    </section>`;
}

initSuperAdminPage({
  key: "dashboard",
  title: "Dashboard",
  render(ctx) {

    if (ctx.state === "loading") {
      ctx.el.innerHTML = head() + stateBlock("loading");
      return;
    }
    if (ctx.state === "error") {
      ctx.el.innerHTML = head() + stateBlock("error", { actionLabel: "Try again", actionId: "saRetry" });
      document.getElementById("saRetry").addEventListener("click", () => ctx.setState("data"));
      return;
    }
    if (ctx.state === "empty") {
      ctx.el.innerHTML = head() + stateBlock("empty", {
        title: "No store activity yet",
        text: "Once orders, staff and payouts start coming in, they'll show up here.",
        actionLabel: "Add your first staff member",
        actionId: "saEmptyAction"
      });
      document.getElementById("saEmptyAction").addEventListener("click", () => { window.location.href = "staff.html"; });
      return;
    }

    ctx.el.innerHTML = `
      ${head()}
      ${kpis()}
      <div class="bf-sa-grid-2">
        <div>${attention()}${activity()}</div>
        <div>${checklist()}${team()}</div>
      </div>`;
  }
});
