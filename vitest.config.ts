import { defineConfig } from "vitest/config";
import path from "node:path";
import dotenv from "dotenv";

// Integration tests run against the dedicated teamflow_test database.
dotenv.config();
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration suites share one test database; run files sequentially.
    fileParallelism: false,
  },
});
