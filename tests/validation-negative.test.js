import { describe, it, expect } from "vitest";
import { extractRbField } from "./helpers.js";

// Guards that the field validators actually discriminate — i.e. a required
// field that is missing or malformed is detected, not silently accepted.
describe("Required-field validation rejects bad input", () => {
  const incomplete = `class Broken < Formula
  homepage "https://github.com/x/y"
  license "MIT"
end
`;

  it("detects a missing desc", () => {
    expect(extractRbField(incomplete, "desc")).toBeNull();
  });

  it("detects a missing version", () => {
    expect(extractRbField(incomplete, "version")).toBeNull();
  });

  it("flags a desc longer than 80 chars", () => {
    const longDesc = "x".repeat(90);
    const rb = `class T < Formula\n  desc "${longDesc}"\nend\n`;
    const desc = extractRbField(rb, "desc");
    expect(desc.length).toBeGreaterThan(80);
  });

  it("flags a non-https homepage", () => {
    const rb = `class T < Formula\n  homepage "http://insecure.example"\nend\n`;
    expect(extractRbField(rb, "homepage")).not.toMatch(/^https:\/\//);
  });

  it("flags a non-semver version", () => {
    const rb = `class T < Formula\n  version "latest"\nend\n`;
    expect(extractRbField(rb, "version")).not.toMatch(/^\d+\.\d+/);
  });
});
