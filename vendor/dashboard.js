import { db } from "../firebase.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { guardVendorPage, wireLogout } from "./vendor-common.js";

wireLogout(document.getElementById("logoutBtn"));

/* ---------- A3: presentation helpers (UI only) ---------- */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

function formatDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function toMillis(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

// Same pill colours as vendor/orders.js
function statusPillClass(status) {
  if (status === "CANCELLED") return "bf-status-danger";
  if (status === "DELIVERED") return "bf-status-success";
  return "bf-status-pending";
}

function setValue(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("bf-skeleton");
}

function showState(kind, retry) {
  const box = document.getElementById("dashState");
  if (!box) return;
  if (kind === "error") {
    box.innerHTML = `
      <div class="bf-card">
        <div class="bf-state bf-state-error" role="alert">
          <div class="bf-state-icon" aria-hidden="true">⚠️</div>
          <p class="bf-state-title">Couldn't load your dashboard</p>
          <p class="bf-state-text">Check your internet connection and try again. Nothing in your shop has changed.</p>
          <button type="button" class="bf-btn bf-btn-ghost" id="dashRetryBtn">Try again</button>
        </div>
      </div>`;
    document.getElementById("dashRetryBtn").addEventListener("click", retry);
  } else if (kind === "empty") {
    box.innerHTML = `
      <div class="bf-card">
        <div class="bf-state">
          <div class="bf-state-icon" aria-hidden="true">🏪</div>
          <p class="bf-state-title">Your shop is ready</p>
          <p class="bf-state-text">Add your first product. Once the admin approves it, customers can order it and your sales will show up here.</p>
          <button type="button" class="bf-btn bf-btn-primary" onclick="location.href='products.html'">➕ Add a Product</button>
        </div>
      </div>`;
  } else {
    box.innerHTML = "";
  }
}

function renderRecentOrders(docs) {
  const box = document.getElementById("recentOrders");
  if (!box) return;

  const recent = docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 5);

  if (!recent.length) {
    box.innerHTML = `
      <div class="bf-state" style="padding:24px 8px;">
        <div class="bf-state-icon" aria-hidden="true">🧾</div>
        <p class="bf-state-title">No orders yet</p>
        <p class="bf-state-text">When a customer orders one of your products, it appears here.</p>
      </div>`;
    return;
  }

  box.innerHTML = `
    <ul class="bf-vd-orders">
      ${recent.map((o) => {
        const items = Array.isArray(o.products) ? o.products.length : 0;
        return `
          <li>
            <a class="bf-vd-order" href="orders.html">
              <span class="bf-vd-order-main">
                <span class="bf-vd-order-no">${escapeHtml(o.subOrderNumber || o.masterOrderNumber || `#${o.id.slice(0, 8)}`)}</span>
                <span class="bf-vd-order-sub" style="display:block;">
                  ${escapeHtml(o.customerName || "Customer")} · ${items} item${items === 1 ? "" : "s"} · ${escapeHtml(formatDate(o.createdAt))}
                </span>
              </span>
              <span class="bf-vd-order-side">
                <span class="bf-vd-amount">${escapeHtml(inr(o.total ?? o.itemsTotal))}</span>
                <span class="bf-status-pill ${statusPillClass(o.status)}">${escapeHtml(o.status || "PLACED")}</span>
              </span>
            </a>
          </li>`;
      }).join("")}
    </ul>`;
}

async function loadStats(user, vendor) {

  document.getElementById("shopNameLabel").textContent = vendor.shopName || "Dashboard";
  setValue("statCommissionRate", `${vendor.commissionRate ?? 0}%`);
  setValue("statWalletBalance", inr(vendor.walletBalance));

  showState(null);

  try {

    // Products
    const productsSnap = await getDocs(
      query(collection(db, "products"), where("vendorId", "==", user.uid))
    );
    setValue("statProducts", String(productsSnap.size));

    // This vendor's own sub-orders (one document per vendor per order)
    const ordersSnap = await getDocs(
      query(collection(db, "subOrders"), where("vendorId", "==", user.uid))
    );

    const pending = ordersSnap.docs.filter((d) => {
      const status = d.data().status;
      return !["DELIVERED", "CANCELLED"].includes(status);
    }).length;

    setValue("statPendingOrders", String(pending));

    // Earnings = what the VENDOR keeps (vendorPayable), not the
    // commission Bestify takes. This previously summed commissionAmount,
    // which showed the vendor Bestify's cut as if it were their income.
    let totalEarnings = 0;
    // A3 (display only): order value of the same non-cancelled sub-orders.
    let totalSales = 0;
    ordersSnap.forEach((d) => {
      const s = d.data();
      if (s.status !== "CANCELLED") {
        totalEarnings += Number(s.vendorPayable || 0);
        totalSales += Number(s.total ?? s.itemsTotal ?? 0);
      }
    });

    setValue("statEarnings", inr(totalEarnings));
    setValue("statTotalSales", inr(totalSales));
    setValue("statOrders", String(ordersSnap.size));

    renderRecentOrders(ordersSnap.docs);

    if (productsSnap.size === 0 && ordersSnap.size === 0) showState("empty");

  } catch (error) {
    console.error("Vendor dashboard stats error:", error);
    // A3: show the failure instead of leaving "—" / shimmer forever.
    ["statProducts", "statPendingOrders", "statEarnings", "statTotalSales", "statOrders"].forEach((id) => setValue(id, "—"));
    const box = document.getElementById("recentOrders");
    if (box) box.innerHTML = `<p class="bf-state-text" style="margin:0;padding:12px 0;">Orders couldn't be loaded.</p>`;
    showState("error", () => loadStats(user, vendor));
  }

}

guardVendorPage(loadStats);
