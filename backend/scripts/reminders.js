import { runReminders } from "../src/jobs/reminders.js";
import { pool } from "../src/db.js";
try {
  console.log(await runReminders());
} catch (e) {
  console.error("Reminders failed:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
