# Internal Quality Action Tracker

A responsive, browser-based dashboard for monitoring internal quality actions, ownership, deadlines, and completion progress. The application is built with HTML, CSS, and vanilla JavaScript and does not require a build step or third-party dependencies.

## Open locally

### Option 1: Open the file directly

1. Clone or download this repository.
2. Open `index.html` in a modern web browser.

### Option 2: Run a local web server

From the repository directory, run:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser. Stop the server with <kbd>Ctrl</kbd> + <kbd>C</kbd>.

## Features

- Dashboard totals for all, open, overdue, and completed actions
- Search by action number, source, description, department, or owner
- Department and status filters with a one-click reset
- Automatic highlighting of overdue, incomplete actions
- CSV export containing only the currently visible records
- Add, view, edit, and delete actions with validation and delete confirmation
- JSON backup and validated restore for transferring or safeguarding records
- Reset option for restoring the original, fictional demonstration records
- Responsive layouts for desktop, tablet, and mobile screens

## Managing data

Use **New Action** to create a record; its `QA-YYYY-NNN` action number is assigned automatically. The controls at the end of each table row allow the complete record to be viewed, edited, or deleted. Deletion always requires confirmation.

- **Export visible CSV** downloads only the rows matching the current search and filters.
- **Backup JSON** downloads every action and all of its fields.
- **Restore JSON** validates a selected backup before asking permission to replace the current records. Invalid, incomplete, duplicate, or unsupported records are rejected with an error message.
- **Reset demo data** replaces all current records with the original fictional sample set after confirmation.

## Storage and limitations

Records are stored only in the browser's `localStorage` for the site or file location where the application is opened. Sample data is installed only when no saved dataset exists. Changes persist across refreshes in the same browser profile, but they are **not** synchronized between browsers, devices, users, or private-browsing sessions.

Clearing browser/site data, changing the address used to open the app, or browser storage restrictions may remove or isolate records. Create regular JSON backups, especially before clearing browser data or moving to another computer. This static demonstration app has no authentication, server database, audit trail, concurrent editing, or automated recovery; do not enter confidential, personal, or production information.

## Project files

- `index.html` — application structure and accessible controls
- `styles.css` — branded, responsive presentation
- `app.js` — sample data, filtering, summary calculations, and CSV export
