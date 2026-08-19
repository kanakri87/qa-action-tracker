# QualityCore Internal Quality Action Tracker

QualityCore is a dependency-free, browser-based demonstration tool for managing fictional quality actions. It provides an operational dashboard and action register while keeping records entirely in the current browser. The application uses only HTML, CSS, and vanilla JavaScript, so it can be opened directly, served locally, or published with GitHub Pages.

## Features

- Live totals for all, incomplete, overdue, and completed actions
- Create and edit actions with accessible validation and automatic `QA-YYYY-NNN` numbering
- Read-only action detail view and confirmed deletion
- Immediate search across action content plus department and status filters
- Clear status and priority badges, explicit overdue labels, and responsive table scrolling
- UTF-8 CSV export of the currently visible records, with spreadsheet-formula protection
- Versioned JSON backup export and validated, confirmed restoration
- Browser `localStorage` persistence and confirmed demonstration-data reset
- Keyboard-friendly dialogs, focus management, live status messages, and reduced-motion support
- Responsive layouts for desktop, tablet, and mobile screens

## Run the application

### Open directly

Clone or download the repository and open `index.html` in a modern browser. Direct-file storage rules vary by browser, so using a local HTTP server is more predictable.

### Run a local server

From the repository directory, run:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

### GitHub Pages

The project has no build step or remote dependencies. Configure GitHub Pages to publish the repository's `main` branch, then open the Pages URL shown in the repository settings. Each browser profile and site origin (for example, the Pages URL versus `localhost`) has separate storage.

## Manage actions

### Add, view, edit, and delete

1. Select **+ New Action**, complete every field marked with an asterisk, and select **Save action**. The action number is generated for the current year and the last-update date is set automatically.
2. Use **View** to open every field in a read-only details dialog.
3. Use **Edit** to update the existing record. Saving replaces that record rather than making a duplicate.
4. Use **Delete**, verify that the confirmation names the intended action number, and explicitly confirm. Cancelling leaves the record unchanged.

A completed action requires a closure date, and its closure date cannot be earlier than its target date. Closing a changed form prompts before discarding unsaved information.

### Search and filter

Search updates as you type and covers action numbers, source information, descriptions, corrective actions, departments, owners, remarks, and effectiveness verification. Department and status filters can be combined with search. **Clear filters** restores the full register. The visible-record count and empty state update immediately.

An action is overdue only when its target date is before today and its status is not **Completed**. Open, In Progress, Under Review, and On Hold actions are counted as incomplete. Dashboard totals describe all stored actions, while the table and CSV export honor active filters.

## Export, restore, and reset

### CSV

Select **Export visible CSV** to download only the records matching the active search and filters. The dated UTF-8 file includes all supported fields, escapes quotes and line breaks correctly, and neutralizes values that spreadsheet software could interpret as formulas.

### JSON backup

Select **Export JSON Backup** to download every stored action, regardless of filters. The dated file includes backup version `1`, an ISO export timestamp, and all action fields. Export regular JSON backups, especially before clearing browser data, changing browsers, or resetting records.

### JSON restoration

1. Select **Import JSON Backup** and choose a `.json` backup.
2. The application validates its version, structure, required fields, source/status/priority values, dates, data types, and unique action numbers.
3. After successful validation, explicitly confirm replacement of the current dataset.

Malformed, incompatible, unsafe, or duplicate-number data is rejected without changing saved records. A successful import replaces all local actions and refreshes the interface immediately.

### Reset demonstration data

Select **Reset demo data** and read the confirmation warning. Confirming replaces every locally saved action with a fresh copy of the original fictional records without reloading the page. Export a JSON backup first if the current data may be needed.

## Browser storage and important limitations

Records are stored under the versioned `localStorage` key `qualityCore.qaActionTracker.v1`. Demonstration records are written only when that key does not exist, so refreshes do not reload or duplicate them. Changes persist after refresh or reopening the same site in the same browser profile. Storage failures and corrupt saved data produce a visible recovery message; corrupt stored values are not silently overwritten.

`localStorage` is specific to the browser profile and site origin. Data saved on GitHub Pages is separate from data saved on `localhost`, another port, another browser, private browsing, or a directly opened file. Storage can also be unavailable or temporary under privacy settings. Clearing site/browser data, browser policies, device loss, or storage eviction can permanently delete records.

> **Data safety warning:** This application is a demonstration browser tool, not a secure central database, controlled QMS repository, or multi-user system. It has no authentication, authorization, encryption management, audit trail, server backup, synchronization, or regulatory controls. Do not enter confidential, personal, regulated, customer, production, or project-sensitive information without an appropriate secure backend and organizational approval. Data is never transmitted by this application, but anyone with access to the browser profile may be able to access it.

Use fictional information for demonstrations and maintain regular exported JSON backups when experimenting with records.

## Project files

- `index.html` — semantic dashboard, register, forms, and dialogs
- `styles.css` — QualityCore visual system and responsive/accessibility styling
- `app.js` — validation, persistence, CRUD, filtering, calculations, and exports
