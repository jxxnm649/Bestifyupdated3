/* Super Admin — Finance Overview (Phase A preview, no Firebase data) */

import {
  initSuperAdminPage, stateBlock, escapeHtml, formatINR, formatDateTime,
  openSaModal, phaseB
} from "./shell.js";

import {
  FINANCE_SUMMARY, DAILY_SALES, WITHDRAWALS, VENDOR_PAYABLES, CASHBACK_LEDGER, REFUNDS
} from "./preview-data.js";

const STATUS_BADGE = {
  Pending: "bf-badge-warning", Approved: "bf-badge-success", Rejected: "bf-badge-danger",
  Credited: "bf-badge-success", Reversed: "bf-badge-neutral", Processed: "bf-badge-success"
};

const TABS = [
  { key: "withdrawals", label: "Withdrawals",     count: () => WITHDRAWALS.filter((w) => w.status === "Pending").length },
  { key: "payables",    label: "Owed to vendors", count: () => VENDOR_PAYABLES.length },
  { key: "cashback",    label: "Cashback",        count: () => CASHBACK_LEDGER.length },
  { key: "refunds",     label: "Refunds",         count: () => REFUNDS.length }
];

let activeTab = "withdrawals";

function badge(status) {
  return `<span class="bf-badge ${STATUS_BADGE[status] || "bf-badge-neutral"}">${escapeHtml(status)}</span>`;
}

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>Finance Overview</h1>
        <p>Where the money is: sales, what Bestify keeps, what's owed to vendors and customers, and payouts waiting for approval.</p>
      </div>
      <div class="bf-sa-page-actions">
        <button type="button" class="bf-btn bf-btn-ghost" id="saFinanceExport">Download report</button>
      </div>
    </div>`;
}

function kpis() {
  const f = FINANCE_SUMMARY;
  const cards = [
    { icon: "🧾", label: "Sales", value: f.gmv, foot: `${f.ordersCount} orders, ${f.periodLabel.toLowerCase()}` },
    { icon: "🏷️", label: "Bestify commission", value: f.platformCommission, foot: "Kept from vendor sales" },
    { icon: "🏪", label: "Owed to vendors", value: f.vendorPayable, foot: "Not paid out yet" },
    { icon: "👛", label: "Customer wallets", value: f.customerWalletTotal, foot: "Total balance held" },
    { icon: "🎁", label: "Cashback waiting", value: f.cashbackPending, foot: "Credited on delivery" },
    { icon: "↩️", label: "Refunds issued", value: f.refundsIssued, foot: f.periodLabel }
  ];
  return `
    <div class="bf-admin-metrics">
      ${cards.map((c) => `
        <div class="bf-card bf-admin-metric-card">
          <span class="bf-admin-metric-icon" aria-hidden="true">${c.icon}</span>
          <span class="bf-admin-metric-label">${escapeHtml(c.label)}</span>
          <span class="bf-sa-kpi-value">${escapeHtml(formatINR(c.value))}</span>
          <span class="bf-sa-kpi-foot">${escapeHtml(c.foot)}</span>
        </div>`).join("")}
    </div>`;
}

function chart() {
  const max = Math.max(...DAILY_SALES.map((d) => d.amount)) || 1;
  const total = DAILY_SALES.reduce((a, d) => a + d.amount, 0);
  return `
    <section class="bf-sa-section">
      <div class="bf-sa-section-head">
        <h2>Daily sales, last 14 days</h2>
        <span class="bf-sa-amount">${escapeHtml(formatINR(total))}</span>
      </div>
      <div class="bf-card">
        <div class="bf-sa-bars" role="img" aria-label="Daily sales from ${escapeHtml(DAILY_SALES[0].day)} to ${escapeHtml(DAILY_SALES[DAILY_SALES.length - 1].day)}">
          ${DAILY_SALES.map((d) => `
            <div class="bf-sa-bar" title="${escapeHtml(`${d.day}: ${formatINR(d.amount)}`)}">
              <span style="height:${Math.max(4, (d.amount / max) * 100)}%"></span>
              <small>${escapeHtml(d.day.split(" ")[0])}</small>
            </div>`).join("")}
        </div>
        <p class="bf-sa-hint">Today (${escapeHtml(DAILY_SALES[DAILY_SALES.length - 1].day)}) is the dark bar and is still counting.</p>
      </div>
    </section>`;
}

function withdrawalsTable() {
  return `
    <div class="bf-sa-table-wrap">
      <table class="bf-sa-table">
        <thead><tr>
          <th scope="col">Request</th><th scope="col">From</th><th scope="col" class="bf-sa-num">Amount</th>
          <th scope="col">Pay to</th><th scope="col">Status</th><th scope="col"><span class="bf-sr-only">Actions</span></th>
        </tr></thead>
        <tbody>
          ${WITHDRAWALS.map((w) => `
            <tr>
              <td data-label="Request"><span class="bf-sa-cell bf-sa-cell-stack"><span class="bf-sa-amount">${escapeHtml(w.id)}</span><span class="bf-sa-person-sub">${escapeHtml(formatDateTime(w.requestedAt))}</span></span></td>
              <td data-label="From"><span class="bf-sa-cell">${escapeHtml(w.requester)} <span class="bf-badge bf-badge-neutral">${escapeHtml(w.type)}</span></span></td>
              <td data-label="Amount" class="bf-sa-num bf-sa-amount">${escapeHtml(formatINR(w.amount))}</td>
              <td data-label="Pay to" class="bf-sa-muted">${escapeHtml(w.method)}</td>
              <td data-label="Status">${badge(w.status)}</td>
              <td class="bf-sa-td-full">
                ${w.status === "Pending" ? `
                  <div class="bf-sa-row-actions">
                    <button type="button" class="bf-btn bf-btn-primary bf-btn-sm" data-approve="${w.id}">Approve</button>
                    <button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" data-reject="${w.id}">Reject</button>
                  </div>` : ""}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function payablesTable() {
  return `
    <div class="bf-sa-table-wrap">
      <table class="bf-sa-table">
        <thead><tr>
          <th scope="col">Vendor</th><th scope="col" class="bf-sa-num">Orders</th><th scope="col" class="bf-sa-num">Sales</th>
          <th scope="col" class="bf-sa-num">Commission</th><th scope="col" class="bf-sa-num">Paid out</th><th scope="col" class="bf-sa-num">Still owed</th>
        </tr></thead>
        <tbody>
          ${VENDOR_PAYABLES.map((v) => `
            <tr>
              <td data-label="Vendor"><span class="bf-sa-person-name">${escapeHtml(v.vendor)}</span></td>
              <td data-label="Orders" class="bf-sa-num">${v.orders}</td>
              <td data-label="Sales" class="bf-sa-num bf-sa-amount">${escapeHtml(formatINR(v.sales))}</td>
              <td data-label="Commission" class="bf-sa-num"><span class="bf-sa-cell" style="justify-content:flex-end;"><span class="bf-sa-amount">${escapeHtml(formatINR(v.commission))}</span> <span class="bf-sa-muted">(${v.commissionRate}%)</span></span></td>
              <td data-label="Paid out" class="bf-sa-num bf-sa-amount">${escapeHtml(formatINR(v.paid))}</td>
              <td data-label="Still owed" class="bf-sa-num bf-sa-amount">${escapeHtml(formatINR(v.balance))}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function cashbackTable() {
  return `
    <div class="bf-sa-table-wrap">
      <table class="bf-sa-table">
        <thead><tr>
          <th scope="col">Order</th><th scope="col">Customer</th><th scope="col" class="bf-sa-num">Cashback</th>
          <th scope="col">Status</th><th scope="col">Note</th>
        </tr></thead>
        <tbody>
          ${CASHBACK_LEDGER.map((c) => `
            <tr>
              <td data-label="Order"><span class="bf-sa-amount">${escapeHtml(c.order)}</span></td>
              <td data-label="Customer">${escapeHtml(c.customer)}</td>
              <td data-label="Cashback" class="bf-sa-num bf-sa-amount">${escapeHtml(formatINR(c.amount))}</td>
              <td data-label="Status">${badge(c.status)}</td>
              <td data-label="Note" class="bf-sa-muted">${escapeHtml(c.note)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function refundsTable() {
  return `
    <div class="bf-sa-table-wrap">
      <table class="bf-sa-table">
        <thead><tr>
          <th scope="col">Refund</th><th scope="col">Order</th><th scope="col">Customer</th>
          <th scope="col" class="bf-sa-num">Amount</th><th scope="col">Refunded to</th><th scope="col">Status</th>
        </tr></thead>
        <tbody>
          ${REFUNDS.map((r) => `
            <tr>
              <td data-label="Refund"><span class="bf-sa-cell bf-sa-cell-stack"><span class="bf-sa-amount">${escapeHtml(r.id)}</span><span class="bf-sa-person-sub">${escapeHtml(formatDateTime(r.at))}</span></span></td>
              <td data-label="Order"><span class="bf-sa-amount">${escapeHtml(r.order)}</span></td>
              <td data-label="Customer">${escapeHtml(r.customer)}</td>
              <td data-label="Amount" class="bf-sa-num bf-sa-amount">${escapeHtml(formatINR(r.amount))}</td>
              <td data-label="Refunded to">${escapeHtml(r.mode)}</td>
              <td data-label="Status">${badge(r.status)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

const TAB_RENDER = {
  withdrawals: withdrawalsTable,
  payables: payablesTable,
  cashback: cashbackTable,
  refunds: refundsTable
};

function openApprove(w) {
  openSaModal({
    title: `Approve ${formatINR(w.amount)} payout?`,
    body: `
      <dl class="bf-sa-kv">
        <dt>To</dt><dd>${escapeHtml(w.requester)} (${escapeHtml(w.type)})</dd>
        <dt>Pay to</dt><dd>${escapeHtml(w.method)}</dd>
        <dt>Requested</dt><dd>${escapeHtml(formatDateTime(w.requestedAt))}</dd>
        <dt>Request</dt><dd class="bf-sa-amount">${escapeHtml(w.id)}</dd>
      </dl>
      <p class="bf-sa-hint" style="margin-top:14px;">Send the money first, then approve. Approving marks the request paid and keeps the amount off their balance.</p>`,
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      { label: "Approve payout", variant: "primary", onClick: () => { phaseB(); return false; } }
    ]
  });
}

function openReject(w) {
  openSaModal({
    title: `Reject ${w.id}?`,
    body: `
      <p style="margin:0 0 12px;">${escapeHtml(formatINR(w.amount))} goes back to ${escapeHtml(w.requester)}'s balance, and they'll see your reason.</p>
      <div class="bf-field">
        <label class="bf-label" for="saRejectReason">Reason</label>
        <textarea class="bf-textarea" id="saRejectReason" placeholder="e.g. UPI ID doesn't match the account name"></textarea>
        <p class="bf-error-text bf-hidden" id="saRejectErr">Add a reason so they know what to fix.</p>
      </div>`,
    actions: [
      { label: "Cancel", variant: "ghost", close: true },
      {
        label: "Reject request",
        variant: "danger",
        onClick(box) {
          const ok = box.querySelector("#saRejectReason").value.trim().length > 2;
          box.querySelector("#saRejectErr").classList.toggle("bf-hidden", ok);
          if (ok) phaseB();
          return false;
        }
      }
    ]
  });
}

initSuperAdminPage({
  key: "finance",
  title: "Finance Overview",
  render(ctx) {

    if (ctx.state !== "data") {
      ctx.el.innerHTML = head() + (
        ctx.state === "loading" ? stateBlock("loading")
        : ctx.state === "error" ? stateBlock("error", {
            title: "Couldn't load finance data",
            text: "Totals and payouts didn't load. Nothing has changed; try again in a moment.",
            actionLabel: "Try again", actionId: "saRetry"
          })
        : stateBlock("empty", {
            title: "No money movement yet",
            text: "Sales, commissions and payouts will appear here after your first orders."
          })
      );
      document.getElementById("saRetry")?.addEventListener("click", () => ctx.setState("data"));
      document.getElementById("saFinanceExport").addEventListener("click", phaseB);
      return;
    }

    ctx.el.innerHTML = `
      ${head()}
      ${kpis()}
      ${chart()}
      <section class="bf-sa-section">
        <div class="bf-sa-tabs" role="tablist" aria-label="Finance tables">
          ${TABS.map((t) => `
            <button type="button" class="bf-sa-tab" role="tab" data-ftab="${t.key}" aria-selected="${t.key === activeTab}">
              ${escapeHtml(t.label)} <span class="bf-sa-tab-count">${t.count()}</span>
            </button>`).join("")}
        </div>
        <div id="saFinanceTable" role="tabpanel"></div>
      </section>`;

    const drawTab = () => { document.getElementById("saFinanceTable").innerHTML = TAB_RENDER[activeTab](); };
    drawTab();

    document.getElementById("saFinanceExport").addEventListener("click", phaseB);

    ctx.el.querySelectorAll("[data-ftab]").forEach((btn) => btn.addEventListener("click", () => {
      activeTab = btn.dataset.ftab;
      ctx.el.querySelectorAll("[data-ftab]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      drawTab();
    }));

    document.getElementById("saFinanceTable").addEventListener("click", (e) => {
      const find = (id) => WITHDRAWALS.find((w) => w.id === id);
      const a = e.target.closest("[data-approve]");
      const r = e.target.closest("[data-reject]");
      if (a) openApprove(find(a.dataset.approve));
      if (r) openReject(find(r.dataset.reject));
    });
  }
});
