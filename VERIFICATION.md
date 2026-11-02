# Verification and current workspace

**Design upgrade:** The command-center redesign has been implemented and reverified. Both browser journeys now pass, covering six pages at four viewport widths, themes, deadline refresh, chart controls, calendar navigation, and editor safety. The 16 MySQL integration checks, production build, and production smoke test also pass. See `REDESIGN.md` for the current UI file map and screenshots. The original verification below documents the baseline application checks.

Verified on 2 November 2026 using Node.js 26.10.0, MySQL Community Server 8.0.46, Vite 7.3.7, and headless Google Chrome.

| Check | Result |
| --- | --- |
| `npm.cmd test` | 7 passing tests: decimal calculations, exclusions, dates, validation, insights, and explicit database-outage behavior |
| `npm.cmd run test:integration` | 16 passing checks (15 subtests plus their parent), against the dedicated `trialguard_test` MySQL database |
| `npm.cmd run test:browser` | 1 complete end-to-end journey passed; desktop 1440×1100 and mobile 390×844; no browser page errors |
| `npm.cmd run build` | Production frontend built successfully |
| `npm.cmd run test:production` | Built SPA deep link and HTTP-only, Secure, SameSite, host-only cookie checks passed |
| `npm.cmd run db:migrate` | Initial schema applied; subsequent runs detect the applied version |
| `npm.cmd run db:seed` | Fictional demo account and six plans persisted in the development database |
| `npm.cmd run reminders` | Two in-app demo reminders created; email reported unavailable |
| `/api/health` | `status: ok`, `database: connected` |
| `npm.cmd audit` (root, backend, frontend) | Zero reported vulnerabilities in all three dependency trees |
| Desktop/mobile visual review | Screenshots inspected; no mobile horizontal overflow; responsive navigation and dialogs exercised |

The browser journey covers registration → trial creation → calendar download → reminder job → notification read → budget change → confirmed trial conversion → calculated paid spending → savings selection → search → cancellation warning → delete confirmation/cancellation → mobile navigation → logout → login. It also checks that editing preserves the selected category after asynchronous category loading.

The test runner launches direct Node child processes and closes them after testing. This avoids Windows shell-tree shutdown hangs. It uses isolated test ports 3002/5174 and refuses to reuse occupied ports. Browser temporary files and screenshots go under the task's `work/` directory. Test data is removed by deleting only users created by that run; no database is reset.

## Already configured in this workspace

Dependencies are installed. A separate MySQL instance was initialized exclusively under this task's `work/mysql-data` directory, listening on `127.0.0.1:3308`. Existing MySQL installations/data were not changed. Random database credentials are in gitignored `backend/.env` and `backend/.env.test`; the isolated instance's administrator credential is in the task's private `work/mysql-admin.txt`. No credentials are included in the source archive.

The development API and frontend were left running at:

- Frontend: http://127.0.0.1:5173
- API health: http://127.0.0.1:3001/api/health

Create your own account in the browser. The optional fictional demo account is `demo@trialguard.local`; its randomly generated local password is the `DEMO_PASSWORD` entry in `backend/.env`. Authentication records in MySQL store only bcrypt hashes.

If the background processes stop, use the following from the project folder. Do not copy `.env.example` over the configured `.env` files:

```powershell
.\scripts\start-workspace-mysql.ps1
npm.cmd run dev
```

The helper restarts only the already-initialized workspace database and never initializes, resets, or deletes data. If using the source archive elsewhere, follow the README's Docker or existing-MySQL setup instead.

## Configuration still required for optional/deployed features

- **SMTP:** No real mail credentials were supplied. In-app reminders and SMTP-unavailable reporting passed; delivery through an external mail server was not verified.
- **AI:** No backend AI key was supplied. The unavailable UI state and working rule-based insights were verified; real external AI responses were not verified.
- **Production hosting:** Build output, deep-link serving, security headers, and Secure cookie attributes were tested. A real HTTPS reverse proxy, DNS, TLS certificate, and public deployment were not configured or tested.
- **Docker:** The Compose configuration is included, but Docker was unavailable here; database checks used the installed MySQL binary instead.
- **Calendar notifications:** A valid all-day ICS download with 3-day and 1-day alarms was tested. Delivery of alerts inside a third-party calendar application was not tested.

The backend must be running when scheduled reminders are due. Missed past dates are not backfilled. Failed/ambiguous SMTP sends require an operator to inspect delivery records before retrying. These limitations are documented in the README.

## Premium UI verification — 3 November 2026

- Backend unit/outage tests: 7 passed.
- MySQL integration assertions: 16 passed.
- Browser journeys: existing end-to-end account/CRUD/reminder flow passed; responsive/theme/deadline flow passed; premium landing/command/calendar/notification/mobile-card flow passed.
- Axe WCAG A/AA scans: no violations in the tested landing, light dashboard, command palette, notification empty state, light/dark mobile subscription cards and dark mobile editor states.
- Responsive overflow checks: workspace routes at 360, 768, 1024 and 1600px; landing at 360, 768 and 1440px.
- Production build: passed with separated bundles, no oversized-chunk warning. Production static-route/cookie smoke test passed.
- Frontend production dependency audit: zero known vulnerabilities at verification time.
- Live local health check: frontend HTTP 200; API reports database connected.

Screenshots use isolated fictional test records. No live account records were reset. External AI/SMTP delivery remains dependent on the user's service configuration.
