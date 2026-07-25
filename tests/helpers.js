import { execSync } from "node:child_process";
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  symlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { load } from "cheerio";
import { expect, inject } from "vitest";
import { loadCatalog, parseField } from "../src/lib/catalog.mjs";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const BASE = "/homebrew-den";

// The single offline build produced by tests/global-setup.js.
export function siteDir() {
  return inject("siteDir");
}

/** Read an HTML file from the built site and return a cheerio instance. */
export function loadHTML(relativePath) {
  return load(readFileSync(path.join(siteDir(), relativePath), "utf-8"));
}

/** Read a raw file from the built site. */
export function readSiteFile(relativePath) {
  return readFileSync(path.join(siteDir(), relativePath), "utf-8");
}

/** Assert a file exists inside the built site. */
export function expectFileExists(...segments) {
  expect(existsSync(path.join(siteDir(), ...segments))).toBe(true);
}

/** Bundled CSS/JS filenames Astro emitted under _astro/. */
export function bundledAssets(ext) {
  const dir = path.join(siteDir(), "_astro");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(ext));
}

/**
 * Extract the embedded search catalog from a page. Astro embeds it as a
 * <script type="application/json" id="package-data"> (script-safe JSON).
 */
export function extractPackageData(html) {
  const m = html.match(
    /<script type="application\/json" id="package-data"[^>]*>([\s\S]*?)<\/script>/,
  );
  expect(m, "package-data script not found").not.toBeNull();
  return JSON.parse(m[1]);
}

// --- Catalog (single source of truth: src/lib/catalog.mjs) ---
export { loadCatalog, parseField } from "../src/lib/catalog.mjs";

/** Quoted field value from .rb source (alias of the shared parser). */
export const extractRbField = parseField;

/** Match a caller-supplied regex against .rb source and return group 1. */
export function extractFormulaField(content, regex) {
  const match = content.match(regex);
  expect(match).not.toBeNull();
  return match[1];
}

export function listFormulae() {
  return loadCatalog(ROOT).formulae;
}

export function listCasks() {
  return loadCatalog(ROOT).casks;
}

/**
 * Build a throwaway Astro tap (copies src/ + config from ROOT, symlinks
 * node_modules) whose Formula/Casks are provided inline. Runs OFFLINE so it is
 * deterministic and network-free. Returns the built site directory. Used for
 * hostile-input / XSS tests. One full `astro build` per call — keep to one.
 */
export function buildFixtureTap({ formulae = {}, casks = {} } = {}) {
  const tap = mkdtempSync(path.join(os.tmpdir(), "homebrew-den-fixture-"));
  cpSync(path.join(ROOT, "src"), path.join(tap, "src"), { recursive: true });
  cpSync(path.join(ROOT, "astro.config.mjs"), path.join(tap, "astro.config.mjs"));
  cpSync(path.join(ROOT, "package.json"), path.join(tap, "package.json"));
  // Symlink the real node_modules so astro + @tailwindcss/vite resolve.
  symlinkSync(path.join(ROOT, "node_modules"), path.join(tap, "node_modules"), "dir");
  mkdirSync(path.join(tap, "Formula"), { recursive: true });
  mkdirSync(path.join(tap, "Casks"), { recursive: true });
  for (const [file, body] of Object.entries(formulae)) {
    writeFileSync(path.join(tap, "Formula", file), body);
  }
  for (const [file, body] of Object.entries(casks)) {
    writeFileSync(path.join(tap, "Casks", file), body);
  }
  const out = path.join(tap, "_site");
  // Drop vitest's injected BASE_URL so Astro's configured base is used.
  const env = { ...process.env, OFFLINE: "1", SITE_OUT_DIR: out };
  delete env.BASE_URL;
  execSync("npx astro build", { cwd: tap, encoding: "utf-8", timeout: 120_000, env });
  return out;
}
