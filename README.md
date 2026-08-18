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
- Responsive layouts for desktop, tablet, and mobile screens

## Project files

- `index.html` — application structure and accessible controls
- `styles.css` — branded, responsive presentation
- `app.js` — sample data, filtering, summary calculations, and CSV export
