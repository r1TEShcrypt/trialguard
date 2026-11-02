const { test, expect } = require("@playwright/test");
let pool, query, userId;
test.beforeAll(async () => {
  ({ pool, query } = await import("../backend/src/db.js"));
});
test.afterAll(async () => {
  if (userId) await query("DELETE FROM users WHERE id=?", [userId]);
  await pool.end();
});
test("register, manage a trial, reminders, insights, budget, cancellation, deletion, mobile and login", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { today, addDays } = await import("../backend/src/services/dates.js");
  const email = `browser-${Date.now()}@example.test`,
    password = "Browser-Flow-Password-2026";
  await page.goto("/login");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Jamie Taylor");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Jamie." }),
  ).toBeVisible();
  [userId] = (await query("SELECT id FROM users WHERE email=?", [email])).map(
    (u) => u.id,
  );
  await page
    .getByRole("button", { name: "Add subscription", exact: true })
    .click();
  await page.getByLabel("Service name").fill("Design Studio");
  await page.getByLabel("Category", { exact: true }).selectOption("2");
  await page.getByLabel("Status", { exact: true }).selectOption("trial");
  await page.getByLabel("Price in INR").fill("600");
  await page.getByLabel("Start date", { exact: true }).fill(today());
  await page
    .getByLabel("Next billing date", { exact: true })
    .fill(addDays(today(), 3));
  await page
    .getByLabel("Trial end date", { exact: true })
    .fill(addDays(today(), 3));
  await page
    .getByLabel("Provider account / cancellation URL")
    .fill("https://example.com/account");
  await page.getByRole("button", { name: "Save subscription" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".stat.featured")).toContainText("₹0.00");
  await expect(page.locator(".stat").last()).toContainText("1");
  await page.getByRole("link", { name: "Free trials", exact: true }).click();
  await expect(
    page
      .locator(".radar-plan")
      .getByRole("heading", { name: "Design Studio", exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Export calendar for Design Studio" })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const { runReminders } = await import("../backend/src/jobs/reminders.js");
  await runReminders();
  await page
    .getByRole("link", { name: /^Notifications/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Design Studio: trial ends in 3 days" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(
    page.getByText("0 unread reminders", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Budget in INR").fill("500");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByText("Budget saved.")).toBeVisible();
  await page.getByRole("link", { name: "Subscriptions", exact: true }).click();
  await page.getByRole("button", { name: "Edit Design Studio" }).click();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("2");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Save subscription" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.locator(".stat.featured")).toContainText("₹600.00");
  await expect(page.getByText("₹100.00 over budget")).toBeVisible();
  await page.screenshot({
    path: "../../work/dashboard-desktop.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Smart insights", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your budget needs attention" }),
  ).toBeVisible();
  await page.getByLabel("Design Studio", { exact: false }).check();
  await expect(page.locator(".savings-total")).toContainText("₹600.00");
  await expect(
    page.getByRole("button", { name: "Summarize my spending" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Subscriptions", exact: true }).click();
  await page.getByLabel("Search subscriptions").fill("not-a-plan");
  await expect(
    page.getByRole("heading", { name: "No matching plans" }),
  ).toBeVisible();
  await page.getByLabel("Search subscriptions").fill("");
  await page.getByRole("button", { name: "Edit Design Studio" }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("cancelled");
  await expect(
    page.getByText("This updates your tracker only.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save subscription" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Delete Design Studio" }).click();
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Design Studio" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete Design Studio" }).click();
  await page
    .getByRole("button", { name: "Remove subscription", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Jamie." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../work/dashboard-mobile.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Jamie." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
