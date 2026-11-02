# Premium UI implementation

The public landing page is available at `/welcome` and at `/` when signed out. Signed-in users retain their workspace at `/`. The landing preview and reminder timeline explicitly identify fictional demo data; account dashboards continue to read the existing authenticated API.

## Component map

- `ui/system.jsx`: DeadlineChip, SpendingStatCard's AnimatedMoney, SkeletonLoader, theme, timezone clock and reduced-motion configuration.
- `ui/premium.jsx`: TrialCountdownCard, SpendingStatCard, SubscriptionCard, RenewalTimeline, BudgetMeter, InsightCard, AnimatedTabs and tooltips.
- `ui/SubscriptionEditor.jsx`, `EditorSurface.jsx`, `DatePickerField.jsx`: grouped validation, desktop sheet, mobile dialog, calendar picker, dirty-state confirmation and focus restoration.
- `ui/NotificationCenter.jsx`: authenticated notifications, timestamps, unread indicators, individual/all read actions and empty state.
- `ui/CommandPalette.jsx`: Ctrl/Cmd+K, API subscription search, navigation and adding/editing plans. Shortcuts do not intercept typing fields.
- `ui/RechartsSpending.jsx`: real category totals, interactive chart and keyboard-operable exact-value legend. No invented trends.
- `ui/LandingPage.jsx`: one-time aurora entrance, editorial hero, interactive demo, varied feature grid, demo reminder timeline, magnetic pointer CTA, anchor navigation and footer.
- `components/ui/`: source-managed shadcn/ui primitives generated for JavaScript, backed by Radix and cmdk.
- `ui/design.css`, `ui/premium.css`, `shadcn.css`: shared color/spacing tokens, Tailwind mapping and responsive styling.

Dependencies were checked before installation: React 19, Tailwind 4, Motion 14 and Lucide remain compatible with Recharts 3.10.1 and the installed shadcn primitives. The production bundle separates chart, motion, component and shared vendor chunks. Fonts are bundled locally with system fallbacks.

## Data and interaction boundaries

The editor persists through the original CSRF-protected subscription endpoints. Trials remain excluded from paid totals. Budget and insight values come from the existing API. Rule-based findings are labeled explicitly; optional AI summaries retain the backend's configured/unavailable behavior. Tracker cancellation never claims to cancel a provider subscription. Reminder delivery still requires the backend scheduler.

## Verification

Automated checks cover authenticated CRUD, reminders, charts, themes, calendar, dirty-state handling, command search, shortcut exclusion while typing, notification read actions and mobile card menus. Responsive checks span 360–1600px. Axe WCAG A/AA checks exercise the landing page, dashboard and mobile editor; these supplement keyboard and visual checks rather than certify every possible state. All tests use a dedicated test database and remove their own fixture users.

Run `npm test`, `npm run test:integration`, `npm run test:browser`, `npm run build`, and `npm run test:production` from the project directory. Target a browser regression with `npm run test:browser -- tests/premium.spec.js`.

References: [shadcn JavaScript support](https://ui.shadcn.com/docs/javascript), [installation](https://ui.shadcn.com/docs/installation/manual), [Recharts installation](https://recharts.github.io/en-US/guide/installation/).
