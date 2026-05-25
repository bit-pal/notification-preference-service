import "./config/env.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PreferenceService } from "./application/preference-service.js";
import { createApp } from "./api/app.js";
import { getPool, closePool } from "./infrastructure/db/pool.js";
import { seedDefaults } from "./infrastructure/db/seed.js";
import { createLogger } from "./infrastructure/logging/logger.js";
import { PreferenceRepository } from "./infrastructure/repositories/preference-repository.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap(): Promise<void> {
  const logger = createLogger();
  const pool = getPool();
  const schema = readFileSync(
    join(__dirname, "infrastructure/db/schema.sql"),
    "utf-8"
  );
  await pool.query(schema);

  const client = await pool.connect();
  try {
    await seedDefaults(client);
  } finally {
    client.release();
  }

  const repository = new PreferenceRepository();
  const service = new PreferenceService(repository, logger);
  const app = createApp(service, logger);
  const port = Number(process.env.PORT ?? 3000);

  const server = app.listen(port, () => {
    logger.info({ port }, "server started");
  });

  const shutdown = async () => {
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
