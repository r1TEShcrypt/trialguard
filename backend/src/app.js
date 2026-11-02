import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { pool } from "./db.js";
import { router } from "./routes.js";
import { originGuard } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errors.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.origin, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use("/api", originGuard);
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({
      status: "unavailable",
      database: "disconnected",
      message: "Start MySQL and check backend configuration.",
    });
  }
});
app.use("/api", router);
app.use("/api", (req, res) =>
  res.status(404).json({ error: { message: "API endpoint not found." } }),
);
if (config.env === "production") {
  const dist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../frontend/dist",
  );
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
}
app.use(errorHandler);
