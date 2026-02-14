import { describe, it, expect } from "vitest";

/**
 * Pure JS implementation of the bash stability detection logic
 * from scripts/build-site.sh (lines 128-142).
 */
function detectStability(version, { isGitHubPrerelease = false } = {}) {
  let stability = "stable";

  // GitHub prerelease flag
  if (isGitHubPrerelease) {
    stability = "pre-release";
  }

  // Semver: 0.x.x is alpha (overrides stable, but not an explicit pre-release flag)
  if (/^0\./.test(version) && stability === "stable") {
    stability = "alpha";
  }

  // Version suffix detection (highest priority)
  if (/-(alpha|beta|rc|dev|canary|nightly|preview)/i.test(version)) {
    if (/alpha/i.test(version)) {
      stability = "alpha";
    } else if (/beta/i.test(version)) {
      stability = "beta";
    } else if (/rc/i.test(version)) {
      stability = "rc";
    } else {
      stability = "pre-release";
    }
  }

  return stability;
}

describe("Stability detection", () => {
  it("detects 0.x.x as alpha", () => {
    expect(detectStability("0.1.0")).toBe("alpha");
    expect(detectStability("0.0.6")).toBe("alpha");
    expect(detectStability("0.99.0")).toBe("alpha");
  });

  it("detects 1.x.x+ as stable", () => {
    expect(detectStability("1.0.0")).toBe("stable");
    expect(detectStability("2.3.4")).toBe("stable");
    expect(detectStability("10.0.0")).toBe("stable");
  });

  it("detects -beta suffix as beta", () => {
    expect(detectStability("1.0.0-beta")).toBe("beta");
    expect(detectStability("1.0.0-beta.1")).toBe("beta");
    expect(detectStability("2.0.0-Beta")).toBe("beta");
  });

  it("detects -alpha suffix as alpha", () => {
    expect(detectStability("1.0.0-alpha")).toBe("alpha");
    expect(detectStability("1.0.0-alpha.2")).toBe("alpha");
  });

  it("detects -rc suffix as rc", () => {
    expect(detectStability("1.0.0-rc.1")).toBe("rc");
    expect(detectStability("2.0.0-RC1")).toBe("rc");
  });

  it("detects -dev/-canary/-nightly/-preview as pre-release", () => {
    expect(detectStability("1.0.0-dev")).toBe("pre-release");
    expect(detectStability("1.0.0-canary")).toBe("pre-release");
    expect(detectStability("1.0.0-nightly")).toBe("pre-release");
    expect(detectStability("1.0.0-preview")).toBe("pre-release");
  });

  it("GitHub prerelease flag marks as pre-release", () => {
    expect(detectStability("1.0.0", { isGitHubPrerelease: true })).toBe(
      "pre-release",
    );
  });

  it("suffix takes priority over 0.x.x", () => {
    expect(detectStability("0.1.0-beta")).toBe("beta");
    expect(detectStability("0.1.0-rc.1")).toBe("rc");
  });

  it("suffix takes priority over GitHub prerelease flag", () => {
    expect(
      detectStability("1.0.0-beta", { isGitHubPrerelease: true }),
    ).toBe("beta");
    expect(
      detectStability("1.0.0-alpha", { isGitHubPrerelease: true }),
    ).toBe("alpha");
  });
});
