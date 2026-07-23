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
import { expect } from "vitest";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const FORMULA_DIR = path.join(ROOT, "Formula");
export const CASKS_DIR = path.join(ROOT, "Casks");

let buildDir = null;
let buildOut = "";

/**
 * Build the site ONCE per test run into an isolated temp directory.
 * Never reuses or touches the user's _site/. Returns the build stdout.
 */
export function runBuild() {
  if (buildDir) return buildOut;
  const dir = mkdtempSync(path.join(os.tmpdir(), "homebrew-den-site-"));
  // OFFLINE keeps the test build deterministic and network-independent.
  buildOut = execSync("bash scripts/build-site.sh", {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 120_000,
    env: { ...process.env, OUT_DIR: dir, OFFLINE: "1" },
  });
  buildDir = dir;
  return buildOut;
}

/** Absolute path to the freshly-built site (builds on first call). */
export function siteDir() {
  runBuild();
  return buildDir;
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

/** Assert a template placeholder is not present in the HTML string. */
export function expectNoPlaceholder(html, placeholder) {
  expect(html).not.toContain(`{{${placeholder}}}`);
}

/** Assert NO unresolved {{...}} placeholders remain anywhere in the string. */
export function expectNoUnresolvedPlaceholders(html) {
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  expect(leftover, `unresolved placeholders: ${leftover}`).toBeNull();
}

/** Walk the built site and return every generated *.html path (relative). */
export function listBuiltHtml() {
  const dir = siteDir();
  const out = [];
  const walk = (d, prefix) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(path.join(d, entry.name), rel);
      else if (entry.name.endsWith(".html")) out.push(rel);
    }
  };
  walk(dir, "");
  return out;
}

/**
 * Extract a JSON object assigned to a JS variable from HTML source.
 * e.g. extractJSON(html, "data") parses `const data = {...};`
 */
export function extractJSON(html, varName) {
  const match = html.match(new RegExp(`const ${varName} = ({.*?});`, "s"));
  expect(match, `const ${varName} not found`).not.toBeNull();
  return JSON.parse(match[1]);
}

/** Extract a quoted field value from .rb source (mirrors extract_field in bash). */
export function extractRbField(content, field) {
  const match = content.match(new RegExp(`^\\s*${field}\\s+"([^"]*)"`, "m"));
  return match ? match[1] : null;
}

/** Backwards-compatible alias used by formula-validation tests. */
export function extractFormulaField(content, regex) {
  const match = content.match(regex);
  expect(match).not.toBeNull();
  return match[1];
}

/** List Formula/*.rb with parsed metadata (name derived from filename). */
export function listFormulae() {
  if (!existsSync(FORMULA_DIR)) return [];
  return readdirSync(FORMULA_DIR)
    .filter((f) => f.endsWith(".rb"))
    .map((filename) => {
      const content = readFileSync(path.join(FORMULA_DIR, filename), "utf-8");
      const name = filename.replace(/\.rb$/, "");
      return {
        filename,
        name,
        content,
        desc: extractRbField(content, "desc"),
        version: extractRbField(content, "version"),
        homepage: extractRbField(content, "homepage"),
        license: extractRbField(content, "license"),
      };
    });
}

/** List Casks/*.rb with parsed metadata (name derived from `cask "x"`). */
export function listCasks() {
  if (!existsSync(CASKS_DIR)) return [];
  return readdirSync(CASKS_DIR)
    .filter((f) => f.endsWith(".rb"))
    .map((filename) => {
      const content = readFileSync(path.join(CASKS_DIR, filename), "utf-8");
      return {
        filename,
        name: extractRbField(content, "cask"),
        content,
        desc: extractRbField(content, "desc"),
        version: extractRbField(content, "version"),
        homepage: extractRbField(content, "homepage"),
        appName: extractRbField(content, "name"),
        url: extractRbField(content, "url"),
      };
    });
}

/**
 * Load a named function from site/shared.js by extracting its source, so tests
 * exercise the *actual* shipped implementation rather than a drifting copy.
 */
export function loadSharedFunction(fnName) {
  const src = readFileSync(path.join(ROOT, "site", "shared.js"), "utf-8");
  const match = src.match(new RegExp(`function ${fnName}\\s*\\([\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`function ${fnName} not found in site/shared.js`);
  // eslint-disable-next-line no-new-func
  return new Function(`${match[0]}\nreturn ${fnName};`)();
}

/**
 * Extract a bash function body from scripts/build-site.sh and return a callable
 * that runs the REAL function with the given args. Keeps the test bound to the
 * shipped bash implementation (no third copy of the logic).
 */
export function callBashFunction(fnName, args) {
  const src = readFileSync(path.join(ROOT, "scripts", "build-site.sh"), "utf-8");
  const match = src.match(new RegExp(`${fnName}\\(\\)\\s*\\{[\\s\\S]*?\\n\\}`, "m"));
  if (!match) throw new Error(`function ${fnName} not found in build-site.sh`);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "homebrew-den-fn-"));
  const file = path.join(tmp, "fn.sh");
  const quoted = args.map((a) => `'${String(a).replace(/'/g, "'\\''")}'`).join(" ");
  writeFileSync(file, `${match[0]}\n${fnName} ${quoted}\n`);
  return execSync(`bash "${file}"`, { encoding: "utf-8" }).replace(/\n$/, "");
}

/**
 * Build a throwaway tap (copies scripts/ + site/ from ROOT) whose Formula/Casks
 * are provided inline. Runs OFFLINE so it is deterministic and network-free.
 * Returns the built site directory. Used for hostile-input / negative tests.
 */
export function buildFixtureTap({ formulae = {}, casks = {} } = {}) {
  const tap = mkdtempSync(path.join(os.tmpdir(), "homebrew-den-fixture-"));
  cpSync(path.join(ROOT, "scripts"), path.join(tap, "scripts"), { recursive: true });
  cpSync(path.join(ROOT, "site"), path.join(tap, "site"), { recursive: true });
  // Symlink the real node_modules so npx --no-install and Tailwind's
  // `@import "tailwindcss"` both resolve without a fresh install.
  symlinkSync(path.join(ROOT, "node_modules"), path.join(tap, "node_modules"), "dir");
  mkdirSync(path.join(tap, "Formula"), { recursive: true });
  mkdirSync(path.join(tap, "Casks"), { recursive: true });
  for (const [file, body] of Object.entries(formulae)) {
    writeFileSync(path.join(tap, "Formula", file), body);
  }
  for (const [file, body] of Object.entries(casks)) {
    writeFileSync(path.join(tap, "Casks", file), body);
  }
  const out = path.join(tap, "out");
  execSync(`bash "${path.join(tap, "scripts", "build-site.sh")}"`, {
    cwd: tap,
    encoding: "utf-8",
    timeout: 120_000,
    env: { ...process.env, OUT_DIR: out, OFFLINE: "1" },
  });
  return out;
}
