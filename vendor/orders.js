import { db } from "../firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { showToast } from "../design-system.js";
import { guardVendorPage, wireLogout } from "./vendor-common.js";

wireLogout(document.getElementById("logoutBtn"));

const ordersList = document.getElementById("ordersList");
const orderCount = document.getElementById("orderCount");
const orderSearch = document.getElementById("orderSearch");
const orderStatusFilter = document.getElementById("orderStatusFilter");

// A vendor moves its OWN sub-order forward one step at a time. These
// transitions mirror firestore.rules exactly — anything else is
// rejected server-side, not just hidden here.
const VENDOR_ALLOWED_NEXT_STATUS = {
  "PLACED": "CONFIRMED",
  "CONFIRMED": "PROCESSING",
  "PROCESSING": "PACKED",
  "PACKED": "SHIPPED",
  "SHIPPED": "DELIVERED"
};

let allOrders = [];
let currentVendorId = null;

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function formatDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// A3: readable label for the pill ("SHIPPED" → "Shipped"). Display only;
// the stored status and the allowed-next-status logic are unchanged.
function statusLabel(status) {
  const s = String(status || "PLACED");
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function statusPillClass(status) {
  if (status === "CANCELLED") return "bf-status-danger";
  if (status === "DELIVERED") return "bf-status-success";
  return "bf-status-pending";
}

async function loadOrders() {

  try {

    const snapshot = await getDocs(
      query(collection(db, "subOrders"), where("vendorId", "==", currentVendorId))
    );

    allOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    renderOrders();

  } catch (error) {
    console.error("Vendor orders load error:", error);
    ordersList.innerHTML = `<div class="bf-card" style="padding:20px;">❌ Unable to load orders.</div>`;
  }

}

function getFiltered() {

  const term = orderSearch.value.trim().toLowerCase();
  const statusFilter = orderStatusFilter.value;

  return allOrders.filter((order) => {
    const name = (order.customerName || "").toLowerCase();
    // A3: the card shows the sub-order number, so search matches it too.
    const orderNo = String(order.subOrderNumber || order.masterOrderNumber || "").toLowerCase();
    const matchesTerm = !term || name.includes(term) || order.id.toLowerCase().includes(term) || orderNo.includes(term);
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesTerm && matchesStatus;
  });

}

function renderOrders() {

  const filtered = getFiltered();

  orderCount.textContent = `Your Orders: ${allOrders.length}`;

  if (!filtered.length) {
    ordersList.innerHTML = `<div class="bf-card" style="padding:20px;">No orders found.</div>`;
    return;
  }

  ordersList.innerHTML = filtered.map((order) => {

    // A sub-order document already contains only this vendor's lines —
    // no client-side filtering needed, and no other vendor's data was
    // ever sent to this browser.
    const myItems = order.products || [];

    // A3: presentation only — same fields as before, laid out as a card.
    const itemsHtml = myItems.map(p => `
      <li class="bf-vd-item">
        ${p.productImage
          ? `<img src="${escapeHtml(p.productImage)}" alt="" class="bf-vd-item-img">`
          : `<span class="bf-vd-item-img bf-vd-item-img-empty" aria-hidden="true">📦</span>`}
        <span class="bf-vd-item-main">
          <span class="bf-vd-item-name">${escapeHtml(p.productName || "Product")}</span>
          <span class="bf-vd-item-sub">Qty ${escapeHtml(String(p.quantity || 1))} × ₹${escapeHtml(String(p.unitPrice ?? 0))}</span>
        </span>
        <span class="bf-vd-amount">₹${escapeHtml(String((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1)))}</span>
      </li>
    `).join("");

    const nextStatus = VENDOR_ALLOWED_NEXT_STATUS[order.status];
    const orderNo = order.subOrderNumber || order.id.slice(0, 8).toUpperCase();
    const where = order.deliveryMethod === "pickup"
      ? "Store pickup"
      : [order.address, order.pincode].filter(Boolean).join(" · ");

    return `
      <article class="bf-card bf-vd-order-card">

        <header class="bf-vd-order-head">
          <div class="bf-vd-order-main">
            <div class="bf-vd-order-no">#${escapeHtml(String(orderNo))}</div>
            <div class="bf-vd-order-sub">${formatDate(order.createdAt)}</div>
          </div>
          <span class="bf-status-pill ${statusPillClass(order.status)}">${escapeHtml(statusLabel(order.status))}</span>
        </header>

        <div class="bf-vd-order-customer">
          <span>👤 ${escapeHtml(order.customerName || "Customer")}</span>
          ${order.mobile ? `<a href="tel:${escapeHtml(order.mobile)}">📞 ${escapeHtml(order.mobile)}</a>` : ""}
          ${where ? `<span class="bf-vd-order-where">📍 ${escapeHtml(where)}</span>` : ""}
        </div>

        ${myItems.length
          ? `<ul class="bf-vd-items">${itemsHtml}</ul>`
          : `<p class="bf-vd-muted" style="margin:10px 0 0;">No items from your shop in this order.</p>`}

        <footer class="bf-vd-order-foot">
          <span class="bf-vd-muted">Order ₹${escapeHtml(String(order.itemsTotal ?? 0))} − ${escapeHtml(String(order.commissionRate ?? 0))}% commission</span>
          <b class="bf-vd-good">You earn ₹${escapeHtml(String(order.vendorPayable ?? 0))}</b>
        </footer>

        ${nextStatus ? `
          <button
            type="button"
            class="bf-btn bf-btn-primary bf-btn-sm advance-status-btn"
            data-id="${escapeHtml(order.id)}"
            data-next="${nextStatus}">
            Mark as ${statusLabel(nextStatus)}
          </button>
        ` : ""}

      </article>
    `;

  }).join("");

}

orderSearch.addEventListener("input", renderOrders);
orderStatusFilter.addEventListener("change", renderOrders);

ordersList.addEventListener("click", async (e) => {

  const btn = e.target.closest(".advance-status-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  const nextStatus = btn.dataset.next;

  btn.disabled = true;
  btn.textContent = "Updating...";

  try {

    // Only status / statusHistory / updatedAt are writable by a vendor
    // (firestore.rules). Financial fields can't be touched from here.
    await updateDoc(doc(db, "subOrders", id), {
      status: nextStatus,
      statusHistory: arrayUnion({
        status: nextStatus,
        at: new Date(),
        by: "vendor",
        actorId: currentVendorId
      }),
      updatedAt: new Date()
    });

    const idx = allOrders.findIndex(o => o.id === id);
    if (idx !== -1) allOrders[idx].status = nextStatus;

    renderOrders();
    showToast(`Order marked as ${statusLabel(nextStatus)}`, "success");

  } catch (error) {
    console.error("Order status update error:", error);
    showToast(error.message || "Failed to update order.", "danger");
    btn.disabled = false;
    btn.textContent = `Mark as ${statusLabel(nextStatus)}`;
  }

});

guardVendorPage((user) => {
  currentVendorId = user.uid;
  loadOrders();
});
