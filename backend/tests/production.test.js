import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import supertest from "supertest";
dotenv.config({ path: ".env.test", override: true, quiet: true });
if (
  process.env.NODE_ENV !== "test" ||
  !/^\w+_test$/.test(process.env.DB_NAME || "")
)
  throw new Error("Production smoke test requires a dedicated _test database.");
process.env.NODE_ENV = "production";
process.env.APP_ORIGIN = "https://trialguard.example";
const { app } = await import("../src/app.js");
const { query, pool } = await import("../src/db.js");
test("production serves built SPA routes and sets secure host-only cookies", async () => {
  let id;
  try {
    const page = await supertest(app).get("/subscriptions").expect(200);
    assert.match(page.text, /TrialGuard/);
    assert.ok(page.headers["content-security-policy"]);
    const registration = await supertest(app)
      .post("/api/auth/register")
      .set("Origin", process.env.APP_ORIGIN)
      .send({
        name: "Production Test",
        email: `production-${Date.now()}@example.test`,
        password: "Production-Test-Password-2026",
      })
      .expect(201);
    id = registration.body.user.id;
    const cookie = registration.headers["set-cookie"][0];
    assert.match(cookie, /__Host-trialguard=/);
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /Domain=/);
  } finally {
    if (id) await query("DELETE FROM users WHERE id=?", [id]);
    await pool.end();
  }
});
