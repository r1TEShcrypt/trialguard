# Local MySQL and Workbench

The backend runs directly on Windows and now uses local MySQL at `localhost:3306`, database `trialguard`. Credentials live only in ignored `backend/.env`. To change the password, open that file locally and edit `DB_PASSWORD`; never put it in frontend files or commit it. `.env.example` contains placeholders only.

The former isolated server at port 3308 has not been modified. Accounts and subscriptions stored there are not automatically copied to 3306. Create an account on the newly connected database before adding plans.

## Start from PowerShell

From the project directory:

```powershell
npm.cmd install
npm.cmd run setup
# Only if backend/.env does not already exist:
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
notepad backend/.env
npm.cmd run db:migrate
npm.cmd run dev
```

Enter your MySQL password in Notepad, save and close it. Keep DB_HOST=localhost, DB_PORT=3306, DB_USER=root and DB_NAME=trialguard for this local setup. Do not overwrite an existing .env with the example. If both applications are already running, stop their existing terminal with Ctrl+C before starting them again. Alternatively run `npm.cmd run dev --prefix backend` and `npm.cmd run dev --prefix frontend` in separate terminals.

The migration command creates the database only when missing, then applies versioned SQL files not already recorded in `schema_migrations`. It never drops tables or overwrites records. If an existing, incompatible table is found, the migration fails rather than resetting it. `backend/schema.sql` is a readable reference, not a second script to run after migrations.

## Workbench connection and verification

1. Open MySQL Workbench and add a connection with Connection Method **Standard (TCP/IP)**, Hostname **localhost**, Port **3306**, Username **root**. Enter the password in Workbench's password prompt or local vault. Test Connection and open it.
2. In the left Navigator, select **Schemas**, click the refresh icon (or right-click and select **Refresh All**).
3. Expand **trialguard → Tables**. You should see users, sessions, categories, subscriptions, budgets, notifications, reminder_deliveries and schema_migrations.
4. Visit http://127.0.0.1:5173, register/sign in, and add a subscription with a recognizable name such as `Workbench verification`. Save it.
5. In Workbench, right-click **subscriptions → Select Rows - Limit 1000**, or run:

```sql
SELECT s.id, u.email, s.service_name, s.price, s.billing_cycle,
       s.status, s.next_billing_date
FROM trialguard.subscriptions AS s
JOIN trialguard.users AS u ON u.id = s.user_id
WHERE s.service_name = 'Workbench verification'
ORDER BY s.id DESC;
```

Refresh/re-execute the query after frontend edits. Use the frontend for ordinary plan changes so API validation and ownership checks run; Workbench's root user can access every user's records.

Check connectivity with:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/health
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:browser
npm.cmd run build
npm.cmd run test:production
```

Tests use the separate ignored `.env.test` configuration and dedicated test database, not the new application database. Email and AI still require their optional service credentials. No application-record localStorage fallback exists; localStorage is used only for theme preference.

## Docker distinction

This backend is running on Windows, not inside Docker, so localhost is correct. If the backend is later containerized while MySQL stays on Windows, configure DB_HOST=host.docker.internal. If MySQL and the backend share a Compose network, use the MySQL service name instead. Never assume container localhost refers to the Windows host.
