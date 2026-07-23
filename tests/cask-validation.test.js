import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CASKS_DIR, extractFormulaField } from "./helpers.js";

const caskFiles = existsSync(CASKS_DIR)
  ? readdirSync(CASKS_DIR).filter((f) => f.endsWith(".rb"))
  : [];

describe.each(caskFiles)("Cask: %s", (filename) => {
  const filepath = path.join(CASKS_DIR, filename);
  const content = readFileSync(filepath, "utf-8");
  const name = filename.replace(/\.rb$/, "");

  it("declares the cask token matching the filename", () => {
    const token = extractFormulaField(content, /^\s*cask\s+"([^"]+)"/m);
    expect(token).toBe(name);
  });

  it("has a version field matching a semver-ish pattern", () => {
    const version = extractFormulaField(content, /^\s*version\s+"([^"]+)"/m);
    expect(version).toMatch(/^\d+\.\d+/);
  });

  it("has a sha256 checksum", () => {
    expect(content).toMatch(/^\s*sha256\s+"[0-9a-f]{64}"/m);
  });

  it("has a download url", () => {
    const url = extractFormulaField(content, /^\s*url\s+"([^"]+)"/m);
    expect(url).toMatch(/^https:\/\//);
  });

  it("has a desc field (non-empty, <=80 chars)", () => {
    const desc = extractFormulaField(content, /^\s*desc\s+"([^"]+)"/m);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc.length).toBeLessThanOrEqual(80);
  });

  it("has a homepage URL starting with https://", () => {
    const homepage = extractFormulaField(content, /^\s*homepage\s+"([^"]+)"/m);
    expect(homepage).toMatch(/^https:\/\//);
  });

  it("has an app display name", () => {
    const appName = extractFormulaField(content, /^\s*name\s+"([^"]+)"/m);
    expect(appName.length).toBeGreaterThan(0);
  });

  it("declares an app stanza", () => {
    expect(content).toMatch(/^\s*app\s+"/m);
  });

  it("verifies the github download when homepage is off-github", () => {
    const url = extractFormulaField(content, /^\s*url\s+"([^"]+)"/m);
    const homepage = extractFormulaField(content, /^\s*homepage\s+"([^"]+)"/m);
    const urlHost = new URL(url).host;
    const homeHost = new URL(homepage).host;
    // brew requires `verified:` when the download host differs from the homepage host.
    if (urlHost !== homeHost) {
      expect(content).toMatch(/verified:\s*"/);
    }
  });
});
