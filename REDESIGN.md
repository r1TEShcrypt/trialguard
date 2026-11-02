# TrialGuard command-center upgrade

Implemented in the existing React/Express/MySQL application. Authentication, ownership checks, persistence, reminders, calendar export, budgets, insights, and optional integrations continue to use the existing backend.

## Main files

- `frontend/src/ui/design.css`: centralized light/dark tokens, layered surfaces, responsive layouts, deadline colors, sticky header, independent sidebar scrolling, card/table layouts, and reduced-motion overrides.
- `frontend/src/ui/system.jsx`: theme preference, app-timezone clock, reusable deadline chips, Motion presets, number transitions, loading skeletons, section reveals, and animated success messages.
- `frontend/src/ui/Topbar.jsx`: breadcrumbs, desktop/mobile search, theme control, notification link, and account menu.
- `frontend/src/ui/DashboardView.jsx`: deadline-driven protection banner, calculated summary, budget status, renewal timeline, actual insights, and plan lineup.
- `frontend/src/ui/SpendingChart.jsx`: category donut, tooltips, focus/hover summaries, and keyboard/touch filter controls.
- `frontend/src/ui/TrialRadar.jsx`: nearest deadline, urgent section, timeline/calendar switching, calendar navigation, provider links, and tracker-only cancellation confirmation.
- `frontend/src/ui/SubscriptionEditor.jsx`: controlled form fields, inline validation, grouped sections, live summary, dirty-form confirmation, and before-unload protection.
- `frontend/src/main.jsx`: integration with existing pages, sidebar focus handling, animated navigation, status tabs, subscription transitions, and notification deadline chips.
- `frontend/package.json` and lockfile: Motion and self-hosted font packages. No external font request is required.
- `backend/src/controllers/subscriptions.js`: existing date sort now uses trial end dates for trials and renewal dates for paid plans.
- `backend/src/routes.js`: notification responses include the owned subscription's current status/deadline for consistent chips. Ownership remains enforced in the JOIN.
- `tests/design.spec.js`: additional real-database browser regression journey. The original browser journey remains in place.

## Verified after redesign

- Production frontend build passed.
- All 16 MySQL integration checks passed.
- Both browser journeys passed against the dedicated test database.
- Production smoke test passed, including SPA deep links and secure cookie attributes.
- Frontend dependency audit reported zero vulnerabilities.
- Inspected desktop dark/light, mobile dark/light, and trial-page screenshots.
- Checked all six pages for page-wide horizontal overflow at 360, 768, 1024, and 1600 pixels.
- Verified theme persistence across reload, category chart filtering, header search on desktop/mobile, status tabs, calendar navigation, cancellation confirmation, category preservation, invalid date errors, unsaved-change handling, reduced-motion mode, drawer scrolling, focus restoration, and deadline refresh after advancing the date and refocusing the tab.
- Original browser flow still verifies registration, CRUD, reminders, budgets, savings, exports, cancellation warnings, logout, and login.

## Preview files

- `preview-desktop.png`: dark desktop dashboard.
- `preview-desktop-light.png`: light desktop dashboard.
- `preview-mobile.png`: dark mobile dashboard.
- `preview-mobile-light.png`: light mobile dashboard.
- `preview-trials.png`: trial timeline with actionable deadlines.

Previews use fictional records created in the test database. Live screens use the signed-in user's actual database records.

## Deliberate limits

The full month calendar scrolls horizontally on narrow screens; the timeline remains the compact mobile alternative. Calendar countdowns use the configured app timezone, not an inferred device timezone. Theme preference is browser-local. UI testing used Chromium/Chrome; Safari and Firefox were not exercised here. Existing SMTP/AI credential requirements and external-delivery limitations remain unchanged. No fake trends, savings, activities, email scanning, or automatic provider cancellation were added.

Run `npm.cmd run dev` from the project directory. Existing configured local services use http://127.0.0.1:5173. Run `npm.cmd run test:browser` to repeat both browser journeys.
