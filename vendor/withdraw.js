import { db } from "../firebase.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-functions.js";

import { showToast } from "../design-system.js";
import { guardVendorPage, wireLogout } from "./vendor-common.js";

wireLogout(document.getElementById("logoutBtn"));

const functions = getFunctions();
const requestWithdrawal = httpsCallable(functions, "requestWithdrawal");

const currentBalanceEl = document.getElementById("currentBalance");
const withdrawForm = document.getElementById("withdrawForm");
const wdSubmitBtn = document.getElementById("wdSubmitBtn");
const wdMethod = document.getElementById("wdMethod");
const wdUpiFields = document.getElementById("wdUpiFields");
const wdBankFields = document.getElementById("wdBankFields");
const wdHistory = document.getElementById("wdHistory");

let currentVendorId = null;
// A3: kept only to warn before submitting more than the balance shown.
// The Cloud Function still checks the real balance on the server.
let shownBalance = null;

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

// A3: status shown as the portal's standard pill ("approved" → "Approved").
function statusPill(status) {
  const s = String(status || "Pending");
  const label = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const cls = label === "Approved" ? "bf-status-success" : label === "Rejected" ? "bf-status-danger" : "bf-status-pending";
  return `<span class="bf-status-pill ${cls}">${escapeHtml(label)}</span>`;
}

// A3: inline validation, shown under each field before anything is sent.
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const err = document.getElementById(inputId + "Err");
  if (input) input.classList.toggle("bf-input-error", !!message);
  if (err) {
    err.textContent = message || "";
    err.classList.toggle("bf-hidden", !message);
  }
}

function validateWithdrawForm(amount, method) {
  const errors = {};
  if (!Number.isFinite(amount) || amount <= 0) errors.wdAmount = "Enter an amount greater than ₹0.";
  else if (shownBalance !== null && amount > shownBalance) errors.wdAmount = `You can withdraw up to ₹${shownBalance.toLocaleString("en-IN")}.`;
  if (method === "upi") {
    const upi = document.getElementById("wdUpiId").value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) errors.wdUpiId = "Enter a UPI ID like name@okaxis.";
  } else {
    if (document.getElementById("wdBankName").value.trim().length < 2) errors.wdBankName = "Enter the account holder's name.";
    if (!/^\d{9,18}$/.test(document.getElementById("wdBankAccount").value.trim())) errors.wdBankAccount = "Account number should be 9–18 digits.";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(document.getElementById("wdBankIFSC").value.trim().toUpperCase())) errors.wdBankIFSC = "Enter an 11-character IFSC, e.g. SBIN0001234.";
  }
  ["wdAmount", "wdUpiId", "wdBankName", "wdBankAccount", "wdBankIFSC"].forEach((id) => setFieldError(id, errors[id]));
  const first = Object.keys(errors)[0];
  if (first) document.getElementById(first)?.focus();
  return !first;
}

wdMethod.addEventListener("change", () => {
  const isUpi = wdMethod.value === "upi";
  wdUpiFields.style.display = isUpi ? "block" : "none";
  wdBankFields.style.display = isUpi ? "none" : "block";
});

async function loadHistory(vendorId) {

  try {

    const snapshot = await getDocs(
      query(collection(db, "withdrawalRequests"), where("requesterId", "==", vendorId))
    );

    const requests = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tb - ta;
      });

    if (!requests.length) {
      wdHistory.innerHTML = `<div class="bf-card" style="padding:14px;">No withdrawal requests yet.</div>`;
      return;
    }

    wdHistory.innerHTML = requests.map(r => `
      <div class="bf-card bf-vd-row">
        <div class="bf-vd-row-main">
          <div class="bf-vd-row-title bf-vd-amount">₹${escapeHtml(String(r.amount ?? 0))}</div>
          <div class="bf-vd-row-sub">${r.method === "upi" ? "UPI" : "Bank transfer"} · ${formatDate(r.createdAt)}</div>
          ${r.adminNote ? `<div class="bf-vd-row-sub">📝 ${escapeHtml(r.adminNote)}</div>` : ""}
        </div>
        ${statusPill(r.status)}
      </div>
    `).join("");

  } catch (error) {
    console.error("Withdrawal history load error:", error);
    wdHistory.innerHTML = `<div class="bf-card" style="padding:14px;">❌ Unable to load history.</div>`;
  }

}

withdrawForm.addEventListener("submit", async (e) => {

  e.preventDefault();
  if (!currentVendorId) return;

  const amount = Number(document.getElementById("wdAmount").value);
  const method = wdMethod.value;

  if (!validateWithdrawForm(amount, method)) return;

  const payload = {
    requesterType: "vendor",
    amount,
    method
  };

  if (method === "upi") {
    payload.upiId = document.getElementById("wdUpiId").value.trim();
  } else {
    payload.bankAccountName = document.getElementById("wdBankName").value.trim();
    payload.bankAccountNumber = document.getElementById("wdBankAccount").value.trim();
    payload.bankIFSC = document.getElementById("wdBankIFSC").value.trim();
  }

  wdSubmitBtn.disabled = true;
  wdSubmitBtn.textContent = "Submitting...";

  try {

    const result = await requestWithdrawal(payload);

    // A3: toast instead of a browser alert (same moment, same meaning).
    showToast("Withdrawal request submitted. Bestify will review it soon.", "success");
    withdrawForm.reset();
    wdMethod.dispatchEvent(new Event("change"));

    currentBalanceEl.textContent = `₹${Number(result.data.newBalance || 0).toLocaleString("en-IN")}`;
    shownBalance = Number(result.data.newBalance || 0);
    await loadHistory(currentVendorId);

  } catch (error) {
    console.error("Withdrawal request error:", error);
    const friendly = (error.code === "functions/internal" || error.code === "functions/not-found" || /internal/i.test(error.message || ""))
      ? "Something went wrong on our end. Please try again in a moment, or contact support if this keeps happening."
      : (error.message || "Failed to submit withdrawal request.");
    showToast(friendly, "danger");
  } finally {
    wdSubmitBtn.disabled = false;
    wdSubmitBtn.textContent = "Request Withdrawal";
  }

});

guardVendorPage((user, vendor) => {
  currentVendorId = user.uid;
  currentBalanceEl.textContent = `₹${Number(vendor.walletBalance || 0).toLocaleString("en-IN")}`;
  shownBalance = Number(vendor.walletBalance || 0);
  loadHistory(user.uid);
});
