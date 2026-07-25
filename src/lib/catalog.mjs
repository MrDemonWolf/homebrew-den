import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

// Single source of truth for parsing Homebrew .rb metadata. Replaces the four
// former parsers (build-site.sh, verify-checksums, check-release-freshness, and
// the test helpers). ponytail: one parser — add fields here, never in a 5th copy.

/** First quoted value of a `field "value"` line. */
export function parseField(content, field) {
  const m = content.match(new RegExp(`^\\s*${field}\\s+"([^"]*)"`, "m"));
  return m ? m[1] : null;
}

/** Body of a `caveats` heredoc (`<<~EOS` … `EOS`), 6-space indent stripped. */
export function parseCaveats(content) {
  const out = [];
  let inCaveats = false;
  for (const line of content.split("\n")) {
    if (inCaveats) {
      if (/^\s*EOS\s*$/.test(line)) break;
      out.push(line.replace(/^ {6}/, ""));
    }
    if (line.includes("<<~EOS")) inCaveats = true;
  }
  return out.join("\n");
}

/** "owner/repo" from any github.com URL (else ""). */
export function repoFromUrl(url) {
  if (!url) return "";
  const m = url.match(/github\.com\/([^/]+\/[^/#"]+)/);
  return m ? m[1].replace(/\.git$/, "") : "";
}

function parseFormula(dir, filename) {
  const content = readFileSync(path.join(dir, filename), "utf-8");
  const homepage = parseField(content, "homepage");
  const url = parseField(content, "url");
  return {
    filename,
    name: filename.replace(/\.rb$/, ""),
    version: parseField(content, "version"),
    desc: parseField(content, "desc"),
    homepage,
    license: parseField(content, "license"),
    url,
    sha256: parseField(content, "sha256"),
    caveats: parseCaveats(content),
    repo: repoFromUrl(homepage) || repoFromUrl(url),
    content,
  };
}

function parseCask(dir, filename) {
  const content = readFileSync(path.join(dir, filename), "utf-8");
  const url = parseField(content, "url");
  const homepage = parseField(content, "homepage");
  return {
    filename,
    name: parseField(content, "cask"),
    version: parseField(content, "version"),
    desc: parseField(content, "desc"),
    homepage,
    appName: parseField(content, "name"),
    url,
    sha256: parseField(content, "sha256"),
    caveats: parseCaveats(content),
    repo: repoFromUrl(url) || repoFromUrl(homepage),
    content,
  };
}

function listDir(dir, parser) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".rb"))
    .sort()
    .map((f) => parser(dir, f))
    .filter((p) => p.name);
}

/** Normalized tap catalog: { formulae: [...], casks: [...] }. */
export function loadCatalog(root) {
  return {
    formulae: listDir(path.join(root, "Formula"), parseFormula),
    casks: listDir(path.join(root, "Casks"), parseCask),
  };
}
