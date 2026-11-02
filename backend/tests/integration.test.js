import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import supertest from "supertest";
dotenv.config({ path: ".env.test", override: true, quiet: true });
process.env.SMTP_HOST = "";
process.env.SMTP_FROM = "";
process.env.OPENAI_API_KEY = "";
if (
  process.env.NODE_ENV !== "test" ||
  !/^\w+_test$/.test(process.env.DB_NAME || "")
)
  throw new Error(
    "Refusing integration tests: NODE_ENV=test and a dedicated DB_NAME ending in _test are required.",
  );
const { app } = await import("../src/app.js");
const { pool, query } = await import("../src/db.js");
const { migrate } = await import("../scripts/migrate.js");
const { runReminders } = await import("../src/jobs/reminders.js");
const { config } = await import("../src/config.js");
const { today, addDays } = await import("../src/services/dates.js");
const owner = supertest.agent(app),
  other = supertest.agent(app);
let csrf, otherCsrf, ownerId, otherId, id;
const email = `owner-${Date.now()}@example.test`,
  otherEmail = `other-${Date.now()}@example.test`;
const input = {
  service_name: "Real database test",
  category_id: 1,
  price: "199.99",
  billing_cycle: "monthly",
  status: "active",
  start_date: addDays(today(), -10),
  next_billing_date: addDays(today(), 5),
  trial_end_date: null,
  provider_url: "https://example.com/account",
  notes: "Integration test",
  last_used_date: null,
};
const mutate = (agent, method, path, token) =>
  agent[method](path)
    .set("Origin", config.origin)
    .set("X-CSRF-Token", token || "");
before(async () => {
  await migrate();
});
after(async () => {
  if (ownerId) await query("DELETE FROM users WHERE id=?", [ownerId]);
  if (otherId) await query("DELETE FROM users WHERE id=?", [otherId]);
  await pool.end();
});
test("authentication, ownership, CRUD, validation, calculations and reminder persistence", async (t) => {
  await t.test("unauthenticated requests are rejected", async () => {
    await supertest(app).get("/api/subscriptions").expect(401);
    await supertest(app).get("/api/dashboard").expect(401);
  });
  await t.test(
    "register persists a bcrypt password and secure cookie settings",
    async () => {
      const res = await owner
        .post("/api/auth/register")
        .set("Origin", config.origin)
        .send({ name: "Owner", email, password: "Long-Test-Password-2026" })
        .expect(201);
      csrf = res.body.csrfToken;
      ownerId = res.body.user.id;
      assert.match(res.headers["set-cookie"][0], /HttpOnly/);
      assert.match(res.headers["set-cookie"][0], /SameSite=Lax/);
      const [u] = await query("SELECT password_hash FROM users WHERE id=?", [
        ownerId,
      ]);
      assert.match(u.password_hash, /^\$2[ab]\$/);
      assert.notEqual(u.password_hash, "Long-Test-Password-2026");
      const b = await other
        .post("/api/auth/register")
        .set("Origin", config.origin)
        .send({
          name: "Other",
          email: otherEmail,
          password: "Other-Test-Password-2026",
        })
        .expect(201);
      otherCsrf = b.body.csrfToken;
      otherId = b.body.user.id;
    },
  );
  await t.test(
    "login rejects wrong credentials and returns current user",
    async () => {
      await owner
        .post("/api/auth/login")
        .set("Origin", config.origin)
        .send({ email, password: "incorrect" })
        .expect(401);
      const result = await owner
        .post("/api/auth/login")
        .set("Origin", config.origin)
        .send({ email, password: "Long-Test-Password-2026" })
        .expect(200);
      csrf = result.body.csrfToken;
      assert.equal((await owner.get("/api/auth/me")).body.user.email, email);
    },
  );
  await t.test(
    "mutations reject missing CSRF and untrusted origin",
    async () => {
      await owner
        .post("/api/subscriptions")
        .set("Origin", config.origin)
        .send(input)
        .expect(403);
      await owner
        .post("/api/subscriptions")
        .set("Origin", "https://evil.example")
        .set("X-CSRF-Token", csrf)
        .send(input)
        .expect(403);
    },
  );
  await t.test("create and retrieve persisted subscription", async () => {
    const res = await mutate(owner, "post", "/api/subscriptions", csrf)
      .send(input)
      .expect(201);
    id = res.body.id;
    assert.equal(res.body.price, "199.99");
    assert.equal(res.body.next_billing_date, input.next_billing_date);
    assert.equal(
      (await owner.get("/api/subscriptions/" + id).expect(200)).body
        .service_name,
      input.service_name,
    );
  });
  await t.test(
    "cross-user direct reads, edits, deletes and calendar exports are denied",
    async () => {
      await other.get("/api/subscriptions/" + id).expect(404);
      await other.get("/api/subscriptions/" + id + "/calendar").expect(404);
      await mutate(other, "put", "/api/subscriptions/" + id, otherCsrf)
        .send(input)
        .expect(404);
      await mutate(
        other,
        "delete",
        "/api/subscriptions/" + id,
        otherCsrf,
      ).expect(404);
      assert.equal((await other.get("/api/subscriptions")).body.total, 0);
    },
  );
  await t.test("invalid input cannot mutate persistent records", async () => {
    for (const bad of [
      { price: "-1" },
      { trial_end_date: "2026-02-30" },
      { provider_url: "javascript:alert(1)" },
      { status: "trial", trial_end_date: null },
      { category_id: 999999 },
    ])
      await mutate(owner, "post", "/api/subscriptions", csrf)
        .send({ ...input, ...bad })
        .expect(400);
    await owner.get("/api/subscriptions?page=-1").expect(400);
    await owner.get("/api/subscriptions?sort=DROP").expect(400);
    await owner.get("/api/subscriptions/abc").expect(400);
  });
  await t.test("edit, filter, search, sort and paginate", async () => {
    await mutate(owner, "put", "/api/subscriptions/" + id, csrf)
      .send({
        ...input,
        service_name: "Updated plan",
        price: "1200.00",
        billing_cycle: "yearly",
      })
      .expect(200);
    const result = await owner
      .get("/api/subscriptions?search=Updated&sort=price&limit=1")
      .expect(200);
    assert.equal(result.body.total, 1);
    assert.equal(result.body.items[0].price, "1200.00");
    assert.equal(
      (await owner.get("/api/subscriptions?search=%27%20OR%201%3D1")).body
        .total,
      0,
    );
  });
  let trialId;
  await t.test(
    "active spending excludes trials and cancelled plans and budgets persist",
    async () => {
      trialId = (
        await mutate(owner, "post", "/api/subscriptions", csrf)
          .send({
            ...input,
            status: "trial",
            trial_end_date: addDays(today(), 3),
            next_billing_date: addDays(today(), 3),
          })
          .expect(201)
      ).body.id;
      await mutate(owner, "post", "/api/subscriptions", csrf)
        .send({ ...input, status: "cancelled" })
        .expect(201);
      await mutate(owner, "put", "/api/settings/budget", csrf)
        .send({ amount: "500.00" })
        .expect(200);
      const d = (await owner.get("/api/dashboard").expect(200)).body;
      assert.equal(d.monthly, "100.00");
      assert.equal(d.annual, "1200.00");
      assert.equal(d.activeCount, 1);
      assert.equal(d.trialCount, 1);
      assert.equal(d.potentialMonthly, "199.99");
      assert.equal(d.remaining, "400.00");
      assert.equal((await other.get("/api/dashboard")).body.monthly, "0.00");
    },
  );
  await t.test("selected savings exclude another user records", async () => {
    const result = await mutate(
      other,
      "post",
      "/api/insights/savings",
      otherCsrf,
    )
      .send({ ids: [id] })
      .expect(200);
    assert.equal(result.body.monthly, "0.00");
  });
  await t.test(
    "calendar exports use all-day dates and both reminder offsets",
    async () => {
      const response = await owner
        .get("/api/subscriptions/" + trialId + "/calendar")
        .expect(200);
      assert.match(response.text, /DTSTART;VALUE=DATE:/);
      assert.match(response.text, /TRIGGER:-P3D/);
      assert.match(response.text, /TRIGGER:-P1D/);
      assert.match(response.headers["content-type"], /text\/calendar/);
    },
  );
  let notificationId;
  await t.test(
    "scheduled reminders deduplicate concurrent and repeated runs in MySQL",
    async () => {
      await Promise.all([runReminders(today()), runReminders(today())]);
      await runReminders(today());
      const counts = await query(
        "SELECT COUNT(*) AS count FROM reminder_deliveries WHERE subscription_id=?",
        [trialId],
      );
      assert.equal(counts[0].count, 1);
      const notifications = (await owner.get("/api/notifications").expect(200))
        .body;
      assert.equal(notifications.unread, 1);
      notificationId = notifications.items[0].id;
      assert.equal((await other.get("/api/notifications")).body.unread, 0);
      await runReminders(addDays(today(), 1));
      assert.equal(
        (
          await query(
            "SELECT COUNT(*) AS count FROM reminder_deliveries WHERE subscription_id=?",
            [trialId],
          )
        )[0].count,
        1,
      );
      await runReminders(addDays(today(), 2));
      await runReminders(addDays(today(), 2));
      assert.equal(
        (
          await query(
            "SELECT COUNT(*) AS count FROM reminder_deliveries WHERE subscription_id=?",
            [trialId],
          )
        )[0].count,
        2,
      );
    },
  );
  await t.test("notification read actions enforce ownership", async () => {
    await mutate(
      other,
      "post",
      "/api/notifications/" + notificationId + "/read",
      otherCsrf,
    ).expect(404);
    await mutate(
      owner,
      "post",
      "/api/notifications/" + notificationId + "/read",
      csrf,
    ).expect(200);
    assert.equal((await owner.get("/api/notifications")).body.unread, 1);
    await mutate(owner, "post", "/api/notifications/read-all", csrf).expect(
      200,
    );
    assert.equal((await owner.get("/api/notifications")).body.unread, 0);
  });
  await t.test(
    "cancelled trial stops future reminders; delete persists",
    async () => {
      await mutate(owner, "put", "/api/subscriptions/" + trialId, csrf)
        .send({
          ...input,
          status: "cancelled",
          trial_end_date: addDays(today(), 1),
        })
        .expect(200);
      await runReminders(today());
      assert.equal(
        (
          await query(
            "SELECT COUNT(*) AS count FROM reminder_deliveries WHERE subscription_id=?",
            [trialId],
          )
        )[0].count,
        2,
      );
      await mutate(owner, "delete", "/api/subscriptions/" + id, csrf).expect(
        200,
      );
      await owner.get("/api/subscriptions/" + id).expect(404);
    },
  );
  await t.test("logout invalidates session", async () => {
    await mutate(owner, "post", "/api/auth/logout", csrf).expect(200);
    await owner.get("/api/auth/me").expect(401);
  });
});
