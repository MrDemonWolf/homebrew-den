import { describe, it, expect } from "vitest";
import { listFormulae, extractFormulaField } from "./helpers.js";

// Catalog is the single source (src/lib/catalog.mjs); each entry carries its raw
// .rb `content` so field/structure checks need no second directory scan.
describe.each(listFormulae())("Formula: $filename", (f) => {
  const content = f.content;

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
    const expected = f.name.charAt(0).toUpperCase() + f.name.slice(1);
    const className = extractFormulaField(content, /^class\s+(\w+)\s+</m);
    expect(className).toBe(expected);
  });
});
