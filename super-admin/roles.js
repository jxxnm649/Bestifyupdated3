/* Super Admin — Roles & Permissions (Phase A preview, no Firebase writes) */

import { initSuperAdminPage, stateBlock, escapeHtml, phaseB } from "./shell.js";

import {
  ROLES, MATRIX_ROLES, MODULES, PERMISSIONS, ACCESS_LEVELS, STAFF
} from "./preview-data.js";

const ORDER = ACCESS_LEVELS.map((l) => l.key);

// Working copy the user can click through. Starts equal to the
// preview defaults; nothing is saved anywhere.
let draft = structuredClone(PERMISSIONS);
let focusRole = null;

function levelMeta(key) {
  return ACCESS_LEVELS.find((l) => l.key === key) || ACCESS_LEVELS[0];
}

function changedCount() {
  let n = 0;
  MODULES.forEach((m) => MATRIX_ROLES.forEach((r) => {
    if (draft[m.key][r.key] !== PERMISSIONS[m.key][r.key]) n++;
  }));
  return n;
}

function head() {
  return `
    <div class="bf-sa-page-head">
      <div>
        <h1>Roles &amp; Permissions</h1>
        <p>What each role can do in every part of Bestify. Tap a cell to try a different access level; tap a role name to focus on it.</p>
      </div>
    </div>`;
}

function roleCards() {
  return `
    <div class="bf-admin-metrics" style="margin-bottom:18px;">
      ${ROLES.map((r) => `
        <div class="bf-card bf-admin-metric-card">
          <span><span class="bf-badge ${r.badge}">${escapeHtml(r.label)}</span></span>
          <span class="bf-sa-muted">${escapeHtml(r.summary)}</span>
          <span class="bf-sa-kpi-foot">${STAFF.filter((s) => s.role === r.key).length} people</span>
        </div>`).join("")}
    </div>
    <p class="bf-sa-muted" style="margin:0 0 14px;">Vendors aren't staff: a vendor is a customer whose shop you've approved. Their column is shown so you can compare.</p>`;
}

function legend() {
  return `
    <div class="bf-sa-legend" aria-label="Access levels">
      ${ACCESS_LEVELS.map((l) => `<span><span class="bf-sa-level" data-level="${l.key}">${escapeHtml(l.short)}</span> ${escapeHtml(l.label)}</span>`).join("")}
    </div>`;
}

function matrix() {
  return `
    <div class="bf-sa-matrix-wrap">
      <table class="bf-sa-matrix">
        <caption class="bf-sr-only">Access level for each role in each module</caption>
        <thead>
          <tr>
            <th scope="col">Module</th>
            ${MATRIX_ROLES.map((r) => `
              <th scope="col" class="${focusRole === r.key ? "bf-sa-col-on" : ""}">
                <button type="button" data-focus-role="${r.key}" aria-pressed="${focusRole === r.key}">${escapeHtml(r.label)}</button>
              </th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${MODULES.map((m) => {
            const dim = focusRole && draft[m.key][focusRole] === "none";
            return `
              <tr class="${dim ? "bf-sa-row-dim" : ""}">
                <th scope="row">${escapeHtml(m.label)}<small>${escapeHtml(m.note)}</small></th>
                ${MATRIX_ROLES.map((r) => {
                  const level = draft[m.key][r.key];
                  const changed = level !== PERMISSIONS[m.key][r.key];
                  const locked = r.key === "superAdmin";
                  const meta = levelMeta(level);
                  return `
                    <td class="${focusRole === r.key ? "bf-sa-col-on" : ""}">
                      <button type="button"
                        class="bf-sa-level${changed ? " bf-sa-level-changed" : ""}"
                        data-level="${level}" data-cell="${m.key}:${r.key}"
                        ${locked ? "disabled" : ""}
                        title="${escapeHtml(locked ? "Super Admin always has full control" : `${r.label}: ${meta.label}. Tap to change.`)}"
                        aria-label="${escapeHtml(`${m.label}, ${r.label}: ${meta.label}`)}">
                        ${escapeHtml(meta.short)}
                      </button>
                    </td>`;
                }).join("")}
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function unsavedBar() {
  const n = changedCount();
  if (!n) return "";
  return `
    <div class="bf-sa-unsaved" role="status">
      <span>${n} change${n === 1 ? "" : "s"} not saved. This is a preview, so they'll be lost if you leave.</span>
      <span style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="bf-btn bf-btn-ghost bf-btn-sm" id="saResetMatrix">Undo changes</button>
        <button type="button" class="bf-btn bf-btn-primary bf-btn-sm" id="saSaveMatrix">Save permissions</button>
      </span>
    </div>`;
}

initSuperAdminPage({
  key: "roles",
  title: "Roles & Permissions",
  render(ctx) {

    if (ctx.state === "loading") {
      ctx.el.innerHTML = head() + stateBlock("loading");
      return;
    }
    if (ctx.state === "error") {
      ctx.el.innerHTML = head() + stateBlock("error", {
        title: "Couldn't load permissions",
        text: "The permission settings didn't load. Try again in a moment.",
        actionLabel: "Try again", actionId: "saRetry"
      });
      document.getElementById("saRetry").addEventListener("click", () => ctx.setState("data"));
      return;
    }
    if (ctx.state === "empty") {
      ctx.el.innerHTML = head() + stateBlock("empty", {
        title: "No roles set up",
        text: "Roles appear here once the role system is switched on for your store in Phase B."
      });
      return;
    }

    const draw = () => {
      document.getElementById("saMatrixArea").innerHTML = legend() + matrix() + unsavedBar();
      document.getElementById("saResetMatrix")?.addEventListener("click", () => {
        draft = structuredClone(PERMISSIONS);
        draw();
      });
      document.getElementById("saSaveMatrix")?.addEventListener("click", phaseB);
    };

    ctx.el.innerHTML = `${head()}${roleCards()}<div id="saMatrixArea"></div>`;
    draw();

    document.getElementById("saMatrixArea").addEventListener("click", (e) => {
      const focusBtn = e.target.closest("[data-focus-role]");
      if (focusBtn) {
        focusRole = focusRole === focusBtn.dataset.focusRole ? null : focusBtn.dataset.focusRole;
        draw();
        return;
      }
      const cell = e.target.closest("[data-cell]");
      if (cell && !cell.disabled) {
        const [mod, role] = cell.dataset.cell.split(":");
        const next = ORDER[(ORDER.indexOf(draft[mod][role]) + 1) % ORDER.length];
        draft[mod][role] = next;
        draw();
        document.querySelector(`[data-cell="${mod}:${role}"]`)?.focus();
      }
    });
  }
});
