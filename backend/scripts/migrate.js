import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";
import { pool, query } from "../src/db.js";
export async function migrate() {
  // Create only a missing database; existing schemas and records are preserved.
  if (!/^[a-zA-Z0-9_]+$/.test(config.db.database)) throw new Error("DB_NAME must contain only letters, numbers and underscores.");
  const { database, ...serverConfig } = config.db;
  const server = await mysql.createConnection(serverConfig);
  try {
    const [schemas] = await server.execute("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [database]);
    if (!schemas.length) await server.query("CREATE DATABASE IF NOT EXISTS " + mysql.escapeId(database) + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  } finally { await server.end(); }
  const connection = await pool.getConnection();
  try {
    const [[lock]] = await connection.execute(
      "SELECT GET_LOCK('trialguard_migrations',30) AS acquired",
    );
    if (!lock.acquired) throw new Error("Migration lock unavailable");
    await connection.execute(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
    );
    const directory = new URL("../migrations/", import.meta.url);
    for (const file of (await readdir(directory))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const existing = await query(
        "SELECT version FROM schema_migrations WHERE version=?",
        [file],
        connection,
      );
      if (existing.length) continue;
      const sql = await readFile(new URL(file, directory), "utf8");
      for (const statement of sql
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean))
        await connection.query(statement);
      await query(
        "INSERT INTO schema_migrations(version) VALUES (?)",
        [file],
        connection,
      );
      console.log("Applied", file);
    }
  } finally {
    await connection.query("SELECT RELEASE_LOCK('trialguard_migrations')");
    connection.release();
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await migrate();
  } catch (e) {
    console.error("Migration failed:", e.code || "MIGRATION_ERROR", "Check local MySQL, backend/.env and schema compatibility. Existing tables are never reset.");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
