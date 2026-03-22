import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { FORMULA_DIR, extractFormulaField } from "./helpers.js";

const formulaFiles = existsSync(FORMULA_DIR)
  ? readdirSync(FORMULA_DIR).filter((f) => f.endsWith(".rb"))
  : [];

describe.each(formulaFiles)("Formula: %s", (filename) => {
  const filepath = path.join(FORMULA_DIR, filename);
  const content = readFileSync(filepath, "utf-8");
  const name = filename.replace(/\.rb$/, "");

  it("has a desc field (non-empty, <=80 chars)", () => {
    const desc = extractFormulaField(content, /^\s*desc\s+"(.+)"/m);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc.length).toBeLessThanOrEqual(80);
  });

  it("has a homepage URL starting with https://", () => {
    const homepage = extractFormulaField(content, /^\s*homepage\s+"(.+)"/m);
    expect(homepage).toMatch(/^https:\/\//);
  });

  it("has a version field matching semver-ish pattern", () => {
    const version = extractFormulaField(content, /^\s*version\s+"(.+)"/m);
    expect(version).toMatch(/^\d+\.\d+/);
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
    const className = extractFormulaField(content, /^class\s+(\w+)\s+</m);
    expect(className).toBe(expected);
  });
});
