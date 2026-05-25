import "../config/env.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../infrastructure/db/pool.js";
import { seedDefaults } from "../infrastructure/db/seed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function initializeTestDatabase(): Promise<boolean> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";

  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    const schema = readFileSync(
      join(__dirname, "../infrastructure/db/schema.sql"),
      "utf-8"
    );
    await pool.query(schema);
    const client = await pool.connect();
    try {
      await seedDefaults(client);
    } finally {
      client.release();
    }
    return true;
  } catch {
    return false;
  }
}

export async function resetUserData(): Promise<void> {
  await getPool().query(`
    TRUNCATE preference_change_log, user_quiet_hours, user_preferences, users CASCADE
  `);
}
