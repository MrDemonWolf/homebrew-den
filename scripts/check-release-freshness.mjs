#!/usr/bin/env node
// Compare each formula/cask's pinned version against the latest GitHub release.
// Exits non-zero if any package is behind, so a scheduled run flags staleness.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const token = process.env.GITHUB_TOKEN;
const headers = {
  "User-Agent": "homebrew-den-freshness",
  Accept: "application/vnd.github+json",
  ...(token ? { Authorization: `token ${token}` } : {}),
};

const field = (content, name) => {
  const m = content.match(new RegExp(`^\\s*${name}\\s+"([^"]*)"`, "m"));
  return m ? m[1] : null;
};
const repoFrom = (url) => {
  const m = (url || "").match(/github\.com\/([^/]+\/[^/"#]+)/);
  return m ? m[1].replace(/\.git$/, "") : null;
};
const norm = (v) => (v || "").replace(/^v/, "");

function collect() {
  const items = [];
  for (const [dir, kind] of [["Formula", "formula"], ["Casks", "cask"]]) {
    const d = path.join(ROOT, dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((x) => x.endsWith(".rb"))) {
      const c = readFileSync(path.join(d, f), "utf-8");
      const name = f.replace(/\.rb$/, "");
      const repo = repoFrom(field(c, "url")) || repoFrom(field(c, "homepage"));
      items.push({ name, kind, version: field(c, "version"), repo });
    }
  }
  return items;
}

let stale = 0;
let errors = 0;
for (const it of collect()) {
  if (!it.repo) {
    console.log(`? ${it.name}: no GitHub repo detected, skipping`);
    continue;
  }
  try {
    const r = await fetch(`https://api.github.com/repos/${it.repo}/releases/latest`, { headers });
    if (!r.ok) {
      console.log(`! ${it.name}: GitHub API ${r.status} for ${it.repo}`);
      errors++;
      continue;
    }
    const latest = norm((await r.json()).tag_name);
    if (latest && latest !== norm(it.version)) {
      console.log(`STALE ${it.name}: pinned ${it.version} but latest release is ${latest}`);
      stale++;
    } else {
      console.log(`ok ${it.name}: ${it.version} is current`);
    }
  } catch (e) {
    console.log(`! ${it.name}: ${e.message}`);
    errors++;
  }
}

if (stale > 0) {
  console.log(`\n${stale} package(s) behind their latest release.`);
  process.exit(1);
}
if (errors > 0) {
  console.log(`\n${errors} package(s) could not be checked.`);
  process.exit(2);
}
console.log("\nAll packages are up to date.");
