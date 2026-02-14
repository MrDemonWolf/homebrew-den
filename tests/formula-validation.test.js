import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { FORMULA_DIR } from "./helpers.js";

const formulaFiles = existsSync(FORMULA_DIR)
  ? readdirSync(FORMULA_DIR).filter((f) => f.endsWith(".rb"))
  : [];

describe.each(formulaFiles)("Formula: %s", (filename) => {
  const filepath = path.join(FORMULA_DIR, filename);
  const content = readFileSync(filepath, "utf-8");
  const name = filename.replace(/\.rb$/, "");

  it("has a desc field (non-empty, <=80 chars)", () => {
    const match = content.match(/^\s*desc\s+"(.+)"/m);
    expect(match).not.toBeNull();
    expect(match[1].length).toBeGreaterThan(0);
    expect(match[1].length).toBeLessThanOrEqual(80);
  });

  it("has a homepage URL starting with https://", () => {
    const match = content.match(/^\s*homepage\s+"(.+)"/m);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/^https:\/\//);
  });

  it("has a version field matching semver-ish pattern", () => {
    const match = content.match(/^\s*version\s+"(.+)"/m);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/^\d+\.\d+/);
  });

  it("has a license field", () => {
    expect(content).toMatch(/^\s*license\s+"/m);
  });

  it("has SHA256 checksums for downloads", () => {
    expect(content).toMatch(/^\s*sha256\s+"/m);
  });

  it("has a test do block", () => {
    expect(content).toMatch(/^\s*test do\s*$/m);
  });

  it("has download URLs", () => {
    expect(content).toMatch(/^\s*url\s+"/m);
  });

  it("class name matches filename (capitalized)", () => {
    const expected = name.charAt(0).toUpperCase() + name.slice(1);
    const match = content.match(/^class\s+(\w+)\s+</m);
    expect(match).not.toBeNull();
    expect(match[1]).toBe(expected);
  });
});
