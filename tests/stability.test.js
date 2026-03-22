import { describe, it, expect } from "vitest";
import { detectStability } from "./helpers.js";

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
