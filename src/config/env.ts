import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const moduleDir = dirname(fileURLToPath(import.meta.url));

const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(moduleDir, "../../.env"),
];

const envPath = candidates.find((p) => existsSync(p));

if (envPath) {
  config({ path: envPath });
}
