import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as auth from "./controllers/auth.js";
import * as subs from "./controllers/subscriptions.js";
import * as dash from "./controllers/dashboard.js";
import { authenticate, csrfGuard } from "./middleware/auth.js";
import { query } from "./db.js";
import { idSchema } from "./validation.js";
import { HttpError } from "./middleware/errors.js";
export const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: { message: "Too many sign-in attempts. Try again in 15 minutes." },
  },
});
router.post("/auth/register", limiter, auth.register);
router.post("/auth/login", limiter, auth.login);
router.use(authenticate, csrfGuard);
router.get("/auth/me", auth.me);
router.post("/auth/logout", auth.logout);
router.get("/categories", async (req, res) =>
  res.json(await query("SELECT id,name FROM categories ORDER BY id")),
);
router.get("/subscriptions", subs.list);
router.post("/subscriptions", subs.create);
router.get("/subscriptions/:id/calendar", subs.calendar);
router.get("/subscriptions/:id", subs.get);
router.put("/subscriptions/:id", subs.update);
router.delete("/subscriptions/:id", subs.remove);
router.get("/dashboard", dash.dashboard);
router.get("/insights", dash.getInsights);
router.post("/insights/savings", dash.savings);
router.post(
  "/insights/ai",
  rateLimit({
    windowMs: 60000,
    limit: 5,
    message: {
      error: {
        message: "Please wait a minute before requesting another AI summary.",
      },
    },
  }),
  dash.ai,
);
router.get("/settings", dash.settings);
router.put("/settings/budget", dash.setBudget);
router.get("/notifications", async (req, res) => {
  const items = await query(
    "SELECT n.*,s.status AS subscription_status,s.trial_end_date,s.next_billing_date FROM notifications n LEFT JOIN subscriptions s ON s.id=n.subscription_id AND s.user_id=n.user_id WHERE n.user_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT 200",
    [req.user.id],
  );
  const [count] = await query(
    "SELECT COUNT(*) AS unread FROM notifications WHERE user_id=? AND read_at IS NULL",
    [req.user.id],
  );
  res.json({ items, unread: count.unread });
});
router.post("/notifications/read-all", async (req, res) => {
  await query(
    "UPDATE notifications SET read_at=UTC_TIMESTAMP() WHERE user_id=? AND read_at IS NULL",
    [req.user.id],
  );
  res.json({ ok: true });
});
router.post("/notifications/:id/read", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const [n] = await query(
    "SELECT id FROM notifications WHERE id=? AND user_id=?",
    [id, req.user.id],
  );
  if (!n) throw new HttpError(404, "Notification not found.");
  await query(
    "UPDATE notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE id=? AND user_id=?",
    [id, req.user.id],
  );
  res.json({ ok: true });
});
