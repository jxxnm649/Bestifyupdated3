import { db } from "../firebase.js";

import {
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { showToast } from "../design-system.js";
import { guardVendorPage, wireLogout } from "./vendor-common.js";

wireLogout(document.getElementById("logoutBtn"));

const form = document.getElementById("profileForm");
const saveBtn = document.getElementById("saveProfileBtn");

let currentVendorId = null;

// A3: inline validation messages (the form uses novalidate so these
// replace the browser's bubbles). Save logic below is unchanged.
const PROFILE_RULES = {
  shopName:       (v) => (v.length >= 2 ? "" : "Enter your shop name."),
  vendorCategory: (v) => (v.length >= 2 ? "" : "Enter what your shop sells."),
  ownerName:      (v) => (v.length >= 2 ? "" : "Enter the owner's name."),
  vendorPhone:    (v) => (v.replace(/\D/g, "").length >= 10 ? "" : "Enter a 10-digit phone number."),
  vendorEmail:    (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address."),
  vendorAddress:  (v) => (v.length >= 10 ? "" : "Enter the full shop address.")
};

function validateProfile() {
  let firstBad = null;
  Object.entries(PROFILE_RULES).forEach(([id, rule]) => {
    const input = document.getElementById(id);
    const msg = rule(input.value.trim());
    const err = form.querySelector(`[data-err-for="${id}"]`);
    input.classList.toggle("bf-input-error", !!msg);
    if (err) { err.textContent = msg; err.classList.toggle("bf-hidden", !msg); }
    if (msg && !firstBad) firstBad = input;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

guardVendorPage((user, vendor) => {

  currentVendorId = user.uid;

  document.getElementById("shopName").value = vendor.shopName || "";
  document.getElementById("ownerName").value = vendor.ownerName || "";
  document.getElementById("vendorPhone").value = vendor.phone || "";
  document.getElementById("vendorEmail").value = vendor.email || "";
  document.getElementById("vendorCategory").value = vendor.category || "";
  document.getElementById("vendorAddress").value = vendor.address || "";

  document.getElementById("commissionRateLabel").textContent = `${vendor.commissionRate ?? 0}%`;
  document.getElementById("statusLabel").textContent = vendor.status || "Active";

  form.removeAttribute("aria-busy"); // A3: fields are filled in — stop the loading look

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  if (!validateProfile()) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {

    // Only shop-detail fields — status & commissionRate stay admin-controlled.
    await updateDoc(doc(db, "vendors", currentVendorId), {
      shopName: document.getElementById("shopName").value.trim(),
      ownerName: document.getElementById("ownerName").value.trim(),
      phone: document.getElementById("vendorPhone").value.trim(),
      email: document.getElementById("vendorEmail").value.trim(),
      category: document.getElementById("vendorCategory").value.trim(),
      address: document.getElementById("vendorAddress").value.trim()
    });

    showToast("Profile updated", "success");

  } catch (error) {
    console.error("Vendor profile save error:", error);
    showToast(error.message || "Failed to update profile.", "danger");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }

});
