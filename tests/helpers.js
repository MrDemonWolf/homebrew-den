import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";

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
