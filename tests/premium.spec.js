const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
async function accessible(page) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    r.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
let pool, userId;
test.use({ reducedMotion: "reduce", actionTimeout: 10000 });
test.afterAll(async () => {
  if (pool) {
    if (userId) await pool.execute("DELETE FROM users WHERE id=?", [userId]);
    await pool.end();
  }
});
test("premium landing, command palette, calendar, notification popover and mobile cards", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Lose the surprise charges",
  );
  await expect(
    page.getByText("INTERACTIVE DEMO", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Streamspace/ }).click();
  await expect(
    page.getByRole("button", { name: /Streamspace/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Trial radar", exact: true }).click();
  await expect(page.getByText("Motion Club", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Spending overview" }).click();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../../work/premium-landing-${width}.png`,
      fullPage: true,
    });
  }
  await accessible(page);
  await page.getByRole("link", { name: "Take back control" }).click();
  await page.getByLabel("Your name").fill("Premium Tester");
  await page
    .getByLabel("Email address")
    .fill(`premium-${Date.now()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("Premium-Flow-2026");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Premium." }),
  ).toBeVisible();
  const auth = await (await page.request.get("/api/auth/me")).json();
  userId = auth.user.id;
  const { config } = await import("../backend/src/config.js");
  pool = require("../backend/node_modules/mysql2/promise").createPool(
    config.db,
  );
  await accessible(page);
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Command palette" }),
  ).toBeVisible();
  await accessible(page);
  await page.getByRole("option", { name: "Add a subscription" }).click();
  await expect(page.locator(".editor-sheet")).toBeVisible();
  await page.getByLabel("Service name").fill("Premium Plan");
  await page.getByLabel("Price in INR").fill("250");
  await page.getByLabel("Category", { exact: true }).selectOption("2");
  const { today, addDays } = await import("../backend/src/services/dates.js");
  await page
    .getByLabel("Next billing date", { exact: true })
    .fill(addDays(today(), 3));
  await page
    .getByRole("button", { name: "Choose next billing date from calendar" })
    .click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save subscription" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open command palette" }).focus();
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Command palette" }),
  ).toBeVisible();
  await page
    .getByLabel("Search commands and subscriptions")
    .fill("Premium Plan");
  await page.getByRole("option", { name: /Premium Plan/ }).click();
  await expect(page.getByLabel("Service name")).toHaveValue("Premium Plan");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Search all plans").focus();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await page.getByRole("button", { name: /Notifications, / }).click();
  await expect(page.getByText("All quiet for now")).toBeVisible();
  await accessible(page);
  await page.keyboard.press("Escape");
  await pool.execute(
    "INSERT INTO notifications (user_id,title,message) VALUES (?,?,?)",
    [
      userId,
      "Review Premium Plan",
      "A persisted notification fixture for this test.",
    ],
  );
  await page.getByRole("button", { name: /Notifications, / }).click();
  await expect(page.locator(".notification-center")).toContainText(
    "Review Premium Plan",
  );
  await page
    .locator(".notification-center")
    .getByRole("button", { name: "Mark as read", exact: true })
    .click();
  await expect(page.locator(".notification-center")).toContainText("0 unread");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/subscriptions");
  await expect(page.locator(".subscription-card")).toBeVisible();
  await page.getByRole("button", { name: "Select Premium Plan" }).click();
  await expect(page.locator(".subscription-card")).toHaveClass(/selected/);
  await accessible(page);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await accessible(page);
  await page.getByRole("button", { name: "Manage Premium Plan" }).click();
  await page.getByRole("menuitem", { name: "Edit subscription" }).click();
  await expect(page.locator(".editor-dialog")).toBeVisible();
  await accessible(page);
  await page.getByLabel("Service name").fill("Premium Plan Updated");
  await page.getByRole("button", { name: "Save subscription" }).click();
  await expect(page.locator(".subscription-card")).toContainText(
    "Premium Plan Updated",
  );
  await page.screenshot({
    path: "../../work/premium-mobile-cards.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Review details" }).click();
  await page.screenshot({
    path: "../../work/premium-mobile-editor.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(errors).toEqual([]);
});
