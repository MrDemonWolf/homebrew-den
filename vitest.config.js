import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "tests",
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // One shared offline build for the whole run (see tests/global-setup.js).
    globalSetup: "./tests/global-setup.js",
  },
});
