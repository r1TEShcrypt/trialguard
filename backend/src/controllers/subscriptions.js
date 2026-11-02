import { query } from "../db.js";
import { fields, select, findOwned } from "../services/subscriptions.js";
import { idSchema, listSchema, subscriptionSchema } from "../validation.js";
import { addDays } from "../services/dates.js";
export async function list(req, res) {
  const q = listSchema.parse(req.query);
  const params = [req.user.id];
  let where = " WHERE s.user_id=?";
  if (q.search) {
    where += " AND s.service_name LIKE ?";
    params.push("%" + q.search.replace(/[\\%_]/g, "\\$&") + "%");
  }
  if (q.status !== "all") {
    where += " AND s.status=?";
    params.push(q.status);
  }
  if (q.category !== "all") {
    where += " AND s.category_id=?";
    params.push(q.category);
  }
  const [count] = await query(
    "SELECT COUNT(*) AS total FROM subscriptions s" + where,
    params,
  );
  const order = {
    date: "CASE WHEN s.status='trial' THEN s.trial_end_date ELSE s.next_billing_date END",
    name: "s.service_name",
    price:
      "(CASE WHEN s.billing_cycle='yearly' THEN s.price/12 ELSE s.price END) DESC",
    newest: "s.created_at DESC",
  }[q.sort];
  const rows = await query(
    select + where + ` ORDER BY ${order},s.id LIMIT ? OFFSET ?`,
    [...params, String(q.limit), String((q.page - 1) * q.limit)],
  );
  res.json({ items: rows, total: count.total, page: q.page, limit: q.limit });
}
export async function get(req, res) {
  res.json(await findOwned(idSchema.parse(req.params.id), req.user.id));
}
export async function create(req, res) {
  const data = subscriptionSchema.parse(req.body);
  const result = await query(
    `INSERT INTO subscriptions(user_id,${fields.join(",")}) VALUES (${Array(
      fields.length + 1,
    )
      .fill("?")
      .join(",")})`,
    [req.user.id, ...fields.map((f) => data[f])],
  );
  res.status(201).json(await findOwned(result.insertId, req.user.id));
}
export async function update(req, res) {
  const id = idSchema.parse(req.params.id);
  const data = subscriptionSchema.parse(req.body);
  await findOwned(id, req.user.id);
  await query(
    `UPDATE subscriptions SET ${fields.map((f) => f + "=?").join(",")} WHERE id=? AND user_id=?`,
    [...fields.map((f) => data[f]), id, req.user.id],
  );
  res.json(await findOwned(id, req.user.id));
}
export async function remove(req, res) {
  const id = idSchema.parse(req.params.id);
  await findOwned(id, req.user.id);
  await query("DELETE FROM subscriptions WHERE id=? AND user_id=?", [
    id,
    req.user.id,
  ]);
  res.json({ ok: true });
}
const escapeICS = (value) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
function fold(line) {
  let parts = [],
    current = "";
  for (const character of line) {
    if (Buffer.byteLength(current + character) > 73) {
      parts.push(current);
      current = " " + character;
    } else current += character;
  }
  parts.push(current);
  return parts.join("\r\n");
}
export async function calendar(req, res) {
  const s = await findOwned(idSchema.parse(req.params.id), req.user.id);
  const date = s.status === "trial" ? s.trial_end_date : s.next_billing_date;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrialGuard//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:subscription-${s.id}-${date}@trialguard.local`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${addDays(date, 1).replaceAll("-", "")}`,
    `SUMMARY:${escapeICS("Review " + s.service_name)}`,
    `DESCRIPTION:${escapeICS("Review with your provider. TrialGuard does not cancel or charge. " + s.provider_url)}`,
    ...[3, 1].flatMap((d) => [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-P${d}D`,
      "DESCRIPTION:Review subscription",
      "END:VALARM",
    ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  res
    .type("text/calendar")
    .attachment(`trialguard-${s.id}.ics`)
    .send(lines.map(fold).join("\r\n") + "\r\n");
}
