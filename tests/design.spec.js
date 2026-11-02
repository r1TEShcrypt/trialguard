const { test, expect } = require("@playwright/test");
let pool, query, userId;
test.use({ reducedMotion: "reduce" });
test.beforeAll(async () => {
  const mysql = require("../backend/node_modules/mysql2/promise");
  const { config } = await import("../backend/src/config.js");
  pool = mysql.createPool(config.db);
  query = async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  };
});
test.afterAll(async () => {
  if (userId) await query("DELETE FROM users WHERE id=?", [userId]);
  await pool.end();
});
test("themes, deadline language, charts, calendar, editor safety and responsive layouts", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { today, addDays } = await import("../backend/src/services/dates.js");
  const date = today();
  await page.goto("/login");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page
    .getByLabel("Email address")
    .fill(`design-${Date.now()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Design-Regression-2026");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Alex." }),
  ).toBeVisible();
  const auth = await (await page.request.get("/api/auth/me")).json();
  userId = auth.user.id;
  const create = async (body) => {
    const response = await page.request.post("/api/subscriptions", {
      headers: {
        Origin: "http://127.0.0.1:5174",
        "X-CSRF-Token": auth.csrfToken,
      },
      data: {
        service_name: "Plan",
        price: "499.00",
        billing_cycle: "monthly",
        category_id: 2,
        status: "trial",
        start_date: addDays(date, -60),
        next_billing_date: addDays(date, 3),
        trial_end_date: addDays(date, 3),
        provider_url: "https://example.com/account",
        notes: "Fictional test plan",
        last_used_date: null,
        ...body,
      },
    });
    expect(response.status()).toBe(201);
    return response.json();
  };
  for (const [service_name, days] of [
    ["Focus Studio", -2],
    ["Cloudnest", 0],
    ["Motion Club", 1],
    ["Learnly", 3],
    ["Design Lab", 6],
    ["Readwise Demo", 15],
  ])
    await create({
      service_name,
      trial_end_date: addDays(date, days),
      next_billing_date: addDays(date, days),
    });
  await create({
    service_name: "Streamspace",
    price: "649.00",
    status: "active",
    category_id: 1,
    trial_end_date: null,
    last_used_date: addDays(date, -40),
  });
  await create({
    service_name: "Task Garden",
    price: "2400.00",
    billing_cycle: "yearly",
    status: "active",
    category_id: 2,
    trial_end_date: null,
  });
  await create({ service_name: "Cancelled Plan", status: "cancelled" });
  await page.request.put("/api/settings/budget", {
    headers: {
      Origin: "http://127.0.0.1:5174",
      "X-CSRF-Token": auth.csrfToken,
    },
    data: { amount: "1000.00" },
  });
  await page.reload();
  await expect(page.locator(".stat.featured")).toContainText("₹849.00");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .locator(".legend-item")
    .filter({ hasText: "Entertainment" })
    .click();
  await expect(page.locator(".donut-center")).toContainText("₹649.00");
  await expect(
    page.locator(".legend-item").filter({ hasText: "Entertainment" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /All categories/ }).click();
  await page.screenshot({
    path: "../../work/redesign-desktop-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.screenshot({
    path: "../../work/redesign-desktop-light.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Add subscription", exact: true })
    .click();
  await page.getByLabel("Service name").fill("Unsaved plan");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Keep your changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue editing" }).click();
  await expect(page.getByLabel("Service name")).toHaveValue("Unsaved plan");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Search all plans").fill("Streamspace");
  await page.getByRole("button", { name: "Run subscription search" }).click();
  await expect(page.getByLabel("Search subscriptions")).toHaveValue(
    "Streamspace",
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Search subscriptions").fill("");
  await page.getByRole("tab", { name: "Cancelled", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Cancelled Plan");
  await page.getByRole("tab", { name: "All plans", exact: true }).click();
  await page.getByRole("button", { name: "Edit Task Garden" }).click();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("2");
  await page
    .getByLabel("Next billing date", { exact: true })
    .fill(addDays(date, -70));
  await page.getByRole("button", { name: "Save subscription" }).click();
  await expect(
    page.getByText("Choose a date on or after the start date."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await page.getByRole("link", { name: "Free trials", exact: true }).click();
  await expect(page.locator(".nearest-trial")).toContainText("Focus Studio");
  for (const [name, label, tone] of [
    ["Focus Studio", "Overdue · review needed", "overdue"],
    ["Cloudnest", "Trial ends today", "immediate"],
    ["Motion Club", "Trial ends tomorrow", "immediate"],
    ["Learnly", "Trial ends in 3 days", "soon"],
    ["Design Lab", "Trial ends in 6 days", "week"],
    ["Readwise Demo", "Trial ends in 15 days", "neutral"],
  ]) {
    const card = page
      .locator(".radar-plan")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card.locator(".deadline-" + tone)).toContainText(label);
  }
  await page.getByRole("tab", { name: "Calendar", exact: true }).click();
  await expect(page.locator(".calendar-grid")).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: "This month" }).click();
  await expect(
    page.locator(".calendar-event").filter({ hasText: "Cloudnest" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  const focus = page.locator(".radar-plan").filter({
    has: page.getByRole("heading", { name: "Focus Studio", exact: true }),
  });
  await focus
    .getByRole("button", { name: "Mark cancelled", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("does not cancel");
  await page.getByRole("button", { name: "Mark cancelled in tracker" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".nearest-trial")).toContainText("Cloudnest");
  await page.screenshot({
    path: "../../work/redesign-trials.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const width of [360, 768, 1024, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/subscriptions",
      "/trials",
      "/insights",
      "/notifications",
      "/settings",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator(".skeleton-group")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `No overflow at ${width}px on ${route}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await expect(page.locator(".stat.featured")).toBeVisible();
  await page.screenshot({
    path: "../../work/redesign-mobile-light.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.screenshot({
    path: "../../work/redesign-mobile-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator(".sidebar").hover();
  await page.mouse.wheel(0, 1500);
  await expect(
    page.locator(".sidebar").getByRole("button", { name: "Sign out" }),
  ).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open plan search" }).click();
  await page.getByLabel("Search all plans").fill("Task Garden");
  await page.getByRole("button", { name: "Run subscription search" }).click();
  await expect(page.getByLabel("Search subscriptions")).toHaveValue(
    "Task Garden",
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/trials");
  await expect(page.locator(".nearest-trial")).toContainText(
    "Trial ends today",
  );
  await page.clock.setFixedTime(new Date(addDays(date, 1) + "T12:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".nearest-trial")).toContainText(
    "Overdue · review needed",
  );
  expect(errors).toEqual([]);
});
