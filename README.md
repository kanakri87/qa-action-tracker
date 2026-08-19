# QualityCore Tasks / Actions Tracker

QualityCore Tasks / Actions Tracker is a dependency-free, browser-based tool for managing task and action records. It provides an operational dashboard and register while keeping records and evidence entirely in the current browser. The application uses only HTML, CSS, and vanilla JavaScript, so it can be opened directly, served locally, or published with GitHub Pages.

## Features

- Live totals for all, incomplete, overdue, and completed actions
- Create and edit actions with accessible validation and automatic `QA-YYYY-NNN` numbering
- Read-only action detail view and confirmed deletion
- Timestamped target-date amendment history with a per-action amendment count
- Append-only, timestamped Quality comments shown in an accessible traceability timeline
- Immediate search across action content plus department, status, and dedicated **Overdue only** filters
- Live quality-performance visualization with status distribution, closure rate, completion progress, and overdue follow-up guidance
- Clear status and priority badges, explicit overdue labels, and responsive table scrolling
- UTF-8 CSV export of the currently visible records, with spreadsheet-formula protection
- Validated CSV batch import for action lists prepared in Excel
- Versioned JSON backup export and validated, confirmed restoration, including evidence attachments
- Record persistence in `localStorage`, evidence Blob storage in IndexedDB, and confirmed demonstration-data reset
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

## Manage records

### Add, view, edit, and delete

1. Select **+ New Action**, complete every field marked with an asterisk, and select **Save action**. The action number is generated for the current year and the last-update date is set automatically.
2. Use **View** to open every field in a read-only details dialog.
3. Use **Edit** to update the existing record. Saving replaces that record rather than making a duplicate.
4. Use **Delete**, verify that the confirmation names the intended action number, and explicitly confirm. Cancelling leaves the record unchanged.

A completed action requires a closure date, and its closure date cannot be earlier than its target date. Closing a changed form prompts before discarding unsaved information.

### Target-date history and Quality comments

Whenever an existing action is saved with a different Target Date, the application records the previous date, new date, and exact amendment timestamp. The register shows the number of amendments under each target date. Select that count—or the action's **Comments** control—to open the vertical traceability timeline.

The same traceability dialog includes an append-only **Quality comment** field. Each comment is stored with the author label **Quality** and its exact date and time. Comments cannot be edited or deleted individually in the interface. Deleting the complete action also deletes its traceability history after confirmation.

Existing records and older backups begin with zero historical amendments because the application cannot reconstruct changes made before this feature was installed. Tracking starts with the first future target-date change.

> **Traceability limitation:** This is operational browser traceability, not a tamper-proof regulated audit trail. Anyone who can alter browser storage or import a modified JSON backup may alter the data. Use an approved authenticated server and controlled database when formal QMS audit-trail requirements apply.

### Search and filter

Search updates as you type and covers action numbers, source information, descriptions, corrective actions, departments, owners, remarks, and effectiveness verification. Department and status filters can be combined with search. Select **Overdue only** in the Status filter to isolate incomplete records whose target date is before today. **Clear filters** restores the full register. The visible-record count and empty state update immediately.

An action is overdue only when its target date is before today and its status is not **Completed**. Open, In Progress, Under Review, and On Hold actions are counted as incomplete. Dashboard totals describe all stored actions, while the table and CSV export honor active filters.


## Evidence attachments

Every register row ends with **Evidence (N)**, where *N* is the current attachment count. Open it to see the related action number and description, choose one or more files, and optionally add a short evidence note. The dialog lists file name, type, size, attachment date, and note. Each file can be opened/previewed (subject to browser support), downloaded, or deleted after confirmation.

Supported extensions are PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX, CSV, and TXT. Each file is limited to **5 MB**. Unsupported and oversized selections are rejected with an on-screen message. Office-document preview depends on the browser and installed software; downloading remains available.

Evidence is linked to a stable internal record ID, so editing record details or the displayed action number does not disconnect it. Deleting a record also deletes its evidence after the record deletion confirmation. Files are stored as Blobs in browser IndexedDB—never as binary data in `localStorage`.

> **Evidence privacy notice:** Attachments remain in the current browser and device unless included in a JSON backup. Clearing browser/site data can permanently remove both records and evidence. This static application provides no authentication, server storage, encryption, multi-user access, or access control. Attach confidential company documents only when permitted by company policy.

## Export, restore, and reset

### CSV

Select **Export visible CSV** to download only the records matching the active search and filters. The dated UTF-8 file includes all supported fields, escapes quotes and line breaks correctly, and neutralizes values that spreadsheet software could interpret as formulas.

### CSV batch import

Prepare the action list in Excel, save it as **CSV UTF-8 (Comma delimited)**, and select **Import CSV**. The importer accepts the same column headings produced by **Export visible CSV**. Action Number, Status, Priority, and Last Update may be blank: the app generates the next `QA-YYYY-NNN` number and defaults blank values to **Open**, **Medium**, and today. Dates may use `YYYY-MM-DD` or day-first `DD/MM/YYYY` / `DD-MM-YYYY`.

The CSV must include Source, Action Description, Required Corrective Action, Responsible Department, Responsible Person, and Target Date. It validates every row, allowed source/status/priority values, dates, required fields, and duplicate action numbers before asking for confirmation. A successful import appends the validated rows; it never partially imports a file or replaces existing actions.

CSV is a flat record format and does not carry target-date amendment history or Quality comments. New CSV-imported actions start with empty traceability timelines. Use JSON backup for complete preservation of actions and their nested traceability data.

### JSON backup

Select **Export JSON Backup** to download every stored record and evidence attachment, regardless of filters. Version 2 backups contain record fields, target-date amendment history, Quality comments, attachment metadata, notes, and base64-encoded file content. Evidence-inclusive JSON can be large because binary content grows when encoded. Export regular backups before clearing browser data, changing browsers, or resetting records. CSV remains record-data only and never includes attachments.

### JSON restoration

1. Select **Import JSON Backup** and choose a `.json` backup.
2. The application validates its version, structure, required fields, source/status/priority values, dates, data types, and unique action numbers.
3. Review the displayed record and attachment counts, then explicitly confirm replacement of the current browser dataset. Existing data is never silently overwritten.

Malformed, incompatible, unsafe, duplicate-number, unsupported, oversized, incorrectly encoded, or mismatched attachment data is rejected before changes are made. Older version 1 JSON backups without attachments remain supported and restore with zero evidence files. A successful confirmed import replaces the local records and attachments and refreshes the interface.

### Reset demonstration data

Select **Reset demo data** and read the confirmation warning. Confirming replaces every locally saved action with a fresh copy of the original fictional records without reloading the page. Export a JSON backup first if the current data may be needed.

## Browser storage and important limitations

Record data is stored under the versioned `localStorage` key `qualityCore.qaActionTracker.v1`. Demonstration records are written only when that key does not exist, so refreshes do not reload or duplicate them. Changes persist after refresh or reopening the same site in the same browser profile. Storage failures and corrupt saved data produce a visible recovery message; corrupt stored values are not silently overwritten.

`localStorage` is specific to the browser profile and site origin. Data saved on GitHub Pages is separate from data saved on `localhost`, another port, another browser, private browsing, or a directly opened file. Storage can also be unavailable or temporary under privacy settings. Evidence Blobs are stored separately in IndexedDB for the same origin. Clearing site/browser data, browser policies, device loss, private browsing, storage quotas, or storage eviction can permanently delete records and evidence.

> **Data safety warning:** This application is a demonstration browser tool, not a secure central database, controlled QMS repository, or multi-user system. It has no authentication, authorization, encryption management, audit trail, server backup, synchronization, or regulatory controls. Do not enter confidential, personal, regulated, customer, production, or project-sensitive information without an appropriate secure backend and organizational approval. Data is never transmitted by this application, but anyone with access to the browser profile may be able to access it.

Use fictional information for demonstrations and maintain regular exported JSON backups when experimenting with records.

## Project files

- `index.html` — semantic dashboard, register, forms, and dialogs
- `styles.css` — QualityCore visual system and responsive/accessibility styling
- `app.js` — validation, persistence, CRUD, CSV/JSON import and export, filtering, calculations, live visualization, and action traceability
