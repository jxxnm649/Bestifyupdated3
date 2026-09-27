/* ============================================================
   Bestify Super Admin — PREVIEW DATA (Phase A, UI only)

   Every sample record shown anywhere in super-admin/ comes from
   this one file. Nothing here is read from or written to Firebase.
   In Phase B each export below is replaced by a real Firestore
   query / Cloud Function call — the page code keeps the same shape.
   ============================================================ */

/* ---------- Roles (keys match functions/roles.js from STEP 1) ---------- */

export const ROLES = [
  {
    key: "superAdmin",
    label: "Super Admin",
    badge: "bf-badge-warning",
    summary: "Owns the platform. Adds and removes staff, sees all money."
  },
  {
    key: "admin",
    label: "Admin",
    badge: "bf-badge-info",
    summary: "Runs the store day to day: orders, products, vendors, payouts."
  },
  {
    key: "support",
    label: "Customer Care",
    badge: "bf-badge-success",
    summary: "Answers customer chats and looks up orders. No money actions."
  },
  {
    key: "technician",
    label: "Technician",
    badge: "bf-badge-neutral",
    summary: "Works on repair jobs assigned to them."
  }
];

/* ---------- Staff & admins ---------- */

export const STAFF = [
  { id: "s1", name: "Shop Owner",      email: "owner@bestifymobile.in",   phone: "98450 11223", role: "superAdmin", status: "active",    lastActive: "2026-09-26T09:42:00", joined: "2025-11-02" },
  { id: "s2", name: "Kiran Patil",     email: "kiran@bestifymobile.in",   phone: "99001 45678", role: "admin",      status: "active",    lastActive: "2026-09-26T08:15:00", joined: "2026-01-18" },
  { id: "s3", name: "Savita Hiremath", email: "savita@bestifymobile.in",  phone: "97411 20981", role: "support",    status: "active",    lastActive: "2026-09-25T19:03:00", joined: "2026-03-07" },
  { id: "s4", name: "Raju Kamble",     email: "raju.k@bestifymobile.in",  phone: "93532 77410", role: "technician", status: "active",    lastActive: "2026-09-26T07:50:00", joined: "2026-02-11" },
  { id: "s5", name: "Anita Desai",     email: "anita@bestifymobile.in",   phone: "90081 33902", role: "support",    status: "suspended", lastActive: "2026-08-30T13:20:00", joined: "2026-04-22", suspendedReason: "On leave until October" },
  { id: "s6", name: "Prakash Naik",    email: "prakash@bestifymobile.in", phone: "88672 90114", role: "technician", status: "invited",   lastActive: null,                  joined: "2026-09-24" },
  { id: "s7", name: "Meghana Kulkarni",email: "meghana@bestifymobile.in", phone: "96633 51207", role: "admin",      status: "active",    lastActive: "2026-09-24T16:40:00", joined: "2026-06-01" }
];

/* ---------- Roles × modules matrix ---------- */

// Access levels, lowest to highest.
export const ACCESS_LEVELS = [
  { key: "none", label: "No access", short: "—" },
  { key: "view", label: "View only", short: "View" },
  { key: "edit", label: "Can edit",  short: "Edit" },
  { key: "full", label: "Full control", short: "Full" }
];

// Columns of the matrix. Vendor is shown for reference — a vendor
// is not a staff role, it's a customer with an approved shop.
export const MATRIX_ROLES = [
  { key: "superAdmin", label: "Super Admin" },
  { key: "admin",      label: "Admin" },
  { key: "support",    label: "Customer Care" },
  { key: "technician", label: "Technician" },
  { key: "vendor",     label: "Vendor" }
];

export const MODULES = [
  { key: "dashboard",     label: "Dashboard",            note: "Store numbers at a glance" },
  { key: "orders",        label: "Orders",               note: "Order list, status changes" },
  { key: "products",      label: "Products",             note: "Listings, stock, approval" },
  { key: "vendors",       label: "Vendors",              note: "Applications, commission" },
  { key: "customers",     label: "Customers",            note: "Profiles, block / unblock" },
  { key: "payments",      label: "Payments & refunds",   note: "Razorpay payments, refunds" },
  { key: "wallets",       label: "Wallets & cashback",   note: "Customer balances, rewards" },
  { key: "withdrawals",   label: "Withdrawals",          note: "Customer & vendor payouts" },
  { key: "repairs",       label: "Repairs",              note: "Repair jobs and status" },
  { key: "support",       label: "Customer chats",       note: "Replies, assignment" },
  { key: "notifications", label: "Notifications",        note: "Send to customers" },
  { key: "reports",       label: "Reports",              note: "Sales and exports" },
  { key: "audit",         label: "Audit log",            note: "Who changed what" },
  { key: "settings",      label: "Platform settings",    note: "Store-wide defaults" },
  { key: "staff",         label: "Staff & roles",        note: "Add staff, change roles" }
];

// PERMISSIONS[moduleKey][roleKey] = access level key
export const PERMISSIONS = {
  dashboard:     { superAdmin: "full", admin: "view", support: "view", technician: "view", vendor: "view" },
  orders:        { superAdmin: "full", admin: "edit", support: "view", technician: "none", vendor: "edit" },
  products:      { superAdmin: "full", admin: "edit", support: "view", technician: "none", vendor: "edit" },
  vendors:       { superAdmin: "full", admin: "edit", support: "none", technician: "none", vendor: "none" },
  customers:     { superAdmin: "full", admin: "edit", support: "view", technician: "none", vendor: "none" },
  payments:      { superAdmin: "full", admin: "view", support: "none", technician: "none", vendor: "none" },
  wallets:       { superAdmin: "full", admin: "edit", support: "none", technician: "none", vendor: "none" },
  withdrawals:   { superAdmin: "full", admin: "edit", support: "none", technician: "none", vendor: "view" },
  repairs:       { superAdmin: "full", admin: "edit", support: "view", technician: "edit", vendor: "none" },
  support:       { superAdmin: "full", admin: "edit", support: "edit", technician: "none", vendor: "none" },
  notifications: { superAdmin: "full", admin: "edit", support: "none", technician: "none", vendor: "none" },
  reports:       { superAdmin: "full", admin: "view", support: "none", technician: "none", vendor: "view" },
  audit:         { superAdmin: "full", admin: "view", support: "none", technician: "none", vendor: "none" },
  settings:      { superAdmin: "full", admin: "none", support: "none", technician: "none", vendor: "none" },
  staff:         { superAdmin: "full", admin: "none", support: "none", technician: "none", vendor: "none" }
};

/* ---------- Audit log ---------- */

export const AUDIT_MODULES = ["Orders", "Products", "Vendors", "Users", "Wallets", "Withdrawals", "Roles", "Settings", "Repairs"];

export const AUDIT_LOG = [
  { id: "a01", at: "2026-09-26T09:40:12", actor: "Shop Owner",      actorRole: "superAdmin", action: "Changed user role",        module: "Roles",       target: "Prakash Naik",           details: { from: "customer", to: "technician" }, device: "Chrome on Android" },
  { id: "a02", at: "2026-09-26T09:12:47", actor: "Kiran Patil",     actorRole: "admin",      action: "Approved withdrawal",      module: "Withdrawals", target: "WD-2026-0412",           details: { amount: 1850, method: "UPI", requester: "Vendor Gokak Mobiles" }, device: "Chrome on Windows" },
  { id: "a03", at: "2026-09-26T08:55:03", actor: "Kiran Patil",     actorRole: "admin",      action: "Updated order status",     module: "Orders",      target: "BEST-2026-000214",       details: { from: "Packed", to: "Shipped" }, device: "Chrome on Windows" },
  { id: "a04", at: "2026-09-26T08:20:31", actor: "Meghana Kulkarni",actorRole: "admin",      action: "Approved vendor product",  module: "Products",    target: "Tempered glass — A15",   details: { vendor: "Kolavi Accessories" }, device: "Safari on iPhone" },
  { id: "a05", at: "2026-09-25T19:02:09", actor: "Savita Hiremath", actorRole: "support",    action: "Replied to customer chat", module: "Users",       target: "Customer Ravi S.",     details: { chatStatus: "Open" }, device: "Chrome on Android" },
  { id: "a06", at: "2026-09-25T17:48:55", actor: "Shop Owner",      actorRole: "superAdmin", action: "Updated cashback settings",module: "Settings",    target: "settings/store",         details: { cashbackRatePercent: { from: 2, to: 3 }, cashbackMaxAmount: { from: 100, to: 150 } }, device: "Chrome on Android" },
  { id: "a07", at: "2026-09-25T16:10:40", actor: "Kiran Patil",     actorRole: "admin",      action: "Blocked user",             module: "Users",       target: "Customer 7f3k…",       details: { reason: "Repeated fake COD orders" }, device: "Chrome on Windows" },
  { id: "a08", at: "2026-09-25T12:31:18", actor: "Raju Kamble",     actorRole: "technician", action: "Updated repair status",    module: "Repairs",     target: "RPR-0098, Redmi Note 12", details: { from: "Diagnosing", to: "Waiting for part" }, device: "Chrome on Android" },
  { id: "a09", at: "2026-09-24T18:05:27", actor: "Meghana Kulkarni",actorRole: "admin",      action: "Adjusted wallet balance",  module: "Wallets",     target: "Customer Pooja M.",    details: { change: 200, reason: "Refund for damaged cover" }, device: "Chrome on Windows" },
  { id: "a10", at: "2026-09-24T11:22:14", actor: "Kiran Patil",     actorRole: "admin",      action: "Approved vendor",          module: "Vendors",     target: "Kolavi Accessories",     details: { commissionRate: 10 }, device: "Chrome on Windows" },
  { id: "a11", at: "2026-09-23T15:47:02", actor: "Shop Owner",      actorRole: "superAdmin", action: "Suspended staff",          module: "Roles",       target: "Anita Desai",            details: { reason: "On leave until October" }, device: "Chrome on Android" },
  { id: "a12", at: "2026-09-22T10:03:36", actor: "Kiran Patil",     actorRole: "admin",      action: "Rejected vendor product",  module: "Products",    target: "Fast charger 65W",       details: { reason: "Photo is blurry" }, device: "Chrome on Windows" }
];

/* ---------- Finance ---------- */

export const FINANCE_SUMMARY = {
  periodLabel: "Last 30 days",
  gmv: 284650,
  ordersCount: 412,
  platformCommission: 9870,
  cashbackPending: 3420,
  customerWalletTotal: 12860,
  vendorPayable: 41235,
  pendingWithdrawals: 7650,
  refundsIssued: 2140
};

// Daily sales for the chart, oldest first (₹).
export const DAILY_SALES = [
  { day: "13 Sep", amount: 7420 },  { day: "14 Sep", amount: 9810 },
  { day: "15 Sep", amount: 6150 },  { day: "16 Sep", amount: 8930 },
  { day: "17 Sep", amount: 11240 }, { day: "18 Sep", amount: 10360 },
  { day: "19 Sep", amount: 12980 }, { day: "20 Sep", amount: 8040 },
  { day: "21 Sep", amount: 9570 },  { day: "22 Sep", amount: 10820 },
  { day: "23 Sep", amount: 13450 }, { day: "24 Sep", amount: 9210 },
  { day: "25 Sep", amount: 11690 }, { day: "26 Sep", amount: 6380 }
];

export const WITHDRAWALS = [
  { id: "WD-2026-0418", requester: "Gokak Mobiles",      type: "Vendor",   amount: 3200, method: "Bank, HDFC ••4412", requestedAt: "2026-09-26T08:02:00", status: "Pending" },
  { id: "WD-2026-0417", requester: "Pooja M.",           type: "Customer", amount: 450,  method: "UPI pooja@okaxis",  requestedAt: "2026-09-25T21:40:00", status: "Pending" },
  { id: "WD-2026-0416", requester: "Kolavi Accessories", type: "Vendor",   amount: 4000, method: "UPI kolavi@ybl",    requestedAt: "2026-09-25T18:11:00", status: "Pending" },
  { id: "WD-2026-0412", requester: "Gokak Mobiles",      type: "Vendor",   amount: 1850, method: "UPI gokakmob@upi",  requestedAt: "2026-09-24T10:30:00", status: "Approved" },
  { id: "WD-2026-0409", requester: "Ravi S.",            type: "Customer", amount: 120,  method: "UPI ravi@paytm",    requestedAt: "2026-09-23T14:05:00", status: "Rejected" }
];

export const VENDOR_PAYABLES = [
  { vendor: "Gokak Mobiles",      orders: 38, sales: 96400, commissionRate: 10, commission: 9640, paid: 62000, balance: 24760 },
  { vendor: "Kolavi Accessories", orders: 21, sales: 22850, commissionRate: 10, commission: 2285, paid: 16000, balance: 4565 },
  { vendor: "Belagavi Gadgets",   orders: 12, sales: 15300, commissionRate: 12, commission: 1836, paid: 1554,  balance: 11910 }
];

export const CASHBACK_LEDGER = [
  { order: "BEST-2026-000214", customer: "Ravi S.",   amount: 45,  status: "Pending",  note: "Credited when delivered" },
  { order: "BEST-2026-000209", customer: "Pooja M.",  amount: 120, status: "Credited", note: "Delivered 24 Sep" },
  { order: "BEST-2026-000201", customer: "Arun B.",   amount: 60,  status: "Pending",  note: "Credited when delivered" },
  { order: "BEST-2026-000188", customer: "Sneha P.",  amount: 90,  status: "Reversed", note: "Order cancelled" }
];

export const REFUNDS = [
  { id: "RF-0031", order: "BEST-2026-000197", customer: "Sneha P.", amount: 899,  mode: "Razorpay", status: "Processed", at: "2026-09-24T12:40:00" },
  { id: "RF-0030", order: "BEST-2026-000190", customer: "Arun B.",  amount: 1241, mode: "Wallet",   status: "Processed", at: "2026-09-22T09:15:00" }
];

/* ---------- Dashboard ---------- */

export const ATTENTION_ITEMS = [
  { icon: "💸", title: "3 withdrawals waiting",       detail: "₹7,650 in total, oldest from last night", href: "finance.html" },
  { icon: "🏪", title: "2 vendor applications",       detail: "Submitted this week, not reviewed yet",   href: "../admin/vendors.html" },
  { icon: "⏸️", title: "1 staff account suspended",   detail: "Anita Desai — review before October",     href: "staff.html" },
  { icon: "📨", title: "1 staff invite not accepted", detail: "Prakash Naik, sent 2 days ago",           href: "staff.html" }
];

// Setup steps that are genuinely still open for this project
// (deployment work from STEP 0 / STEP 1). Not fake statuses —
// each one is simply "not verified" until checked in Phase B.
export const LAUNCH_CHECKLIST = [
  { title: "Deploy Cloud Functions",        detail: "Needed for COD orders, online payment and withdrawals" },
  { title: "Publish STEP 1 Firestore rules", detail: "Locks wallet, role and vendor fields" },
  { title: "Set SUPER_ADMIN_EMAILS",         detail: "In functions/.env, then redeploy functions" },
  { title: "Test one COD and one online order", detail: "From a normal customer account" }
];

/* ---------- Notifications (header bell) ---------- */

export const NOTIFICATIONS = [
  { id: "n1", icon: "💸", text: "Gokak Mobiles requested a ₹3,200 withdrawal", at: "2026-09-26T08:02:00", unread: true },
  { id: "n2", icon: "🛡️", text: "Kiran Patil blocked a customer account",     at: "2026-09-25T16:10:00", unread: true },
  { id: "n3", icon: "🏪", text: "New vendor application: Belagavi Gadgets",    at: "2026-09-25T11:30:00", unread: true },
  { id: "n4", icon: "⚙️", text: "Cashback rate changed from 2% to 3%",         at: "2026-09-25T17:48:00", unread: false }
];

/* ---------- Platform settings ---------- */

export const PLATFORM_SETTINGS = {
  store: {
    name: "Bestify Mobile",
    supportPhone: "98450 11223",
    supportEmail: "support@bestifymobile.in",
    address: "Primary School Gate Opposite, Kolavi, Gokak, Karnataka",
    gstin: ""
  },
  orders: {
    codEnabled: true,
    codMaxAmount: 15000,
    minOrderAmount: 99,
    storePickupEnabled: true
  },
  cashback: {
    enabled: true,
    ratePercent: 3,
    maxAmount: 150
  },
  vendors: {
    defaultCommission: 10,
    newProductsNeedApproval: true,
    minWithdrawal: 500
  },
  security: {
    sessionTimeoutHours: 12,
    requireStrongPassword: true
  }
};

/* ---------- My profile (preview parts only) ---------- */

export const MY_SESSIONS = [
  { device: "Chrome on Android", place: "Gokak, Karnataka", lastActive: "2026-09-26T09:42:00", current: true },
  { device: "Chrome on Windows", place: "Belagavi, Karnataka", lastActive: "2026-09-24T21:10:00", current: false }
];
