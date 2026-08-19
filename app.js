"use strict";

const STORAGE_KEY = "qualityCore.qaActionTracker.v1";
const BACKUP_VERSION = 1;
const SOURCES = ["Internal Audit", "NCR", "Customer Complaint", "Site Feedback", "Supplier NCR", "Management Review", "EQM/ECAS", "ADNOC/CCTC", "Calibration", "Other"];
const STATUSES = ["Open", "In Progress", "Under Review", "On Hold", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];
const FIELDS = ["number", "source", "sourceReference", "description", "correctiveAction", "department", "person", "targetDate", "status", "priority", "lastUpdate", "remarks", "effectiveness", "closureDate"];
const REQUIRED = ["source", "description", "correctiveAction", "department", "person", "targetDate", "status", "priority"];
const CSV_HEADINGS = ["Action Number", "Source", "Source Reference Number", "Action Description", "Required Corrective Action", "Responsible Department", "Responsible Person", "Target Date", "Status", "Priority", "Last Update", "Remarks or Evidence Reference", "Effectiveness Verification", "Closure Date"];
const CSV_REQUIRED_FIELDS = ["source", "description", "correctiveAction", "department", "person", "targetDate"];
const CSV_HEADER_ALIASES = {
  action: "number", actionno: "number", actionnumber: "number", number: "number",
  source: "source", sourcereference: "sourceReference", sourcereferenceno: "sourceReference", sourcereferencenumber: "sourceReference", reference: "sourceReference",
  description: "description", actiondescription: "description",
  correctiveaction: "correctiveAction", requiredaction: "correctiveAction", requiredcorrectiveaction: "correctiveAction",
  department: "department", responsibledepartment: "department",
  owner: "person", person: "person", responsibleperson: "person",
  targetdate: "targetDate", duedate: "targetDate", status: "status", priority: "priority", lastupdate: "lastUpdate", updatedate: "lastUpdate",
  remarks: "remarks", evidence: "remarks", evidencereference: "remarks", remarksorevidencereference: "remarks",
  effectiveness: "effectiveness", effectivenessverification: "effectiveness", closuredate: "closureDate", closeddate: "closureDate"
};
const STATUS_COLORS = { Open: "#4aa3df", "In Progress": "#f4b942", "Under Review": "#9b72cf", "On Hold": "#d77a35", Completed: "#42b883" };
const todayIso = () => new Date().toISOString().slice(0, 10);
const shiftDate = (days) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const currentYear = new Date().getFullYear();
const demo = (sequence, source, description, correctiveAction, department, person, offset, status, priority, extras = {}) => ({ number: `QA-${currentYear}-${String(sequence).padStart(3, "0")}`, source, sourceReference: extras.sourceReference || `DEMO-${String(sequence).padStart(3, "0")}`, description, correctiveAction, department, person, targetDate: shiftDate(offset), status, priority, lastUpdate: todayIso(), remarks: extras.remarks || "Fictional demonstration record.", effectiveness: extras.effectiveness || "", closureDate: status === "Completed" ? shiftDate(offset + 2) : "" });
const DEMO_ACTIONS = [
  demo(1, "Internal Audit", "Document the fictional supplier review workflow.", "Approve and publish a revised review checklist.", "Procurement", "Avery Stone", 25, "In Progress", "High"),
  demo(2, "NCR", "Investigate recurring demo label alignment findings.", "Complete a cause review and verify the setup guide.", "Operations", "Jordan Vale", -18, "Open", "High"),
  demo(3, "Customer Complaint", "Improve response timing for fictional certificate requests.", "Map the response process and set an internal service target.", "Customer Support", "Morgan Reed", 38, "Under Review", "Medium"),
  demo(4, "Site Feedback", "Standardize inspection prompts at demonstration workstations.", "Issue visual prompts and brief the fictional work team.", "Facilities", "Taylor North", -35, "Completed", "Low", { effectiveness: "Demo spot-check completed." }),
  demo(5, "Supplier NCR", "Address a fictional packaging specification mismatch.", "Confirm the revised specification with the demo supplier.", "Supply Chain", "Cameron Lake", -12, "On Hold", "Medium"),
  demo(6, "Management Review", "Introduce a monthly fictional calibration summary.", "Create and approve a dashboard reporting template.", "Quality", "Riley Quinn", 55, "Open", "Low"),
  demo(7, "Calibration", "Verify a demonstration equipment recall process.", "Run a mock recall and record response times.", "Engineering", "Casey Brook", -6, "Completed", "Medium", { effectiveness: "Mock recall met the fictional target." }),
  demo(8, "EQM/ECAS", "Review fictional document access roles.", "Remove obsolete demo roles and document approval evidence.", "Information Systems", "Skyler Dawn", 70, "In Progress", "High")
];
const elements = {
  body: document.querySelector("#action-body"), search: document.querySelector("#search-input"), departmentFilter: document.querySelector("#department-filter"), statusFilter: document.querySelector("#status-filter"), clear: document.querySelector("#clear-button"), exportCsv: document.querySelector("#export-button"), csvImport: document.querySelector("#csv-import-input"), backup: document.querySelector("#backup-button"), importInput: document.querySelector("#import-input"), reset: document.querySelector("#reset-button"), newAction: document.querySelector("#new-button"), empty: document.querySelector("#empty-state"), recordCount: document.querySelector("#record-count"), total: document.querySelector("#total-count"), open: document.querySelector("#open-count"), overdue: document.querySelector("#overdue-count"), completed: document.querySelector("#completed-count"), message: document.querySelector("#message"), actionDialog: document.querySelector("#action-dialog"), actionForm: document.querySelector("#action-form"), formTitle: document.querySelector("#form-title"), formClose: document.querySelector("#form-close"), formCancel: document.querySelector("#form-cancel"), viewDialog: document.querySelector("#view-dialog"), viewTitle: document.querySelector("#view-title"), detailList: document.querySelector("#detail-list"), viewClose: document.querySelector("#view-close"), viewDone: document.querySelector("#view-done"), closureRate: document.querySelector("#closure-rate"), statusDonut: document.querySelector("#status-donut"), donutTotal: document.querySelector("#donut-total"), statusLegend: document.querySelector("#status-legend"), qualityFocus: document.querySelector("#quality-focus-text"), completionProgress: document.querySelector("#completion-progress"), completionProgressLabel: document.querySelector("#completion-progress-label")
};
let actions = [];
let visibleActions = [];
let editingNumber = null;
let formDirty = false;
let dialogOpener = null;

const clone = (value) => JSON.parse(JSON.stringify(value));
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const formatDate = (value) => value && validDate(value) ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
const isOverdue = (action) => action.status !== "Completed" && action.targetDate < todayIso();
const showMessage = (text, error = false) => { elements.message.textContent = text; elements.message.classList.toggle("error", error); elements.message.hidden = false; elements.message.scrollIntoView({ block: "nearest" }); };
const clearMessage = () => { elements.message.hidden = true; elements.message.textContent = ""; };

function normalizeAction(action) { return Object.fromEntries(FIELDS.map((field) => [field, typeof action[field] === "string" ? action[field].trim() : ""])); }
function validateAction(action, options = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!/^QA-\d{4}-\d{3,}$/.test(action.number)) add("number", "Action number must use the QA-YYYY-NNN format.");
  REQUIRED.forEach((field) => { if (!action[field]) add(field, "This field is required."); });
  if (action.source && !SOURCES.includes(action.source)) add("source", "Select a supported source.");
  if (action.status && !STATUSES.includes(action.status)) add("status", "Select a supported status.");
  if (action.priority && !PRIORITIES.includes(action.priority)) add("priority", "Select a supported priority.");
  ["targetDate", "lastUpdate", "closureDate"].forEach((field) => { if (action[field] && !validDate(action[field])) add(field, "Enter a valid date."); });
  if (!action.lastUpdate) add("lastUpdate", "Last update is required.");
  if (action.status === "Completed" && !action.closureDate) add("closureDate", "Closure date is required for completed actions.");
  if (action.closureDate && action.targetDate && action.closureDate < action.targetDate) add("closureDate", "Closure date cannot be earlier than the target date.");
  if (options.existingNumbers?.has(action.number)) add("number", "Duplicate action number found.");
  return errors;
}

function validateDataset(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Backup must contain a JSON object.");
  if (data.version !== BACKUP_VERSION) throw new Error(`Unsupported backup version. Expected version ${BACKUP_VERSION}.`);
  if (!Array.isArray(data.actions)) throw new Error("Backup actions must be an array.");
  if (data.actions.length > 10000) throw new Error("Backup contains too many actions (maximum 10,000).");
  const numbers = new Set();
  const normalized = data.actions.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Action ${index + 1} is not a valid record.`);
    for (const field of FIELDS) if (raw[field] !== undefined && typeof raw[field] !== "string") throw new Error(`Action ${index + 1}: ${field} must be text.`);
    const action = normalizeAction(raw);
    const errors = validateAction(action, { existingNumbers: numbers });
    if (errors.length) throw new Error(`Action ${index + 1} (${action.number || "no number"}): ${errors[0].message}`);
    numbers.add(action.number);
    return action;
  });
  return normalized;
}

function persist(nextActions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: BACKUP_VERSION, actions: nextActions })); return true; }
  catch (error) { showMessage(`Records could not be saved in this browser (${error.name || "storage error"}). Export a backup and check browser storage settings.`, true); return false; }
}
function loadActions() {
  let stored;
  try { stored = localStorage.getItem(STORAGE_KEY); }
  catch (error) { actions = clone(DEMO_ACTIONS); showMessage("Browser storage is unavailable. Demo records are available for this session, but changes may not persist.", true); return; }
  if (stored === null) { actions = clone(DEMO_ACTIONS); if (!persist(actions)) return; showMessage("Demonstration records loaded. They will not be duplicated on refresh."); return; }
  try {
    const parsed = JSON.parse(stored);
    actions = validateDataset({ version: parsed.version, actions: parsed.actions });
  } catch (error) {
    actions = [];
    showMessage(`Saved browser data could not be loaded safely: ${error.message} Your stored value was left unchanged. Import a valid backup or reset demo data to recover.`, true);
  }
}

function makeCell(row, value, className = "") { const cell = document.createElement("td"); if (className) cell.className = className; cell.textContent = value; row.append(cell); return cell; }
function addBadge(cell, value, className) { const badge = document.createElement("span"); badge.className = `badge ${className}`; badge.textContent = value; cell.textContent = ""; cell.append(badge); }
function getVisibleActions() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const selectedStatus = elements.statusFilter.value;
  const searchableFields = ["number", "source", "sourceReference", "description", "correctiveAction", "department", "person", "remarks", "effectiveness"];
  return actions.filter((action) => {
    const matchesStatus = !selectedStatus || (selectedStatus === "__overdue__" ? isOverdue(action) : action.status === selectedStatus);
    return (!query || searchableFields.some((field) => action[field].toLocaleLowerCase().includes(query))) && (!elements.departmentFilter.value || action.department === elements.departmentFilter.value) && matchesStatus;
  });
}
function populateFilters() {
  const department = elements.departmentFilter.value, status = elements.statusFilter.value;
  elements.departmentFilter.replaceChildren(new Option("All departments", ""), ...[...new Set(actions.map((action) => action.department))].sort().map((value) => new Option(value, value)));
  elements.statusFilter.replaceChildren(new Option("All statuses", ""), new Option("Overdue only", "__overdue__"), ...STATUSES.map((value) => new Option(value, value)));
  elements.departmentFilter.value = [...elements.departmentFilter.options].some((option) => option.value === department) ? department : "";
  elements.statusFilter.value = status;
}
function renderQualityVisual() {
  const total = actions.length;
  const counts = Object.fromEntries(STATUSES.map((status) => [status, actions.filter((action) => action.status === status).length]));
  const completed = counts.Completed;
  const overdue = actions.filter(isOverdue).length;
  const closureRate = total ? Math.round((completed / total) * 100) : 0;
  let cursor = 0;
  const segments = STATUSES.filter((status) => counts[status] > 0).map((status) => {
    const start = cursor;
    cursor += (counts[status] / total) * 360;
    return `${STATUS_COLORS[status]} ${start}deg ${cursor}deg`;
  });
  elements.statusDonut.style.background = total ? `conic-gradient(${segments.join(",")})` : "#d8e2eb";
  elements.statusDonut.setAttribute("aria-label", total ? `Status distribution: ${STATUSES.map((status) => `${counts[status]} ${status}`).join(", ")}.` : "No actions available.");
  elements.donutTotal.textContent = total;
  elements.closureRate.textContent = `${closureRate}%`;
  elements.statusLegend.replaceChildren(...STATUSES.map((status) => {
    const item = document.createElement("div"); item.className = "legend-item";
    const dot = document.createElement("span"); dot.className = "legend-dot"; dot.style.background = STATUS_COLORS[status]; dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span"); label.className = "legend-label"; label.textContent = status;
    const count = document.createElement("strong"); count.className = "legend-count"; count.textContent = counts[status];
    item.append(dot, label, count); return item;
  }));
  elements.qualityFocus.textContent = overdue ? `${overdue} overdue action${overdue === 1 ? "" : "s"} require immediate follow-up. Use the Overdue only filter to focus the register.` : total ? "No overdue actions. Continue monitoring target dates and effectiveness evidence." : "Add actions to begin monitoring follow-up priorities.";
  elements.completionProgressLabel.textContent = `${completed} of ${total}`;
  elements.completionProgress.style.width = `${closureRate}%`;
  elements.completionProgress.setAttribute("aria-valuenow", String(closureRate));
}

function render() {
  visibleActions = getVisibleActions(); elements.body.replaceChildren();
  visibleActions.forEach((action) => {
    const row = document.createElement("tr"); if (isOverdue(action)) row.className = "overdue";
    makeCell(row, action.number, "action-number"); makeCell(row, action.source); makeCell(row, action.description, "description"); makeCell(row, action.department); makeCell(row, action.person);
    const target = makeCell(row, formatDate(action.targetDate), "date"); if (isOverdue(action)) { const label = document.createElement("span"); label.className = "overdue-label"; label.textContent = "Overdue"; target.append(label); }
    const statusCell = makeCell(row, ""); addBadge(statusCell, action.status, `status-${({ Open: "open", "In Progress": "progress", "Under Review": "review", "On Hold": "hold", Completed: "completed" })[action.status]}`);
    const priorityCell = makeCell(row, ""); addBadge(priorityCell, action.priority, `priority-${action.priority.toLowerCase()}`);
    const controls = makeCell(row, ""); controls.className = "row-actions";
    [["View", "view"], ["Edit", "edit"], ["Delete", "delete"]].forEach(([label, command]) => { const button = document.createElement("button"); button.type = "button"; button.className = `row-button ${command === "delete" ? "delete" : ""}`; button.textContent = label; button.dataset.command = command; button.dataset.number = action.number; button.setAttribute("aria-label", `${label} ${action.number}`); controls.append(button); });
    elements.body.append(row);
  });
  elements.total.textContent = actions.length; elements.open.textContent = actions.filter((action) => action.status !== "Completed").length; elements.overdue.textContent = actions.filter(isOverdue).length; elements.completed.textContent = actions.filter((action) => action.status === "Completed").length; renderQualityVisual();
  elements.recordCount.textContent = `Showing ${visibleActions.length} of ${actions.length} actions`; elements.empty.hidden = visibleActions.length !== 0; elements.exportCsv.disabled = visibleActions.length === 0;
  document.querySelector("#refresh-date").textContent = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}
function refreshInterface() { populateFilters(); render(); }
function generateNumber(records = actions) { const prefix = `QA-${currentYear}-`; const sequences = records.filter((action) => action.number.startsWith(prefix)).map((action) => Number(action.number.slice(prefix.length))).filter(Number.isFinite); let next = sequences.length ? Math.max(...sequences) + 1 : 1; while (records.some((action) => action.number === `${prefix}${String(next).padStart(3, "0")}`)) next += 1; return `${prefix}${String(next).padStart(3, "0")}`; }

function setSelectOptions() { const source = document.querySelector("#source"); source.append(...SOURCES.map((value) => new Option(value, value))); document.querySelector("#status").append(...STATUSES.map((value) => new Option(value, value))); document.querySelector("#priority").append(...PRIORITIES.map((value) => new Option(value, value))); }
function clearFormErrors() { elements.actionForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid")); elements.actionForm.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; }); }
function readForm() { const data = Object.fromEntries(new FormData(elements.actionForm)); data.lastUpdate = todayIso(); return normalizeAction(data); }
function fillForm(action) { FIELDS.forEach((field) => { const input = elements.actionForm.elements[field]; if (input) input.value = action[field] || ""; }); document.querySelector("#closure-label").textContent = action.status === "Completed" ? "(required)" : "(optional)"; }
function openForm(action = null, opener = document.activeElement) {
  clearFormErrors(); editingNumber = action?.number || null; elements.formTitle.textContent = action ? `Edit ${action.number}` : "New quality action"; fillForm(action ? clone(action) : { number: generateNumber(), status: "Open", priority: "Medium", lastUpdate: todayIso() }); formDirty = false; dialogOpener = opener; elements.actionDialog.showModal(); document.querySelector("#source").focus();
}
function requestFormClose() { if (formDirty && !window.confirm("Close without saving? Your unsaved changes will be lost.")) return; elements.actionDialog.close(); }
function returnFocus() { if (dialogOpener?.isConnected) dialogOpener.focus(); dialogOpener = null; }
function saveForm(event) {
  event.preventDefault(); clearFormErrors(); const action = readForm(); const errors = validateAction(action);
  if (errors.length) { errors.forEach(({ field, message }) => { const input = elements.actionForm.elements[field]; if (!input) return; input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", `${field}-error`); const error = document.querySelector(`#${field}-error`); if (error) error.textContent = message; }); elements.actionForm.elements[errors[0].field]?.focus(); return; }
  const next = clone(actions); if (editingNumber) { const index = next.findIndex((item) => item.number === editingNumber); if (index < 0) { showMessage("This action no longer exists.", true); return; } next[index] = action; } else next.push(action);
  if (!persist(next)) return; actions = next; formDirty = false; elements.actionDialog.close(); refreshInterface(); showMessage(`${action.number} was ${editingNumber ? "updated" : "created"}.`);
}
function openView(action, opener) {
  dialogOpener = opener; elements.viewTitle.textContent = action.number; elements.detailList.replaceChildren(); const labels = { number: "Action number", source: "Source", sourceReference: "Source reference number", description: "Action description", correctiveAction: "Required corrective action", department: "Responsible department", person: "Responsible person", targetDate: "Target date", status: "Status", priority: "Priority", lastUpdate: "Last update", remarks: "Remarks or evidence reference", effectiveness: "Effectiveness verification", closureDate: "Closure date" };
  FIELDS.forEach((field) => { const wrapper = document.createElement("div"); if (["description", "correctiveAction", "remarks", "effectiveness"].includes(field)) wrapper.className = "wide"; const term = document.createElement("dt"), detail = document.createElement("dd"); term.textContent = labels[field]; detail.textContent = ["targetDate", "lastUpdate", "closureDate"].includes(field) ? formatDate(action[field]) : action[field] || "—"; wrapper.append(term, detail); elements.detailList.append(wrapper); }); elements.viewDialog.showModal(); elements.viewDone.focus();
}
function deleteAction(action) { if (!window.confirm(`Delete ${action.number}? This action cannot be undone.`)) return; const next = actions.filter((item) => item.number !== action.number); if (!persist(next)) return; actions = next; refreshInterface(); showMessage(`${action.number} was deleted.`); }

function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n" || character === "\r") {
      row.push(field); field = ""; if (row.some((value) => value.trim())) rows.push(row); row = [];
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else field += character;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(field); if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}
function normalizeHeader(value) { return String(value || "").replace(/^\ufeff/, "").trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, ""); }
function normalizeCsvDate(value) {
  const text = String(value || "").trim(); if (!text || validDate(text)) return text;
  const match = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if (!match) return text;
  const normalized = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`; return validDate(normalized) ? normalized : text;
}
function csvRowsToActions(text) {
  const rows = parseCsv(text); if (rows.length < 2) throw new Error("CSV must contain a header row and at least one action row.");
  if (rows.length > 10001) throw new Error("CSV contains too many actions (maximum 10,000).");
  const indexes = {};
  rows[0].forEach((header, index) => {
    const normalized = normalizeHeader(header); const field = CSV_HEADER_ALIASES[normalized] || FIELDS.find((name) => normalizeHeader(name) === normalized);
    if (!field) return; if (indexes[field] !== undefined) throw new Error(`Duplicate column for ${CSV_HEADINGS[FIELDS.indexOf(field)]}.`); indexes[field] = index;
  });
  const missing = CSV_REQUIRED_FIELDS.filter((field) => indexes[field] === undefined); if (missing.length) throw new Error(`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.map((field) => CSV_HEADINGS[FIELDS.indexOf(field)]).join(", ")}.`);
  const imported = []; const numbers = new Set(actions.map((action) => action.number));
  rows.slice(1).forEach((row, rowIndex) => {
    const raw = Object.fromEntries(FIELDS.map((field) => [field, indexes[field] === undefined ? "" : String(row[indexes[field]] ?? "")]));
    raw.number = raw.number.trim() || generateNumber([...actions, ...imported]); raw.status = raw.status.trim() || "Open"; raw.priority = raw.priority.trim() || "Medium"; raw.lastUpdate = normalizeCsvDate(raw.lastUpdate) || todayIso(); raw.targetDate = normalizeCsvDate(raw.targetDate); raw.closureDate = normalizeCsvDate(raw.closureDate);
    const action = normalizeAction(raw); const errors = validateAction(action, { existingNumbers: numbers });
    if (errors.length) { const error = errors[0]; throw new Error(`CSV row ${rowIndex + 2} (${action.number || "no number"}), ${CSV_HEADINGS[FIELDS.indexOf(error.field)] || error.field}: ${error.message}`); }
    numbers.add(action.number); imported.push(action);
  });
  if (!imported.length) throw new Error("CSV contains no action records."); return imported;
}
async function importCsv(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return; if (file.size > 10 * 1024 * 1024) { showMessage("CSV file is too large (maximum 10 MB).", true); return; }
  let imported; try { imported = csvRowsToActions(await file.text()); } catch (error) { showMessage(`CSV was not imported: ${error.message} Existing records were not changed.`, true); return; }
  if (!window.confirm(`Add ${imported.length} validated action${imported.length === 1 ? "" : "s"} to the ${actions.length} actions already stored in this browser?`)) { showMessage("CSV import cancelled. Existing records were not changed."); return; }
  const next = [...actions, ...imported]; if (!persist(next)) return; actions = next; refreshInterface(); showMessage(`CSV imported successfully. ${imported.length} action${imported.length === 1 ? " was" : "s were"} added; ${actions.length} actions are now stored in this browser.`);
}

function safeCsv(value) { let text = String(value ?? ""); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; }
function download(content, type, filename) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function exportCsv() { const csv = [CSV_HEADINGS, ...visibleActions.map((action) => FIELDS.map((field) => action[field]))].map((row) => row.map(safeCsv).join(",")).join("\r\n"); download(`\ufeff${csv}`, "text/csv;charset=utf-8", `quality-actions-visible-${todayIso()}.csv`); }
function exportBackup() { download(JSON.stringify({ version: BACKUP_VERSION, exportedAt: new Date().toISOString(), actions }, null, 2), "application/json", `quality-actions-backup-${todayIso()}.json`); }
async function importBackup(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return; if (file.size > 10 * 1024 * 1024) { showMessage("Backup file is too large (maximum 10 MB).", true); return; }
  let restored; try { restored = validateDataset(JSON.parse(await file.text())); } catch (error) { showMessage(`Backup was not imported: ${error.message} Existing records were not changed.`, true); return; }
  if (!window.confirm(`Replace all ${actions.length} locally saved actions with ${restored.length} actions from this validated backup?`)) { showMessage("Import cancelled. Existing records were not changed."); return; }
  if (!persist(restored)) return; actions = restored; refreshInterface(); showMessage(`Backup restored successfully. ${actions.length} actions are now stored in this browser.`);
}
function resetDemo() { if (!window.confirm("Reset demo data? All locally saved actions will be replaced by the original fictional demonstration records. This cannot be undone unless you exported a backup.")) return; const next = clone(DEMO_ACTIONS); if (!persist(next)) return; actions = next; refreshInterface(); showMessage("Demonstration data was reset successfully."); }

setSelectOptions(); loadActions(); refreshInterface();
elements.search.addEventListener("input", render); elements.departmentFilter.addEventListener("change", render); elements.statusFilter.addEventListener("change", render);
elements.clear.addEventListener("click", () => { elements.search.value = ""; elements.departmentFilter.value = ""; elements.statusFilter.value = ""; render(); elements.search.focus(); });
elements.newAction.addEventListener("click", (event) => openForm(null, event.currentTarget)); elements.actionForm.addEventListener("submit", saveForm); elements.actionForm.addEventListener("input", () => { formDirty = true; }); elements.formClose.addEventListener("click", requestFormClose); elements.formCancel.addEventListener("click", requestFormClose); elements.actionDialog.addEventListener("cancel", (event) => { event.preventDefault(); requestFormClose(); }); elements.actionDialog.addEventListener("close", returnFocus);
document.querySelector("#status").addEventListener("change", (event) => { document.querySelector("#closure-label").textContent = event.target.value === "Completed" ? "(required)" : "(optional)"; });
elements.viewClose.addEventListener("click", () => elements.viewDialog.close()); elements.viewDone.addEventListener("click", () => elements.viewDialog.close()); elements.viewDialog.addEventListener("close", returnFocus);
elements.body.addEventListener("click", (event) => { const button = event.target.closest("button[data-command]"); if (!button) return; const action = actions.find((item) => item.number === button.dataset.number); if (!action) return; if (button.dataset.command === "view") openView(action, button); if (button.dataset.command === "edit") openForm(action, button); if (button.dataset.command === "delete") deleteAction(action); });
elements.exportCsv.addEventListener("click", exportCsv); elements.csvImport.addEventListener("change", importCsv); elements.backup.addEventListener("click", exportBackup); elements.importInput.addEventListener("change", importBackup); elements.reset.addEventListener("click", resetDemo); document.querySelector("#filter-form").addEventListener("submit", (event) => event.preventDefault());
