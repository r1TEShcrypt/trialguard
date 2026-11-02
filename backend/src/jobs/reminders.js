import nodemailer from "nodemailer";
import { query, transaction } from "../db.js";
import { config } from "../config.js";
import { today, reminderOffset } from "../services/dates.js";
export async function runReminders(date = today()) {
  const candidates = await query(
    "SELECT id FROM subscriptions WHERE status='trial' AND trial_end_date IN (DATE_ADD(?,INTERVAL 1 DAY),DATE_ADD(?,INTERVAL 3 DAY))",
    [date, date],
  );
  let created = 0;
  for (const candidate of candidates) {
    created += await transaction(async (c) => {
      const [s] = await query(
        "SELECT s.*,u.email FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.id=? FOR UPDATE",
        [candidate.id],
        c,
      );
      if (!s || s.status !== "trial") return 0;
      const offset = reminderOffset(s.trial_end_date, date);
      if (!offset) return 0;
      const exists = await query(
        "SELECT id FROM reminder_deliveries WHERE subscription_id=? AND trial_end_date=? AND days_before=?",
        [s.id, s.trial_end_date, offset],
        c,
      );
      if (exists.length) return 0;
      const title = `${s.service_name}: trial ends in ${offset} day${offset === 1 ? "" : "s"}`;
      const message = `Your trial ends on ${s.trial_end_date}. Review your provider account to avoid an unwanted renewal. TrialGuard does not cancel subscriptions or assume conversion.`;
      const n = await query(
        "INSERT INTO notifications(user_id,subscription_id,title,message) VALUES (?,?,?,?)",
        [s.user_id, s.id, title, message],
        c,
      );
      await query(
        "INSERT INTO reminder_deliveries(subscription_id,trial_end_date,days_before,notification_id,email_status) VALUES (?,?,?,?,?)",
        [
          s.id,
          s.trial_end_date,
          offset,
          n.insertId,
          config.smtp ? "pending" : "unavailable",
        ],
        c,
      );
      return 1;
    });
  }
  if (config.smtp) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          }
        : {}),
    });
    const pending = await query(
      "SELECT d.id,n.title,n.message,u.email FROM reminder_deliveries d JOIN notifications n ON n.id=d.notification_id JOIN users u ON u.id=n.user_id WHERE d.email_status='pending'",
    );
    for (const item of pending) {
      const claim = await query(
        "UPDATE reminder_deliveries SET email_status='sending' WHERE id=? AND email_status='pending'",
        [item.id],
      );
      if (!claim.affectedRows) continue;
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: item.email,
          subject: item.title,
          text: item.message,
          messageId: `<reminder-${item.id}@trialguard.local>`,
        });
        await query(
          "UPDATE reminder_deliveries SET email_status='sent' WHERE id=?",
          [item.id],
        );
      } catch {
        await query(
          "UPDATE reminder_deliveries SET email_status='failed',email_error='SMTP delivery failed; inspect server SMTP configuration' WHERE id=?",
          [item.id],
        );
      }
    }
  }
  await query("DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP()");
  return { created, emailAvailable: config.smtp, date };
}
