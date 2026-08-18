"use strict";

const actions = [
  { number: "QA-2026-001", source: "Internal Audit", description: "Update supplier approval criteria and document the annual re-evaluation workflow.", department: "Procurement", person: "Maya Patel", targetDate: "2026-09-12", status: "In Progress", priority: "High", lastUpdate: "2026-08-14" },
  { number: "QA-2026-002", source: "Customer Feedback", description: "Reduce response time for product conformity certificates to two business days.", department: "Customer Service", person: "Daniel Kim", targetDate: "2026-07-30", status: "In Progress", priority: "High", lastUpdate: "2026-08-10" },
  { number: "QA-2026-003", source: "Management Review", description: "Introduce monthly calibration compliance reporting for critical measuring equipment.", department: "Quality", person: "Elena Rossi", targetDate: "2026-08-28", status: "Under Review", priority: "Medium", lastUpdate: "2026-08-16" },
  { number: "QA-2026-004", source: "Process Audit", description: "Revise line clearance checklist to include electronic sign-off verification.", department: "Operations", person: "Marcus Johnson", targetDate: "2026-06-21", status: "Completed", priority: "Medium", lastUpdate: "2026-06-18" },
  { number: "QA-2026-005", source: "Nonconformance", description: "Complete root-cause analysis for recurring packaging seal integrity failures.", department: "Engineering", person: "Sofia Alvarez", targetDate: "2026-08-08", status: "Open", priority: "High", lastUpdate: "2026-08-15" },
  { number: "QA-2026-006", source: "External Audit", description: "Formalize role-based training effectiveness checks for controlled procedures.", department: "People & Culture", person: "Noah Williams", targetDate: "2026-10-02", status: "Open", priority: "Medium", lastUpdate: "2026-08-07" },
  { number: "QA-2026-007", source: "Safety Observation", description: "Install visual inspection standards at all incoming material stations.", department: "Warehouse", person: "Aisha Rahman", targetDate: "2026-07-18", status: "Completed", priority: "High", lastUpdate: "2026-07-16" },
  { number: "QA-2026-008", source: "KPI Review", description: "Analyze first-pass yield trends and define improvement plans for the lowest performing line.", department: "Operations", person: "Liam Chen", targetDate: "2026-09-25", status: "In Progress", priority: "Medium", lastUpdate: "2026-08-12" },
  { number: "QA-2026-009", source: "Employee Suggestion", description: "Standardize document archive naming conventions across shared quality folders.", department: "Quality", person: "Grace Miller", targetDate: "2026-08-05", status: "Under Review", priority: "Low", lastUpdate: "2026-08-11" },
  { number: "QA-2026-010", source: "Customer Complaint", description: "Validate corrective measures for transit damage affecting export shipments.", department: "Logistics", person: "Owen Thompson", targetDate: "2026-09-04", status: "In Progress", priority: "High", lastUpdate: "2026-08-17" },
  { number: "QA-2026-011", source: "Internal Audit", description: "Close access-control gaps identified in the controlled document repository.", department: "Information Technology", person: "Priya Singh", targetDate: "2026-05-30", status: "Completed", priority: "High", lastUpdate: "2026-05-28" },
  { number: "QA-2026-012", source: "Risk Review", description: "Establish a secondary source for the single-source molded component family.", department: "Procurement", person: "Ethan Brooks", targetDate: "2026-11-14", status: "Open", priority: "Medium", lastUpdate: "2026-08-09" }
];

const elements = {
  body: document.querySelector("#action-body"), search: document.querySelector("#search-input"),
  department: document.querySelector("#department-filter"), status: document.querySelector("#status-filter"),
  clear: document.querySelector("#clear-button"), export: document.querySelector("#export-button"),
  empty: document.querySelector("#empty-state"), recordCount: document.querySelector("#record-count"),
  total: document.querySelector("#total-count"), open: document.querySelector("#open-count"),
  overdue: document.querySelector("#overdue-count"), completed: document.querySelector("#completed-count")
};

let visibleActions = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const parseDate = (date) => new Date(`${date}T00:00:00`);
const formatDate = (date) => new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(parseDate(date));
const isOverdue = (action) => action.status !== "Completed" && parseDate(action.targetDate) < today;
const statusClass = (status) => ({ Open: "status-open", "In Progress": "status-progress", "Under Review": "status-review", Completed: "status-completed" })[status];

function populateFilters() {
  [...new Set(actions.map(({ department }) => department))].sort().forEach((department) => elements.department.add(new Option(department, department)));
  [...new Set(actions.map(({ status }) => status))].sort().forEach((status) => elements.status.add(new Option(status, status)));
}

function getVisibleActions() {
  const query = elements.search.value.trim().toLowerCase();
  return actions.filter((action) => {
    const searchable = [action.number, action.source, action.description, action.department, action.person, action.priority].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (!elements.department.value || action.department === elements.department.value) && (!elements.status.value || action.status === elements.status.value);
  });
}

function render() {
  visibleActions = getVisibleActions();
  elements.body.innerHTML = visibleActions.map((action) => {
    const overdue = isOverdue(action);
    return `<tr${overdue ? ' class="overdue"' : ""}>
      <td><span class="action-number">${escapeHtml(action.number)}</span></td>
      <td>${escapeHtml(action.source)}</td>
      <td class="description">${escapeHtml(action.description)}</td>
      <td>${escapeHtml(action.department)}</td>
      <td class="person">${escapeHtml(action.person)}</td>
      <td class="date target-date">${formatDate(action.targetDate)}${overdue ? '<span class="overdue-label">Overdue</span>' : ""}</td>
      <td><span class="badge ${statusClass(action.status)}">${escapeHtml(action.status)}</span></td>
      <td><span class="badge priority-${action.priority.toLowerCase()}">${escapeHtml(action.priority)}</span></td>
      <td class="date">${formatDate(action.lastUpdate)}</td>
    </tr>`;
  }).join("");

  const completed = visibleActions.filter(({ status }) => status === "Completed").length;
  elements.total.textContent = visibleActions.length;
  elements.open.textContent = visibleActions.length - completed;
  elements.overdue.textContent = visibleActions.filter(isOverdue).length;
  elements.completed.textContent = completed;
  elements.recordCount.textContent = `Showing ${visibleActions.length} of ${actions.length} actions`;
  elements.empty.hidden = visibleActions.length !== 0;
  elements.export.disabled = visibleActions.length === 0;
}

function clearFilters() {
  elements.search.value = "";
  elements.department.value = "";
  elements.status.value = "";
  render();
  elements.search.focus();
}

function exportCsv() {
  const headings = ["Action Number", "Source", "Description", "Responsible Department", "Responsible Person", "Target Date", "Status", "Priority", "Last Update"];
  const fields = ["number", "source", "description", "department", "person", "targetDate", "status", "priority", "lastUpdate"];
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headings, ...visibleActions.map((action) => fields.map((field) => action[field]))].map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `quality-actions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

elements.search.addEventListener("input", render);
elements.department.addEventListener("change", render);
elements.status.addEventListener("change", render);
elements.clear.addEventListener("click", clearFilters);
elements.export.addEventListener("click", exportCsv);
document.querySelector("#filter-form").addEventListener("submit", (event) => event.preventDefault());
document.querySelector("#refresh-date").textContent = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(today);

populateFilters();
render();
