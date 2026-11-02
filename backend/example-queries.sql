-- Bind ? using mysql2.execute(). Always scope queries to the signed-in user.
-- JOIN: subscriptions and their category labels.
SELECT s.service_name, c.name AS category, s.price, s.billing_cycle
FROM subscriptions s JOIN categories c ON c.id = s.category_id
WHERE s.user_id = ?;

-- GROUP BY and aggregates: monthly spending by category, active plans only.
SELECT c.name, COUNT(*) AS plans,
  ROUND(SUM(CASE WHEN s.billing_cycle = 'yearly' THEN s.price / 12 ELSE s.price END), 2) AS monthly_inr
FROM subscriptions s JOIN categories c ON c.id = s.category_id
WHERE s.user_id = ? AND s.status = 'active'
GROUP BY c.id, c.name ORDER BY monthly_inr DESC;

-- Upcoming trials: bind the user's ID and today's app-timezone calendar date.
SELECT service_name, trial_end_date, price, billing_cycle
FROM subscriptions
WHERE user_id = ? AND status = 'trial'
  AND trial_end_date BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)
ORDER BY trial_end_date;

-- Unread notifications, scoped to their owner.
SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL;
