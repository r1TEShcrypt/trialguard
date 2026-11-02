import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool, query } from "../src/db.js";
export async function migrate() {
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
    console.error("Migration failed:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
