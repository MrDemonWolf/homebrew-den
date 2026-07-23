import { describe, it, expect } from "vitest";
import { loadSharedFunction, callBashFunction } from "./helpers.js";

// The stability classifier exists in two runtimes: bash (build-site.sh, used at
// build time) and JS (shared.js, used by search + tests). This test runs the
// SAME fixtures through both actual implementations and asserts they agree, so
// the two can never silently drift.
const detectStability = loadSharedFunction("detectStability");

const cases = [
  ["0.1.0", false],
  ["0.0.6", false],
  ["1.0.0", false],
  ["2.3.4", false],
  ["10.0.0", false],
  ["1.0.0-beta", false],
  ["1.0.0-beta.1", false],
  ["2.0.0-Beta", false],
  ["1.0.0-alpha", false],
  ["1.0.0-alpha.2", false],
  ["1.0.0-rc.1", false],
  ["2.0.0-RC1", false],
  ["1.0.0-dev", false],
  ["1.0.0-canary", false],
  ["1.0.0-nightly", false],
  ["1.0.0-preview", false],
  ["1.0.0", true],
  ["0.1.0-beta", false],
  ["1.0.0-beta", true],
];

describe("Stability classifier parity (bash vs JS)", () => {
  it.each(cases)("agrees on %s (prerelease=%s)", (version, isPre) => {
    const js = detectStability(version, { isGitHubPrerelease: isPre });
    const bash = callBashFunction("detect_stability", [version, isPre ? "true" : "false"]);
    expect(bash).toBe(js);
  });
});
