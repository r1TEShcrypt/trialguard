import cron from "node-cron";
import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { runReminders } from "./jobs/reminders.js";
const job = cron.schedule(
  process.env.REMINDER_CRON || "0 9 * * *",
  () =>
    runReminders().catch((e) =>
      console.error("Reminder job failed:", e.code || e.message),
    ),
  { timezone: config.timezone, noOverlap: true },
);
const server = app.listen(config.port, "127.0.0.1", () =>
  console.log(`TrialGuard API: http://127.0.0.1:${config.port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    job.stop();
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
