import { query } from "../db.js";
import { HttpError } from "../middleware/errors.js";
export const select =
  "SELECT s.*, c.name AS category FROM subscriptions s JOIN categories c ON c.id=s.category_id";
export const allForUser = (userId) =>
  query(select + " WHERE s.user_id=? ORDER BY s.next_billing_date,s.id", [
    userId,
  ]);
export async function findOwned(id, userId) {
  const rows = await query(select + " WHERE s.id=? AND s.user_id=?", [
    id,
    userId,
  ]);
  if (!rows.length) throw new HttpError(404, "Subscription not found.");
  return rows[0];
}
export const fields = [
  "service_name",
  "category_id",
  "price",
  "billing_cycle",
  "status",
  "start_date",
  "next_billing_date",
  "trial_end_date",
  "provider_url",
  "notes",
  "last_used_date",
];
