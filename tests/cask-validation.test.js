import { describe, it, expect } from "vitest";
import { listCasks } from "./helpers.js";

// Field values come from the single catalog parser (src/lib/catalog.mjs); only
// structural stanza checks fall back to the raw .rb `content`.
describe.each(listCasks())("Cask: $filename", (c) => {
  const content = c.content;

  it("declares the cask token matching the filename", () => {
    expect(c.name).toBe(c.filename.replace(/\.rb$/, ""));
  });

  it("has a version field matching a semver-ish pattern", () => {
    expect(c.version).toMatch(/^\d+\.\d+/);
  });

  it("has a sha256 checksum", () => {
    expect(c.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("has a download url", () => {
    expect(c.url).toMatch(/^https:\/\//);
  });

  it("has a desc field (non-empty, <=80 chars)", () => {
    expect(c.desc).toBeTruthy();
    expect(c.desc.length).toBeGreaterThan(0);
    expect(c.desc.length).toBeLessThanOrEqual(80);
  });

  it("has a homepage URL starting with https://", () => {
    expect(c.homepage).toMatch(/^https:\/\//);
  });

  it("has an app display name", () => {
    expect(c.appName).toBeTruthy();
    expect(c.appName.length).toBeGreaterThan(0);
  });

  it("declares an app stanza", () => {
    expect(content).toMatch(/^\s*app\s+"/m);
  });

  it("verifies the github download when homepage is off-github", () => {
    const urlHost = new URL(c.url.replaceAll("#{version}", c.version || "")).host;
    const homeHost = new URL(c.homepage).host;
    // brew requires `verified:` when the download host differs from the homepage host.
    if (urlHost !== homeHost) {
      expect(content).toMatch(/verified:\s*"/);
    }
  });
});
