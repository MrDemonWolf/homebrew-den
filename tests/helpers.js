import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import { expect } from "vitest";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const SITE_DIR = path.join(ROOT, "_site");
export const FORMULA_DIR = path.join(ROOT, "Formula");
export const CASKS_DIR = path.join(ROOT, "Casks");

let built = false;

/**
 * Run the build script once. Subsequent calls are no-ops.
 * Skips the build if _site/index.html already exists (e.g. CI pre-built it).
 * Returns the build stdout (empty string if skipped).
 */
export function runBuild() {
  if (built) return "";
  if (existsSync(path.join(SITE_DIR, "index.html"))) {
    built = true;
    return "";
  }
  const out = execSync("bash scripts/build-site.sh", {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 120_000,
    env: { ...process.env },
  });
  built = true;
  return out;
}

/**
 * Read an HTML file from _site/ and return a cheerio instance.
 */
export function loadHTML(relativePath) {
  const html = readFileSync(path.join(SITE_DIR, relativePath), "utf-8");
  return load(html);
}

/**
 * Read a raw file from _site/.
 */
export function readSiteFile(relativePath) {
  return readFileSync(path.join(SITE_DIR, relativePath), "utf-8");
}

/**
 * Extract a JSON object assigned to a JS variable from HTML source.
 * e.g. extractJSON(html, "data") parses `const data = {...};`
 */
export function extractJSON(html, varName) {
  const match = html.match(new RegExp(`const ${varName} = ({.*?});`, "s"));
  expect(match).not.toBeNull();
  return JSON.parse(match[1]);
}

/**
 * Assert a file exists inside _site/.
 */
export function expectFileExists(...segments) {
  expect(existsSync(path.join(SITE_DIR, ...segments))).toBe(true);
}

/**
 * Assert a template placeholder is not present in the HTML string.
 */
export function expectNoPlaceholder(html, placeholder) {
  expect(html).not.toContain(`{{${placeholder}}}`);
}

/**
 * Extract a formula field value using a regex pattern.
 * Returns the first capture group match.
 */
export function extractFormulaField(content, regex) {
  const match = content.match(regex);
  expect(match).not.toBeNull();
  return match[1];
}

/**
 * Pure JS implementation of the bash stability detection logic
 * from scripts/build-site.sh.
 */
export function detectStability(version, { isGitHubPrerelease = false } = {}) {
  let stability = "stable";

  if (isGitHubPrerelease) {
    stability = "pre-release";
  }

  if (/^0\./.test(version) && stability === "stable") {
    stability = "alpha";
  }

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
