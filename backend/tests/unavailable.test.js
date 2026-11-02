import test from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.DB_NAME = "unavailable_test";
const { app } = await import("../src/app.js");
const { pool } = await import("../src/db.js");
test("database outage returns useful errors without fake data or exposed credentials", async () => {
  try {
    const health = await supertest(app).get("/api/health").expect(503);
    assert.equal(health.body.database, "disconnected");
    assert.equal(health.body.status, "unavailable");
    const response = await supertest(app)
      .get("/api/dashboard")
      .set("Cookie", "trialguard=" + "a".repeat(64))
      .expect(503);
    assert.match(response.body.error.message, /Database unavailable/);
    assert.equal(response.body.monthly, undefined);
  } finally {
    await pool.end();
  }
});
