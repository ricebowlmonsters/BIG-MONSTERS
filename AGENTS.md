# AI Agent Guidance for BIG-MONSTERS

## What this repository is
- A mixed static web app + utility workspace for Rice Bowl Monster features.
- Primary features include QR-based point input and voucher claim flows, plus a thermal printer bridge service.
- The repo contains front-end HTML/CSS/JS, a Node-based printer server, and a Google Apps Script backend.

## Key files and areas to edit
- `README.md` — high-level app description and usage.
- `PROJECT_SUMMARY.md` and `SETUP_INSTRUCTIONS.md` — project goals and deployment steps.
- `app.js` — main front-end logic for the point/voucher app.
- `qr-scanner.js` — QR scanning and camera flow.
- `input-point.html`, `claim-vcr.html`, `demo.html` — user-facing pages for scanning and testing.
- `google-apps-script-enhanced.js` — backend logic intended for Google Apps Script deployment.
- `print-bridge.js` — thermal printer bridge entrypoint.
- `server.js` — Express static server and JSON database helper for local tooling.
- `package.json` — npm metadata; note `npm start` and `npm test` both run the print bridge script.

## Important conventions
- This is not a framework-based project. Expect plain JavaScript and static HTML/CSS.
- The repository uses mixed Indonesian/English comments and documentation.
- QR code format rules are important and should be preserved:
  - `POINT_<timestamp>_<user_id>_<amount>`
  - `VCR_<timestamp>_<voucher_id>_<user_id>`
- Avoid broad refactors without clear need; this repo appears to support existing live workflows.

## Run / build commands
- `npm start` — launches `node print-bridge.js`
- `npm test` — also runs `node print-bridge.js`
- `node server.js` — starts the Express helper server for local JSON storage and static file serving.

## Useful docs to link instead of duplicate
- [`README.md`](README.md)
- [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md)
- [`SETUP_INSTRUCTIONS.md`](SETUP_INSTRUCTIONS.md)
- [`PRINTER_SETUP_GUIDE.md`](PRINTER_SETUP_GUIDE.md)
- [`FIREBASE_INDEX_INSTRUCTIONS.md`](FIREBASE_INDEX_INSTRUCTIONS.md)

## Notes for AI agents
- If changing behavior, preserve the app's existing page flow and validation semantics.
- Do not assume there are automated tests; `package.json` does not define a test suite.
- Prefer updating one feature at a time and keep UI/script changes localized to relevant pages.
- If the task involves printer behavior, review `print-bridge.js` and `server-config.json` first.
