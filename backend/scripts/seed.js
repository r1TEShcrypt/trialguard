import bcrypt from "bcrypt";
import { config } from "../src/config.js";
import { query, transaction, pool } from "../src/db.js";
import { today, addDays } from "../src/services/dates.js";
if (config.env === "production")
  throw new Error("Development seed is disabled in production.");
try {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error(
      "Set DEMO_PASSWORD to a 12+ character password (maximum 72 bytes).",
    );
  const passwordHash = await bcrypt.hash(password, 12);
  const date = today();
  await transaction(async (c) => {
    if (
      (
        await query(
          "SELECT id FROM users WHERE email=?",
          ["demo@trialguard.local"],
          c,
        )
      ).length
    )
      throw new Error(
        "Demo user already exists; seed does not overwrite data.",
      );
    const u = await query(
      "INSERT INTO users(name,email,password_hash) VALUES (?,?,?)",
      ["Alex Morgan", "demo@trialguard.local", passwordHash],
      c,
    );
    await query(
      "INSERT INTO budgets(user_id,monthly_amount) VALUES (?,?)",
      [u.insertId, "2500.00"],
      c,
    );
    const plans = [
      ["Streamspace", 1, "649.00", "monthly", "active", 5, null, -3],
      ["Focus Studio", 2, "2400.00", "yearly", "active", 14, null, -42],
      ["Cloudnest", 5, "149.00", "monthly", "active", 9, null, -2],
      ["Motion Club", 4, "899.00", "monthly", "trial", 3, 3, null],
      ["Learnly", 3, "499.00", "monthly", "trial", 1, 1, null],
      ["Task Garden", 2, "299.00", "monthly", "active", -2, null, -35],
    ];
    for (const [name, cat, price, cycle, status, next, end, last] of plans)
      await query(
        "INSERT INTO subscriptions(user_id,category_id,service_name,price,billing_cycle,status,start_date,next_billing_date,trial_end_date,provider_url,notes,last_used_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          u.insertId,
          cat,
          name,
          price,
          cycle,
          status,
          addDays(date, -60),
          addDays(date, next),
          end ? addDays(date, end) : null,
          "https://example.com/account",
          "Fictional demo service. Replace with your real provider details.",
          last ? addDays(date, last) : null,
        ],
        c,
      );
  });
  console.log(
    "Fictional demo data created. Sign in with demo@trialguard.local and DEMO_PASSWORD.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
