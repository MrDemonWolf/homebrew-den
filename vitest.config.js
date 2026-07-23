import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "tests",
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
