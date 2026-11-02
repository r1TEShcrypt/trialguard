const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const root = path.resolve(__dirname, "..");
require("../backend/node_modules/dotenv").config({
  path: path.join(root, "backend/.env.test"),
  override: true,
  quiet: true,
});
if (
  process.env.NODE_ENV !== "test" ||
  !/^\w+_test$/.test(process.env.DB_NAME || "")
)
  throw new Error(
    "Use NODE_ENV=test and a dedicated database ending in _test in backend/.env.test.",
  );
const temporary = path.join(root, "../../work/browser-temp");
fs.mkdirSync(temporary, { recursive: true });
const env = {
  ...process.env,
  SMTP_HOST: "",
  SMTP_FROM: "",
  OPENAI_API_KEY: "",
  TEMP: temporary,
  TMP: temporary,
};
const children = [];
function launch(args, cwd, extra = {}) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...env, ...extra },
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  return child;
}
async function free(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Test port ${port} is in use. Stop the previous test server first.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
async function ready(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Test server did not become ready: " + url);
}
function stop() {
  for (const child of children) if (child.exitCode === null) child.kill();
}
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(143);
});
(async () => {
  try {
    await free(3002);
    await free(5174);
    const migration = launch(
      ["scripts/migrate.js"],
      path.join(root, "backend"),
      { ENV_FILE: ".env.test" },
    );
    const [migrationCode] = await once(migration, "exit");
    if (migrationCode !== 0) throw new Error("Test database migration failed");
    launch(["src/server.js"], path.join(root, "backend"), {
      ENV_FILE: ".env.test",
      PORT: "3002",
      APP_ORIGIN: "http://127.0.0.1:5174",
    });
    launch(
      [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        "--port",
        "5174",
        "--strictPort",
      ],
      path.join(root, "frontend"),
      { API_PROXY_TARGET: "http://127.0.0.1:3002" },
    );
    await Promise.all([
      ready("http://127.0.0.1:3002/api/health"),
      ready("http://127.0.0.1:5174"),
    ]);
    const runner = launch(
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        ...process.argv.slice(2),
      ],
      root,
    );
    const [code] = await once(runner, "exit");
    process.exitCode = code ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    stop();
  }
})();
