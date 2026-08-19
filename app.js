"use strict";

const STORAGE_KEY = "qualityCore.qaActionTracker.v1";
const BACKUP_VERSION = 2;
const EVIDENCE_DB = "qualityCore.tasksActionsEvidence.v1";
const EVIDENCE_STORE = "attachments";
const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx", "csv", "txt"]);
const SOURCES = ["Internal Audit", "NCR", "Customer Complaint", "Site Feedback", "Supplier NCR", "Management Review", "EQM/ECAS", "ADNOC/CCTC", "Calibration", "Other"];
const STATUSES = ["Open", "In Progress", "Under Review", "On Hold", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];
const FIELDS = ["number", "source", "sourceReference", "description", "correctiveAction", "department", "person", "targetDate", "status", "priority", "lastUpdate", "remarks", "effectiveness", "closureDate"];
const TRACE_FIELDS = ["targetDateHistory", "qualityComments"];
const MAX_TRACE_ENTRIES = 2000;
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
const demo = (sequence, source, description, correctiveAction, department, person, offset, status, priority, extras = {}) => ({ id: `demo-record-${sequence}`, number: `QA-${currentYear}-${String(sequence).padStart(3, "0")}`, source, sourceReference: extras.sourceReference || `DEMO-${String(sequence).padStart(3, "0")}`, description, correctiveAction, department, person, targetDate: shiftDate(offset), status, priority, lastUpdate: todayIso(), remarks: extras.remarks || "Fictional demonstration record.", effectiveness: extras.effectiveness || "", closureDate: status === "Completed" ? shiftDate(offset + 2) : "", targetDateHistory: [], qualityComments: [] });
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
  body: document.querySelector("#action-body"), search: document.querySelector("#search-input"), departmentFilter: document.querySelector("#department-filter"), statusFilter: document.querySelector("#status-filter"), clear: document.querySelector("#clear-button"), exportCsv: document.querySelector("#export-button"), csvImport: document.querySelector("#csv-import-input"), backup: document.querySelector("#backup-button"), importInput: document.querySelector("#import-input"), reset: document.querySelector("#reset-button"), newAction: document.querySelector("#new-button"), empty: document.querySelector("#empty-state"), recordCount: document.querySelector("#record-count"), total: document.querySelector("#total-count"), open: document.querySelector("#open-count"), overdue: document.querySelector("#overdue-count"), completed: document.querySelector("#completed-count"), message: document.querySelector("#message"), actionDialog: document.querySelector("#action-dialog"), actionForm: document.querySelector("#action-form"), formTitle: document.querySelector("#form-title"), formClose: document.querySelector("#form-close"), formCancel: document.querySelector("#form-cancel"), viewDialog: document.querySelector("#view-dialog"), viewTitle: document.querySelector("#view-title"), detailList: document.querySelector("#detail-list"), viewClose: document.querySelector("#view-close"), viewDone: document.querySelector("#view-done"), traceDialog: document.querySelector("#trace-dialog"), traceTitle: document.querySelector("#trace-title"), traceClose: document.querySelector("#trace-close"), traceDone: document.querySelector("#trace-done"), targetHistoryCount: document.querySelector("#target-history-count"), targetHistoryList: document.querySelector("#target-history-list"), qualityCommentsCount: document.querySelector("#quality-comments-count"), qualityCommentsList: document.querySelector("#quality-comments-list"), qualityCommentForm: document.querySelector("#quality-comment-form"), qualityCommentInput: document.querySelector("#quality-comment-input"), qualityCommentError: document.querySelector("#quality-comment-error"), qualityCommentNotice: document.querySelector("#quality-comment-notice"), closureRate: document.querySelector("#closure-rate"), statusDonut: document.querySelector("#status-donut"), donutTotal: document.querySelector("#donut-total"), statusLegend: document.querySelector("#status-legend"), qualityFocus: document.querySelector("#quality-focus-text"), completionProgress: document.querySelector("#completion-progress"), completionProgressLabel: document.querySelector("#completion-progress-label")
};
let actions = [];
let visibleActions = [];
let editingNumber = null;
let formDirty = false;
let dialogOpener = null;
let traceActionNumber = null;
let evidenceRecordId = null;
let evidenceCounts = new Map();

Object.assign(elements, {
  evidenceDialog: document.querySelector("#evidence-dialog"), evidenceClose: document.querySelector("#evidence-close"), evidenceDone: document.querySelector("#evidence-done"), evidenceForm: document.querySelector("#evidence-form"), evidenceFiles: document.querySelector("#evidence-files"), evidenceNote: document.querySelector("#evidence-note"), evidenceStatus: document.querySelector("#evidence-status"), evidenceList: document.querySelector("#evidence-list"), evidenceDialogCount: document.querySelector("#evidence-dialog-count"), evidenceRecordNumber: document.querySelector("#evidence-record-number"), evidenceRecordDescription: document.querySelector("#evidence-record-description")
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const formatDate = (value) => value && validDate(value) ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
const formatDateTime = (value) => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Unknown time";
const makeTraceId = () => globalThis.crypto?.randomUUID?.() || `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isOverdue = (action) => action.status !== "Completed" && action.targetDate < todayIso();
const showMessage = (text, error = false) => { elements.message.textContent = text; elements.message.classList.toggle("error", error); elements.message.hidden = false; elements.message.scrollIntoView({ block: "nearest" }); };
const clearMessage = () => { elements.message.hidden = true; elements.message.textContent = ""; };

function makeRecordId() { return globalThis.crypto?.randomUUID?.() || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function normalizeAction(action) { return { id: typeof action.id === "string" && action.id.trim() ? action.id.trim() : makeRecordId(), ...Object.fromEntries(FIELDS.map((field) => [field, typeof action[field] === "string" ? action[field].trim() : ""])) }; }
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

function validateTraceData(raw, actionIndex) {
  const validateList = (field, entryFields, validator) => {
    const value = raw[field]; if (value === undefined) return []; if (!Array.isArray(value)) throw new Error(`Action ${actionIndex + 1}: ${field} must be an array.`); if (value.length > MAX_TRACE_ENTRIES) throw new Error(`Action ${actionIndex + 1}: ${field} contains too many entries.`);
    const ids = new Set();
    return value.map((entry, entryIndex) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Action ${actionIndex + 1}: ${field} entry ${entryIndex + 1} is invalid.`);
      const normalized = {}; entryFields.forEach((name) => { if (typeof entry[name] !== "string") throw new Error(`Action ${actionIndex + 1}: ${field} entry ${entryIndex + 1} ${name} must be text.`); normalized[name] = entry[name].trim(); });
      if (!normalized.id || ids.has(normalized.id)) throw new Error(`Action ${actionIndex + 1}: ${field} contains a missing or duplicate entry ID.`); ids.add(normalized.id); validator(normalized, entryIndex); return normalized;
    });
  };
  const targetDateHistory = validateList("targetDateHistory", ["id", "changedAt", "previousDate", "newDate"], (entry, entryIndex) => { if (Number.isNaN(Date.parse(entry.changedAt))) throw new Error(`Action ${actionIndex + 1}: target date amendment ${entryIndex + 1} has an invalid timestamp.`); if (!validDate(entry.previousDate) || !validDate(entry.newDate)) throw new Error(`Action ${actionIndex + 1}: target date amendment ${entryIndex + 1} has an invalid date.`); });
  const qualityComments = validateList("qualityComments", ["id", "createdAt", "author", "text"], (entry, entryIndex) => { if (Number.isNaN(Date.parse(entry.createdAt))) throw new Error(`Action ${actionIndex + 1}: Quality comment ${entryIndex + 1} has an invalid timestamp.`); if (!entry.author || !entry.text) throw new Error(`Action ${actionIndex + 1}: Quality comment ${entryIndex + 1} is incomplete.`); if (entry.text.length > 1500) throw new Error(`Action ${actionIndex + 1}: Quality comment ${entryIndex + 1} is too long.`); });
  return { targetDateHistory, qualityComments };
}

function validateDataset(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Backup must contain a JSON object.");
  if (![1, BACKUP_VERSION].includes(data.version)) throw new Error(`Unsupported backup version. Expected version 1 or ${BACKUP_VERSION}.`);
  if (!Array.isArray(data.actions)) throw new Error("Backup actions must be an array.");
  if (data.actions.length > 10000) throw new Error("Backup contains too many actions (maximum 10,000).");
  const numbers = new Set(), ids = new Set();
  const normalized = data.actions.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Action ${index + 1} is not a valid record.`);
    for (const field of FIELDS) if (raw[field] !== undefined && typeof raw[field] !== "string") throw new Error(`Action ${index + 1}: ${field} must be text.`);
    const action = { ...normalizeAction(raw), ...validateTraceData(raw, index) };
    if (ids.has(action.id)) throw new Error(`Action ${index + 1}: duplicate internal record ID.`); ids.add(action.id);
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
    if (parsed.version !== BACKUP_VERSION || parsed.actions.some((action) => !action.id)) persist(actions);
  } catch (error) {
    actions = [];
    showMessage(`Saved browser data could not be loaded safely: ${error.message} Your stored value was left unchanged. Import a valid backup or reset demo data to recover.`, true);
  }
}

function openEvidenceDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(EVIDENCE_DB, 1);
    request.onupgradeneeded = () => { const store = request.result.createObjectStore(EVIDENCE_STORE, { keyPath: "id" }); store.createIndex("recordId", "recordId", { unique: false }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function evidenceTransaction(mode, operation) {
  const db = await openEvidenceDb();
  try { return await new Promise((resolve, reject) => { const tx = db.transaction(EVIDENCE_STORE, mode); const result = operation(tx.objectStore(EVIDENCE_STORE)); tx.oncomplete = () => resolve(result?.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}
const getEvidenceForRecord = (recordId) => evidenceTransaction("readonly", (store) => store.index("recordId").getAll(recordId));
const getAllEvidence = () => evidenceTransaction("readonly", (store) => store.getAll());
const putEvidence = (attachment) => evidenceTransaction("readwrite", (store) => store.put(attachment));
const deleteEvidenceItem = (id) => evidenceTransaction("readwrite", (store) => store.delete(id));
async function deleteEvidenceForRecord(recordId) { const items = await getEvidenceForRecord(recordId); if (!items.length) return 0; await evidenceTransaction("readwrite", (store) => { items.forEach((item) => store.delete(item.id)); }); return items.length; }
async function refreshEvidenceCounts() { try { const items = await getAllEvidence(); evidenceCounts = new Map(); items.forEach((item) => evidenceCounts.set(item.recordId, (evidenceCounts.get(item.recordId) || 0) + 1)); render(); } catch (error) { showMessage(`Evidence storage is unavailable (${error.name || "browser storage error"}). Records remain available.`, true); } }

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
  elements.statusDonut.setAttribute("aria-label", total ? `Status distribution: ${STATUSES.map((status) => `${counts[status]} ${status}`).join(", ")}.` : "No records available.");
  elements.donutTotal.textContent = total;
  elements.closureRate.textContent = `${closureRate}%`;
  elements.statusLegend.replaceChildren(...STATUSES.map((status) => {
    const item = document.createElement("div"); item.className = "legend-item";
    const dot = document.createElement("span"); dot.className = "legend-dot"; dot.style.background = STATUS_COLORS[status]; dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span"); label.className = "legend-label"; label.textContent = status;
    const count = document.createElement("strong"); count.className = "legend-count"; count.textContent = counts[status];
    item.append(dot, label, count); return item;
  }));
  elements.qualityFocus.textContent = overdue ? `${overdue} overdue record${overdue === 1 ? "" : "s"} require immediate follow-up. Use the Overdue only filter to focus the register.` : total ? "No overdue records. Continue monitoring target dates and effectiveness evidence." : "Add records to begin monitoring follow-up priorities.";
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
    const amendmentCount = action.targetDateHistory?.length || 0; const amendmentButton = document.createElement("button"); amendmentButton.type = "button"; amendmentButton.className = "amendment-link"; amendmentButton.dataset.command = "trace"; amendmentButton.dataset.number = action.number; amendmentButton.textContent = `${amendmentCount} amendment${amendmentCount === 1 ? "" : "s"}`; amendmentButton.setAttribute("aria-label", `Open target date history for ${action.number}; ${amendmentCount} amendment${amendmentCount === 1 ? "" : "s"}`); target.append(amendmentButton);
    const statusCell = makeCell(row, ""); addBadge(statusCell, action.status, `status-${({ Open: "open", "In Progress": "progress", "Under Review": "review", "On Hold": "hold", Completed: "completed" })[action.status]}`);
    const priorityCell = makeCell(row, ""); addBadge(priorityCell, action.priority, `priority-${action.priority.toLowerCase()}`);
    const controls = makeCell(row, ""); controls.className = "row-actions";
    [["View", "view"], ["Edit", "edit"], [`Comments (${action.qualityComments?.length || 0})`, "trace"], ["Delete", "delete"], [`Evidence (${evidenceCounts.get(action.id) || 0})`, "evidence"]].forEach(([label, command]) => { const button = document.createElement("button"); button.type = "button"; button.className = `row-button ${command === "delete" ? "delete" : ""} ${command === "trace" ? "trace" : ""} ${command === "evidence" ? "evidence" : ""}`; button.textContent = label; button.dataset.command = command; button.dataset.number = action.number; button.dataset.recordId = action.id; button.setAttribute("aria-label", `${command === "trace" ? "Open traceability for" : label} ${action.number}`); controls.append(button); });
    elements.body.append(row);
  });
  elements.total.textContent = actions.length; elements.open.textContent = actions.filter((action) => action.status !== "Completed").length; elements.overdue.textContent = actions.filter(isOverdue).length; elements.completed.textContent = actions.filter((action) => action.status === "Completed").length; renderQualityVisual();
  elements.recordCount.textContent = `Showing ${visibleActions.length} of ${actions.length} records`; elements.empty.hidden = visibleActions.length !== 0; elements.exportCsv.disabled = visibleActions.length === 0;
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
function applyTraceability(action, previous = null) {
  action.id = previous?.id || action.id || makeRecordId();
  action.targetDateHistory = clone(previous?.targetDateHistory || []); action.qualityComments = clone(previous?.qualityComments || []);
  if (previous && previous.targetDate !== action.targetDate) { action.targetDateHistory.push({ id: makeTraceId(), changedAt: new Date().toISOString(), previousDate: previous.targetDate, newDate: action.targetDate }); return true; }
  return false;
}
function saveForm(event) {
  event.preventDefault(); clearFormErrors(); const action = readForm(); const errors = validateAction(action);
  if (errors.length) { errors.forEach(({ field, message }) => { const input = elements.actionForm.elements[field]; if (!input) return; input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", `${field}-error`); const error = document.querySelector(`#${field}-error`); if (error) error.textContent = message; }); elements.actionForm.elements[errors[0].field]?.focus(); return; }
  const next = clone(actions); let amendmentRecorded = false;
  if (editingNumber) { const index = next.findIndex((item) => item.number === editingNumber); if (index < 0) { showMessage("This action no longer exists.", true); return; } amendmentRecorded = applyTraceability(action, next[index]); next[index] = action; }
  else { applyTraceability(action); next.push(action); }
  if (!persist(next)) return; actions = next; formDirty = false; elements.actionDialog.close(); refreshInterface(); showMessage(`${action.number} was ${editingNumber ? "updated" : "created"}.${amendmentRecorded ? " The target date amendment was added to its traceability history." : ""}`);
}
function openView(action, opener) {
  dialogOpener = opener; elements.viewTitle.textContent = action.number; elements.detailList.replaceChildren(); const labels = { number: "Action number", source: "Source", sourceReference: "Source reference number", description: "Action description", correctiveAction: "Required corrective action", department: "Responsible department", person: "Responsible person", targetDate: "Target date", status: "Status", priority: "Priority", lastUpdate: "Last update", remarks: "Remarks or evidence reference", effectiveness: "Effectiveness verification", closureDate: "Closure date" };
  FIELDS.forEach((field) => { const wrapper = document.createElement("div"); if (["description", "correctiveAction", "remarks", "effectiveness"].includes(field)) wrapper.className = "wide"; const term = document.createElement("dt"), detail = document.createElement("dd"); term.textContent = labels[field]; detail.textContent = ["targetDate", "lastUpdate", "closureDate"].includes(field) ? formatDate(action[field]) : action[field] || "—"; wrapper.append(term, detail); elements.detailList.append(wrapper); }); elements.viewDialog.showModal(); elements.viewDone.focus();
}
function createTraceItem(title, meta, body, comment = false) { const item = document.createElement("article"); item.className = `trace-item${comment ? " comment" : ""}`; const heading = document.createElement("h4"); heading.textContent = title; const metadata = document.createElement("p"); metadata.className = "trace-meta"; metadata.textContent = meta; const content = document.createElement("div"); content.className = "trace-body"; if (body instanceof Node) content.append(body); else content.textContent = body; item.append(heading, metadata, content); return item; }
function renderTrace(action) {
  const history = action.targetDateHistory || [], comments = action.qualityComments || []; elements.traceTitle.textContent = `Traceability — ${action.number}`; elements.targetHistoryCount.textContent = `${history.length} amendment${history.length === 1 ? "" : "s"}`; elements.qualityCommentsCount.textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"}`;
  elements.targetHistoryList.replaceChildren(); if (!history.length) { const empty = document.createElement("p"); empty.className = "trace-empty"; empty.textContent = "No target date amendments have been recorded. Tracking begins with the next target date change."; elements.targetHistoryList.append(empty); } else history.slice().reverse().forEach((entry) => { const dates = document.createElement("div"); dates.className = "trace-date-change"; const oldDate = document.createElement("span"); oldDate.className = "trace-date-old"; oldDate.textContent = formatDate(entry.previousDate); const arrow = document.createElement("span"); arrow.className = "trace-arrow"; arrow.textContent = "→"; arrow.setAttribute("aria-hidden", "true"); const newDate = document.createElement("span"); newDate.className = "trace-date-new"; newDate.textContent = formatDate(entry.newDate); dates.append(oldDate, arrow, newDate); elements.targetHistoryList.append(createTraceItem("Target date amended", formatDateTime(entry.changedAt), dates)); });
  elements.qualityCommentsList.replaceChildren(); if (!comments.length) { const empty = document.createElement("p"); empty.className = "trace-empty"; empty.textContent = "No Quality comments have been recorded for this action."; elements.qualityCommentsList.append(empty); } else comments.slice().reverse().forEach((entry) => elements.qualityCommentsList.append(createTraceItem("Quality comment", `${entry.author} • ${formatDateTime(entry.createdAt)}`, entry.text, true)));
}
function openTrace(action, opener) { traceActionNumber = action.number; dialogOpener = opener; elements.qualityCommentInput.value = ""; elements.qualityCommentInput.removeAttribute("aria-invalid"); elements.qualityCommentError.textContent = ""; elements.qualityCommentNotice.textContent = ""; renderTrace(action); elements.traceDialog.showModal(); elements.traceClose.focus(); }
function addQualityComment(event) {
  event.preventDefault(); const text = elements.qualityCommentInput.value.trim(); elements.qualityCommentError.textContent = ""; elements.qualityCommentNotice.textContent = ""; elements.qualityCommentInput.removeAttribute("aria-invalid");
  if (!text) { elements.qualityCommentInput.setAttribute("aria-invalid", "true"); elements.qualityCommentError.textContent = "Enter a Quality comment before saving."; elements.qualityCommentInput.focus(); return; }
  const next = clone(actions); const index = next.findIndex((action) => action.number === traceActionNumber); if (index < 0) { elements.qualityCommentError.textContent = "This action no longer exists."; return; }
  next[index].targetDateHistory = next[index].targetDateHistory || []; next[index].qualityComments = next[index].qualityComments || []; next[index].qualityComments.push({ id: makeTraceId(), createdAt: new Date().toISOString(), author: "Quality", text }); next[index].lastUpdate = todayIso();
  if (!persist(next)) return; actions = next; refreshInterface(); elements.qualityCommentInput.value = ""; renderTrace(actions[index]); elements.qualityCommentNotice.textContent = "Quality comment saved with its date and time."; elements.qualityCommentInput.focus();
}
function formatBytes(size) { if (size < 1024) return `${size} B`; if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1024 ** 2).toFixed(1)} MB`; }
function evidenceType(item) { return item.type || `.${item.name.split(".").pop()?.toLowerCase() || "file"}`; }
function openEvidenceBlob(item, downloadFile = false) { const url = URL.createObjectURL(item.blob); const link = document.createElement("a"); link.href = url; if (downloadFile) link.download = item.name; else { link.target = "_blank"; link.rel = "noopener"; } document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
async function renderEvidenceList() {
  const items = await getEvidenceForRecord(evidenceRecordId); elements.evidenceList.replaceChildren(); elements.evidenceDialogCount.textContent = `${items.length} file${items.length === 1 ? "" : "s"}`;
  if (!items.length) { const empty = document.createElement("p"); empty.className = "trace-empty"; empty.textContent = "No evidence is attached to this record."; elements.evidenceList.append(empty); return; }
  items.sort((a, b) => b.attachedAt.localeCompare(a.attachedAt)).forEach((item) => { const card = document.createElement("article"); card.className = "evidence-item"; const info = document.createElement("div"); const title = document.createElement("h4"); title.textContent = item.name; const meta = document.createElement("p"); meta.textContent = `${evidenceType(item)} • ${formatBytes(item.size)} • ${formatDateTime(item.attachedAt)}`; info.append(title, meta); if (item.note) { const note = document.createElement("p"); note.className = "evidence-note"; note.textContent = item.note; info.append(note); } const controls = document.createElement("div"); controls.className = "evidence-actions"; [["Open / preview", false], ["Download", true]].forEach(([label, downloadFile]) => { const button = document.createElement("button"); button.type = "button"; button.className = "row-button"; button.textContent = label; button.setAttribute("aria-label", `${label} ${item.name}`); button.addEventListener("click", () => openEvidenceBlob(item, downloadFile)); controls.append(button); }); const remove = document.createElement("button"); remove.type = "button"; remove.className = "row-button delete"; remove.textContent = "Delete"; remove.setAttribute("aria-label", `Delete evidence ${item.name}`); remove.addEventListener("click", async () => { if (!window.confirm(`Delete evidence file “${item.name}”? This cannot be undone.`)) return; await deleteEvidenceItem(item.id); elements.evidenceStatus.textContent = `${item.name} was deleted.`; await refreshEvidenceCounts(); await renderEvidenceList(); }); controls.append(remove); card.append(info, controls); elements.evidenceList.append(card); });
}
async function openEvidence(action, opener) { evidenceRecordId = action.id; dialogOpener = opener; elements.evidenceRecordNumber.textContent = action.number; elements.evidenceRecordDescription.textContent = action.description; elements.evidenceForm.reset(); elements.evidenceStatus.textContent = ""; elements.evidenceDialog.showModal(); elements.evidenceClose.focus(); try { await renderEvidenceList(); } catch (error) { elements.evidenceStatus.textContent = `Evidence could not be loaded: ${error.message}`; } }
async function uploadEvidence(event) {
  event.preventDefault(); const files = [...elements.evidenceFiles.files]; if (!files.length) return; const invalid = files.find((file) => !ALLOWED_EXTENSIONS.has(file.name.split(".").pop()?.toLowerCase())); const oversized = files.find((file) => file.size > MAX_EVIDENCE_SIZE);
  if (invalid) { elements.evidenceStatus.textContent = `${invalid.name} is unsupported. Choose PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, CSV or TXT.`; showMessage(elements.evidenceStatus.textContent, true); return; }
  if (oversized) { elements.evidenceStatus.textContent = `${oversized.name} is larger than the 5 MB per-file limit.`; showMessage(elements.evidenceStatus.textContent, true); return; }
  try { for (const file of files) await putEvidence({ id: makeRecordId(), recordId: evidenceRecordId, name: file.name, type: file.type, size: file.size, attachedAt: new Date().toISOString(), note: elements.evidenceNote.value.trim(), blob: file }); elements.evidenceForm.reset(); elements.evidenceStatus.textContent = `${files.length} evidence file${files.length === 1 ? "" : "s"} attached successfully.`; showMessage(elements.evidenceStatus.textContent); await refreshEvidenceCounts(); await renderEvidenceList(); } catch (error) { elements.evidenceStatus.textContent = `Evidence could not be saved (${error.name || "storage error"}).`; showMessage(elements.evidenceStatus.textContent, true); }
}
async function deleteAction(action) { if (!window.confirm(`Delete ${action.number}? Its history, comments, and ${evidenceCounts.get(action.id) || 0} evidence file(s) will also be deleted. This cannot be undone.`)) return; const next = actions.filter((item) => item.id !== action.id); if (!persist(next)) return; actions = next; try { await deleteEvidenceForRecord(action.id); } catch (error) { showMessage(`Record deleted, but its evidence could not be cleared (${error.name || "storage error"}).`, true); } await refreshEvidenceCounts(); refreshInterface(); showMessage(`${action.number} and its associated evidence were deleted.`); }

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
    const action = normalizeAction(raw); action.targetDateHistory = []; action.qualityComments = []; const errors = validateAction(action, { existingNumbers: numbers });
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
function blobToDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
function dataUrlToBlob(value) { const match = /^data:([^;,]*);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value); if (!match) throw new Error("Attachment content is not valid base64 data."); const bytes = atob(match[2]); const data = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i += 1) data[i] = bytes.charCodeAt(i); return new Blob([data], { type: match[1] || "application/octet-stream" }); }
async function exportBackup() { try { const stored = await getAllEvidence(); const attachments = await Promise.all(stored.map(async ({ blob, ...item }) => ({ ...item, content: await blobToDataUrl(blob) }))); download(JSON.stringify({ version: BACKUP_VERSION, exportedAt: new Date().toISOString(), actions, attachments }, null, 2), "application/json", `tasks-actions-backup-${todayIso()}.json`); showMessage(`JSON backup exported with ${actions.length} records and ${attachments.length} attachments. Evidence-inclusive backups may be large because files are base64 encoded.`); } catch (error) { showMessage(`Backup could not be created (${error.name || "storage error"}).`, true); } }
function validateBackupAttachments(raw, restored) { if (raw === undefined) return []; if (!Array.isArray(raw)) throw new Error("Backup attachments must be an array."); if (raw.length > 10000) throw new Error("Backup contains too many attachments (maximum 10,000)."); const recordIds = new Set(restored.map((item) => item.id)), ids = new Set(); return raw.map((item, index) => { if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Attachment ${index + 1} is invalid.`); for (const field of ["id", "recordId", "name", "type", "attachedAt", "note", "content"]) if (typeof item[field] !== "string") throw new Error(`Attachment ${index + 1}: ${field} must be text.`); const extension = item.name.split(".").pop()?.toLowerCase(); if (!item.id || ids.has(item.id)) throw new Error(`Attachment ${index + 1} has a missing or duplicate ID.`); ids.add(item.id); if (!recordIds.has(item.recordId)) throw new Error(`Attachment ${index + 1} does not reference a restored record.`); if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error(`Attachment ${index + 1} has an unsupported file type.`); if (Number.isNaN(Date.parse(item.attachedAt))) throw new Error(`Attachment ${index + 1} has an invalid date.`); if (item.note.length > 250) throw new Error(`Attachment ${index + 1} note is too long.`); const blob = dataUrlToBlob(item.content); if (blob.size > MAX_EVIDENCE_SIZE || blob.size !== item.size || !Number.isInteger(item.size) || item.size < 0) throw new Error(`Attachment ${index + 1} has invalid content or size.`); return { id: item.id, recordId: item.recordId, name: item.name, type: item.type, size: item.size, attachedAt: item.attachedAt, note: item.note, blob }; }); }
async function importBackup(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return; if (file.size > 250 * 1024 * 1024) { showMessage("Backup file is too large (maximum 250 MB).", true); return; }
  let restored, attachments; try { const parsed = JSON.parse(await file.text()); restored = validateDataset(parsed); attachments = validateBackupAttachments(parsed.attachments, restored); } catch (error) { showMessage(`Backup was not imported: ${error.message} Existing records and attachments were not changed.`, true); return; }
  const currentAttachments = await getAllEvidence(); if (!window.confirm(`Validated backup: restore ${restored.length} records and ${attachments.length} attachments? This will explicitly replace the ${actions.length} records and ${currentAttachments.length} attachments currently in this browser; it will not merge or silently overwrite them.`)) { showMessage("Import cancelled. Existing records and attachments were not changed."); return; }
  if (!persist(restored)) return; try { await evidenceTransaction("readwrite", (store) => { store.clear(); attachments.forEach((item) => store.put(item)); }); } catch (error) { showMessage(`Records restored, but evidence restoration failed (${error.name || "storage error"}). Re-import the backup.`, true); return; } actions = restored; await refreshEvidenceCounts(); refreshInterface(); showMessage(`Backup restored successfully: ${actions.length} records and ${attachments.length} attachments.`);
}
async function resetDemo() { if (!window.confirm("Reset demo data? All locally saved records and evidence will be replaced by the original fictional demonstration records. This cannot be undone unless you exported a JSON backup.")) return; const next = clone(DEMO_ACTIONS); if (!persist(next)) return; actions = next; await evidenceTransaction("readwrite", (store) => store.clear()); await refreshEvidenceCounts(); refreshInterface(); showMessage("Demonstration data was reset successfully."); }

setSelectOptions(); loadActions(); refreshInterface(); refreshEvidenceCounts();
elements.search.addEventListener("input", render); elements.departmentFilter.addEventListener("change", render); elements.statusFilter.addEventListener("change", render);
elements.clear.addEventListener("click", () => { elements.search.value = ""; elements.departmentFilter.value = ""; elements.statusFilter.value = ""; render(); elements.search.focus(); });
elements.newAction.addEventListener("click", (event) => openForm(null, event.currentTarget)); elements.actionForm.addEventListener("submit", saveForm); elements.actionForm.addEventListener("input", () => { formDirty = true; }); elements.formClose.addEventListener("click", requestFormClose); elements.formCancel.addEventListener("click", requestFormClose); elements.actionDialog.addEventListener("cancel", (event) => { event.preventDefault(); requestFormClose(); }); elements.actionDialog.addEventListener("close", returnFocus);
document.querySelector("#status").addEventListener("change", (event) => { document.querySelector("#closure-label").textContent = event.target.value === "Completed" ? "(required)" : "(optional)"; });
elements.viewClose.addEventListener("click", () => elements.viewDialog.close()); elements.viewDone.addEventListener("click", () => elements.viewDialog.close()); elements.viewDialog.addEventListener("close", returnFocus);
elements.traceClose.addEventListener("click", () => elements.traceDialog.close()); elements.traceDone.addEventListener("click", () => elements.traceDialog.close()); elements.traceDialog.addEventListener("close", () => { traceActionNumber = null; returnFocus(); }); elements.qualityCommentForm.addEventListener("submit", addQualityComment);
elements.evidenceClose.addEventListener("click", () => elements.evidenceDialog.close()); elements.evidenceDone.addEventListener("click", () => elements.evidenceDialog.close()); elements.evidenceDialog.addEventListener("close", () => { evidenceRecordId = null; returnFocus(); }); elements.evidenceForm.addEventListener("submit", uploadEvidence);
elements.body.addEventListener("click", (event) => { const button = event.target.closest("button[data-command]"); if (!button) return; const action = actions.find((item) => item.id === button.dataset.recordId) || actions.find((item) => item.number === button.dataset.number); if (!action) return; if (button.dataset.command === "view") openView(action, button); if (button.dataset.command === "edit") openForm(action, button); if (button.dataset.command === "trace") openTrace(action, button); if (button.dataset.command === "delete") deleteAction(action); if (button.dataset.command === "evidence") openEvidence(action, button); });
elements.exportCsv.addEventListener("click", exportCsv); elements.csvImport.addEventListener("change", importCsv); elements.backup.addEventListener("click", exportBackup); elements.importInput.addEventListener("change", importBackup); elements.reset.addEventListener("click", resetDemo); document.querySelector("#filter-form").addEventListener("submit", (event) => event.preventDefault());
