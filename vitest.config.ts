import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/config/env.ts"],
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
