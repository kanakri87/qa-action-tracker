"use strict";

const STORAGE_KEY = "qualityCore.actions.v1";
const SOURCES = ["Internal Audit", "NCR", "Customer Complaint", "Site Feedback", "Supplier NCR", "Management Review", "EQM/ECAS", "ADNOC/CCTC", "Calibration", "Other"];
const STATUSES = ["Open", "In Progress", "Under Review", "On Hold", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];
const REQUIRED_FIELDS = ["number", "source", "description", "correctiveAction", "department", "person", "targetDate", "status", "priority", "lastUpdate"];
const FIELDS = ["number", "source", "sourceReference", "description", "correctiveAction", "department", "person", "targetDate", "status", "priority", "lastUpdate", "remarks", "effectiveness", "closureDate"];
const isoToday = () => new Date().toISOString().slice(0, 10);

const demoActions = [
  ["QA-2026-001", "Internal Audit", "IA-26-014", "Update supplier approval criteria and document annual re-evaluation.", "Approve revised procedure and brief all procurement staff.", "Procurement", "Maya Patel", "2026-09-12", "In Progress", "High", "2026-08-14", "Draft QP-07 attached.", "Pending implementation.", ""],
  ["QA-2026-002", "Customer Complaint", "CC-1048", "Reduce response time for product conformity certificates.", "Map handoffs and implement a two-business-day service target.", "Customer Service", "Daniel Kim", "2026-07-30", "In Progress", "High", "2026-08-10", "Workflow review completed.", "Measure response time for 30 days.", ""],
  ["QA-2026-003", "Management Review", "MR-2026-02", "Introduce monthly calibration compliance reporting.", "Publish a dashboard for critical measuring equipment.", "Quality", "Elena Rossi", "2026-08-28", "Under Review", "Medium", "2026-08-16", "Report prototype submitted.", "Quality manager review scheduled.", ""],
  ["QA-2026-004", "NCR", "NCR-26031", "Revise line clearance checklist to include electronic sign-off.", "Validate and release the revised production checklist.", "Operations", "Marcus Johnson", "2026-06-21", "Completed", "Medium", "2026-06-18", "Checklist FRM-OP-19 rev 4.", "Three compliant production runs verified.", "2026-06-18"],
  ["QA-2026-005", "NCR", "NCR-26047", "Investigate recurring packaging seal integrity failures.", "Complete root-cause analysis and validate sealing parameters.", "Engineering", "Sofia Alvarez", "2026-08-08", "Open", "High", "2026-08-15", "Samples retained in lab.", "Not yet verified.", ""],
  ["QA-2026-006", "Internal Audit", "IA-26-021", "Formalize role-based training effectiveness checks.", "Add supervisor verification to controlled procedure training.", "People & Culture", "Noah Williams", "2026-10-02", "Open", "Medium", "2026-08-07", "Training matrix under review.", "Review after first training cycle.", ""],
  ["QA-2026-007", "Site Feedback", "SF-26018", "Install visual standards at incoming material stations.", "Post approved defect examples at every inspection point.", "Warehouse", "Aisha Rahman", "2026-07-18", "Completed", "High", "2026-07-16", "Photo evidence EV-007.", "Spot audit passed with no findings.", "2026-07-16"],
  ["QA-2026-008", "Management Review", "KPI-2026-07", "Analyze first-pass yield trends on the lowest performing line.", "Define and assign improvement actions from the trend review.", "Operations", "Liam Chen", "2026-09-25", "In Progress", "Medium", "2026-08-12", "Six-month trend prepared.", "Verify against October yield result.", ""],
  ["QA-2026-009", "Site Feedback", "SF-26024", "Standardize document archive naming conventions.", "Publish and apply a shared quality-folder naming standard.", "Quality", "Grace Miller", "2026-08-05", "Under Review", "Low", "2026-08-11", "Convention draft DOC-STD-03.", "Sample folder audit pending.", ""],
  ["QA-2026-010", "Customer Complaint", "CC-1091", "Validate measures for transit damage affecting shipments.", "Complete packaging trial and update handling instruction.", "Logistics", "Owen Thompson", "2026-09-04", "In Progress", "High", "2026-08-17", "Trial shipment dispatched.", "Inspect trial shipment on arrival.", ""]
].map((values) => Object.fromEntries(FIELDS.map((field, index) => [field, values[index]])));

const $ = (selector) => document.querySelector(selector);
const elements = { body: $("#action-body"), search: $("#search-input"), department: $("#department-filter"), status: $("#status-filter"), clear: $("#clear-button"), csv: $("#export-button"), backup: $("#backup-button"), import: $("#import-input"), reset: $("#reset-button"), newAction: $("#new-action-button"), empty: $("#empty-state"), recordCount: $("#record-count"), total: $("#total-count"), open: $("#open-count"), overdue: $("#overdue-count"), completed: $("#completed-count"), formDialog: $("#action-dialog"), viewDialog: $("#view-dialog"), form: $("#action-form"), formTitle: $("#form-title"), formError: $("#form-error"), details: $("#action-details") };
let actions = [];
let visibleActions = [];
let editingNumber = null;
const today = new Date(); today.setHours(0, 0, 0, 0);

function cloneDemo() { return demoActions.map((action) => ({ ...action })); }
function validDate(value, optional = false) { return optional && !value ? true : /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).valueOf()); }
function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return "Each record must be a JSON object.";
  if (REQUIRED_FIELDS.some((field) => typeof record[field] !== "string" || !record[field].trim())) return `Record ${record.number || "(unknown)"} is missing a required field.`;
  if (!/^QA-\d{4}-\d{3,}$/.test(record.number)) return `${record.number} has an invalid action number.`;
  if (!SOURCES.includes(record.source) || !STATUSES.includes(record.status) || !PRIORITIES.includes(record.priority)) return `${record.number} contains an unsupported source, status, or priority.`;
  if (![record.targetDate, record.lastUpdate].every((date) => validDate(date)) || !validDate(record.closureDate, true)) return `${record.number} contains an invalid date.`;
  if (FIELDS.some((field) => record[field] != null && typeof record[field] !== "string")) return `${record.number} contains a non-text field.`;
  return "";
}
function normalize(record) { return Object.fromEntries(FIELDS.map((field) => [field, String(record[field] ?? "").trim()])); }
function validateCollection(value) {
  if (!Array.isArray(value)) return "Backup must contain a JSON array of action records.";
  const normalized = value.map(normalize);
  for (const record of normalized) { const error = validateRecord(record); if (error) return error; }
  if (new Set(normalized.map(({ number }) => number)).size !== normalized.length) return "Action numbers must be unique.";
  return normalized;
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(actions)); }
function load() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) { actions = cloneDemo(); save(); return; }
  try { const parsed = validateCollection(JSON.parse(stored)); if (typeof parsed === "string") throw new Error(parsed); actions = parsed; }
  catch (error) { actions = []; alert(`Stored action data could not be loaded: ${error.message}. Use “Reset demo data” to recover.`); }
}

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const parseDate = (date) => new Date(`${date}T00:00:00`);
const formatDate = (date) => date ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(parseDate(date)) : "—";
const isOverdue = (action) => action.status !== "Completed" && parseDate(action.targetDate) < today;
const statusClass = (status) => ({ Open: "status-open", "In Progress": "status-progress", "Under Review": "status-review", "On Hold": "status-hold", Completed: "status-completed" })[status];

function rebuildDepartmentFilter() {
  const selected = elements.department.value;
  elements.department.replaceChildren(new Option("All departments", ""));
  [...new Set(actions.map(({ department }) => department))].sort().forEach((value) => elements.department.add(new Option(value, value)));
  elements.department.value = [...elements.department.options].some(({ value }) => value === selected) ? selected : "";
}
function getVisibleActions() {
  const query = elements.search.value.trim().toLowerCase();
  return actions.filter((action) => (!query || FIELDS.some((field) => action[field].toLowerCase().includes(query))) && (!elements.department.value || action.department === elements.department.value) && (!elements.status.value || action.status === elements.status.value));
}
function render() {
  rebuildDepartmentFilter(); visibleActions = getVisibleActions();
  elements.body.innerHTML = visibleActions.map((action) => `<tr${isOverdue(action) ? ' class="overdue"' : ""}>
    <td><span class="action-number">${escapeHtml(action.number)}</span><span class="subtext">${escapeHtml(action.sourceReference || "No reference")}</span></td><td>${escapeHtml(action.source)}</td><td class="description">${escapeHtml(action.description)}</td><td>${escapeHtml(action.department)}</td><td class="person">${escapeHtml(action.person)}</td>
    <td class="date target-date">${formatDate(action.targetDate)}${isOverdue(action) ? '<span class="overdue-label">Overdue</span>' : ""}</td><td><span class="badge ${statusClass(action.status)}">${escapeHtml(action.status)}</span></td><td><span class="badge priority-${action.priority.toLowerCase()}">${action.priority}</span></td><td class="date">${formatDate(action.lastUpdate)}</td>
    <td><div class="row-actions"><button class="row-button" type="button" data-action="view" data-number="${action.number}">View</button><button class="row-button" type="button" data-action="edit" data-number="${action.number}">Edit</button><button class="row-button delete" type="button" data-action="delete" data-number="${action.number}">Delete</button></div></td></tr>`).join("");
  const completed = visibleActions.filter(({ status }) => status === "Completed").length;
  elements.total.textContent = visibleActions.length; elements.open.textContent = visibleActions.length - completed; elements.overdue.textContent = visibleActions.filter(isOverdue).length; elements.completed.textContent = completed;
  elements.recordCount.textContent = `Showing ${visibleActions.length} of ${actions.length} actions`; elements.empty.hidden = visibleActions.length > 0; elements.csv.disabled = visibleActions.length === 0;
}
function generateNumber() {
  const year = new Date().getFullYear();
  const max = actions.filter(({ number }) => number.startsWith(`QA-${year}-`)).reduce((value, { number }) => Math.max(value, Number(number.split("-").at(-1)) || 0), 0);
  return `QA-${year}-${String(max + 1).padStart(3, "0")}`;
}
function openForm(action = null) {
  editingNumber = action?.number || null; elements.form.reset(); elements.formError.hidden = true;
  elements.formTitle.textContent = action ? `Edit ${action.number}` : "New quality action";
  const values = action || { number: generateNumber(), status: "Open", priority: "Medium", lastUpdate: isoToday() };
  FIELDS.forEach((field) => { const control = elements.form.elements[field]; if (control) control.value = values[field] || ""; });
  elements.formDialog.showModal(); elements.form.elements.source.focus();
}
function showError(message, control) { elements.formError.textContent = message; elements.formError.hidden = false; if (control) { control.setAttribute("aria-invalid", "true"); control.focus(); } }
function submitForm(event) {
  event.preventDefault(); elements.form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid")); elements.formError.hidden = true;
  if (!elements.form.checkValidity()) { const invalid = elements.form.querySelector(":invalid"); showError(`Please complete “${invalid.labels?.[0]?.textContent.replace("*", "").trim() || "required field"}”.`, invalid); return; }
  const record = normalize(Object.fromEntries(new FormData(elements.form)));
  const error = validateRecord(record); if (error) { showError(error); return; }
  if (record.status === "Completed" && !record.closureDate) { showError("A closure date is required when status is Completed.", elements.form.elements.closureDate); return; }
  if (record.closureDate && record.status !== "Completed") { showError("Closure date can only be set for a Completed action.", elements.form.elements.closureDate); return; }
  const index = actions.findIndex(({ number }) => number === editingNumber);
  if (index >= 0) actions[index] = record; else actions.push(record);
  save(); elements.formDialog.close(); render();
}
function viewAction(action) {
  $("#view-title").textContent = action.number;
  const labels = { number: "Action number", source: "Source", sourceReference: "Source reference", description: "Action description", correctiveAction: "Required corrective action", department: "Responsible department", person: "Responsible person", targetDate: "Target date", status: "Status", priority: "Priority", lastUpdate: "Last update", remarks: "Remarks / evidence", effectiveness: "Effectiveness verification", closureDate: "Closure date" };
  elements.details.innerHTML = FIELDS.map((field) => `<div class="${["description", "correctiveAction", "remarks", "effectiveness"].includes(field) ? "detail-wide" : ""}"><dt>${labels[field]}</dt><dd>${escapeHtml(field.toLowerCase().includes("date") ? formatDate(action[field]) : action[field] || "—")}</dd></div>`).join("");
  elements.viewDialog.showModal();
}
function handleRowAction(event) {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const index = actions.findIndex(({ number }) => number === button.dataset.number); if (index < 0) return;
  if (button.dataset.action === "view") viewAction(actions[index]);
  if (button.dataset.action === "edit") openForm(actions[index]);
  if (button.dataset.action === "delete" && confirm(`Delete ${actions[index].number}? This cannot be undone.`)) { actions.splice(index, 1); save(); render(); }
}
function download(name, type, content) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function exportCsv() {
  const headings = ["Action Number", "Source", "Source Reference", "Description", "Required Corrective Action", "Responsible Department", "Responsible Person", "Target Date", "Status", "Priority", "Last Update", "Remarks or Evidence", "Effectiveness Verification", "Closure Date"];
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headings, ...visibleActions.map((action) => FIELDS.map((field) => action[field]))].map((row) => row.map(quote).join(",")).join("\r\n"); download(`quality-actions-visible-${isoToday()}.csv`, "text/csv;charset=utf-8", `\ufeff${csv}`);
}
async function importBackup(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return;
  try { const parsed = validateCollection(JSON.parse(await file.text())); if (typeof parsed === "string") throw new Error(parsed); if (!confirm(`Restore ${parsed.length} actions from this backup? Current records will be replaced.`)) return; actions = parsed; save(); render(); alert("Backup restored successfully."); }
  catch (error) { alert(`Import failed: ${error.message}`); }
}

STATUSES.forEach((value) => elements.status.add(new Option(value, value)));
SOURCES.forEach((value) => elements.form.elements.source.add(new Option(value, value)));
STATUSES.forEach((value) => elements.form.elements.status.add(new Option(value, value)));
elements.search.addEventListener("input", render); elements.department.addEventListener("change", render); elements.status.addEventListener("change", render);
elements.clear.addEventListener("click", () => { elements.search.value = elements.department.value = elements.status.value = ""; render(); elements.search.focus(); });
elements.newAction.addEventListener("click", () => openForm()); elements.form.addEventListener("submit", submitForm); elements.body.addEventListener("click", handleRowAction);
elements.csv.addEventListener("click", exportCsv); elements.backup.addEventListener("click", () => download(`quality-actions-backup-${isoToday()}.json`, "application/json", JSON.stringify(actions, null, 2))); elements.import.addEventListener("change", importBackup);
elements.reset.addEventListener("click", () => { if (confirm("Reset all records to the original demonstration data? Current records will be replaced.")) { actions = cloneDemo(); save(); render(); } });
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => elements.formDialog.close())); document.querySelectorAll("[data-view-close]").forEach((button) => button.addEventListener("click", () => elements.viewDialog.close()));
[elements.formDialog, elements.viewDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
$("#filter-form").addEventListener("submit", (event) => event.preventDefault()); $("#refresh-date").textContent = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(today);
load(); render();
