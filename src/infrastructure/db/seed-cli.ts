import "../../config/env.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "./pool.js";
import { seedDefaults } from "./seed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runSeed(): Promise<void> {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const pool = getPool();
  await pool.query(sql);

  const client = await pool.connect();
  try {
    await seedDefaults(client);
  } finally {
    client.release();
  }

  await closePool();
  console.log("Seed completed");
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
