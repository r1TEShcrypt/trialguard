import test from "node:test";
import assert from "node:assert/strict";
import { summarize, insights } from "../src/services/analytics.js";
import { reminderOffset, addDays, dayDiff } from "../src/services/dates.js";
import {
  subscriptionSchema,
  dateSchema,
  moneySchema,
  listSchema,
} from "../src/validation.js";
const plan = {
  id: 1,
  service_name: "Example",
  category_id: 1,
  category: "Tools",
  price: "100.00",
  billing_cycle: "monthly",
  status: "active",
  start_date: "2026-01-01",
  next_billing_date: "2026-11-05",
  trial_end_date: null,
  provider_url: "",
  notes: "",
  last_used_date: null,
};
test("decimal totals normalize yearly prices without binary floating point", () => {
  const result = summarize(
    [
      { ...plan, price: "0.10" },
      { ...plan, price: "0.20" },
      { ...plan, price: "1000.00", billing_cycle: "yearly" },
    ],
    "100",
    "2026-11-02",
  );
  assert.equal(result.monthly, "83.63");
  assert.equal(result.annual, "1003.60");
  assert.equal(result.remaining, "16.37");
});
test("trials and cancelled plans are excluded from paid totals", () => {
  const result = summarize(
    [
      plan,
      {
        ...plan,
        id: 2,
        price: "1200",
        billing_cycle: "yearly",
        status: "trial",
        trial_end_date: "2026-11-03",
      },
      { ...plan, id: 3, price: "999", status: "cancelled" },
    ],
    "500",
    "2026-11-02",
  );
  assert.equal(result.monthly, "100.00");
  assert.equal(result.annual, "1200.00");
  assert.equal(result.activeCount, 1);
  assert.equal(result.trialCount, 1);
  assert.equal(result.potentialMonthly, "100.00");
});
test("trial deadlines include today and day 7, separate overdue, exclude day 8", () => {
  const rows = [-1, 0, 7, 8].map((d, i) => ({
    ...plan,
    id: i,
    status: "trial",
    trial_end_date: addDays("2026-11-02", d),
  }));
  const result = summarize(rows, "0", "2026-11-02");
  assert.equal(result.trialsEnding.length, 2);
  assert.equal(result.overdue.length, 1);
  assert.equal(result.trialCount, 4);
});
test("reminders fire only at 3 and 1 calendar days, across months and leap years", () => {
  assert.equal(reminderOffset("2026-03-01", "2026-02-26"), 3);
  assert.equal(reminderOffset("2024-03-01", "2024-02-29"), 1);
  for (const d of [-1, 0, 2, 4])
    assert.equal(reminderOffset(addDays("2026-11-02", d), "2026-11-02"), null);
  assert.equal(dayDiff("2026-03-09", "2026-03-08"), 1);
});
test("validation rejects invalid dates, unsafe URLs, negative and overprecision amounts", () => {
  for (const date of ["2026-02-30", "2026-13-01", "2026-1-01", "oops"])
    assert.equal(dateSchema.safeParse(date).success, false);
  for (const amount of ["-1", "1.001", "1e3", "NaN", "10000000000"])
    assert.equal(moneySchema.safeParse(amount).success, false);
  assert.equal(
    subscriptionSchema.safeParse({
      ...plan,
      provider_url: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    subscriptionSchema.safeParse({ ...plan, status: "trial" }).success,
    false,
  );
  assert.equal(
    subscriptionSchema.safeParse({ ...plan, next_billing_date: "2025-01-01" })
      .success,
    false,
  );
  assert.equal(
    listSchema.safeParse({ sort: "price;DROP TABLE users" }).success,
    false,
  );
  assert.equal(subscriptionSchema.safeParse(plan).success, true);
});
test("rule-based insights respect manual usage and budget, detect overlap", () => {
  const rows = [
    { ...plan, last_used_date: "2026-10-03" },
    { ...plan, id: 2, last_used_date: null },
  ];
  const result = insights(rows, "100", "2026-11-02");
  assert.equal(result.filter((i) => i.type === "unused").length, 1);
  assert.equal(result.filter((i) => i.type === "overlap").length, 1);
  assert.equal(result.filter((i) => i.type === "budget").length, 1);
});
