import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: process.env.AE_MCP_LIVE === "1" ? [] : ["tests/integration/**"],
    testTimeout: 20000,
    maxWorkers: 1,
  },
});
