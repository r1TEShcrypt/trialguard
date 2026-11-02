const { defineConfig } = require("@playwright/test");
const path = require("node:path");
require("./backend/node_modules/dotenv").config({
  path: path.join(__dirname, "backend/.env.test"),
  override: true,
  quiet: true,
});
if (
  process.env.NODE_ENV !== "test" ||
  !/^\w+_test$/.test(process.env.DB_NAME || "")
)
  throw new Error(
    "Browser tests require backend/.env.test and a database ending in _test.",
  );
process.env.SMTP_HOST = "";
process.env.SMTP_FROM = "";
process.env.OPENAI_API_KEY = "";
module.exports = defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 45000,
  reporter: "list",
  outputDir: "../../work/browser-results",
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    viewport: { width: 1440, height: 1100 },
    screenshot: "only-on-failure",
  },
});
