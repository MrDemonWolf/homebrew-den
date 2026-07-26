#!/usr/bin/env node
// Verify a built site (default: _site) before it is deployed. Checks the exact
// artifact CI uploads — not a separately-built proxy: index + a detail page per
// catalog package, bundled assets, and the embedded search data (parses, counts
// match, no </script> breakout). Exits non-zero on any problem.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { loadCatalog } from "../src/lib/catalog.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const dir = path.resolve(process.argv[2] || "_site");
const errors = [];
const need = (rel, msg) => {
  if (!existsSync(path.join(dir, rel))) errors.push(msg || `missing ${rel}`);
};

need("index.html");
need("favicon.svg");

const astroDir = path.join(dir, "_astro");
const astroFiles = existsSync(astroDir) ? readdirSync(astroDir) : [];
if (!astroFiles.some((f) => f.endsWith(".css"))) errors.push("no bundled CSS in _astro/");
if (!astroFiles.some((f) => f.endsWith(".js"))) errors.push("no bundled JS in _astro/");

const cat = loadCatalog(ROOT);
for (const f of cat.formulae) need(`formulae/${f.name}/index.html`, `missing formula page ${f.name}`);
for (const c of cat.casks) need(`casks/${c.name}/index.html`, `missing cask page ${c.name}`);

const indexPath = path.join(dir, "index.html");
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf-8");
  const m = html.match(/<script type="application\/json" id="package-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    errors.push("no package-data script in index.html");
  } else {
    if (m[1].includes("</script")) errors.push("raw </script> breakout in embedded package-data");
    try {
      const data = JSON.parse(m[1]);
      const nf = (data.formulae || []).length;
      const nc = (data.casks || []).length;
      if (nf !== cat.formulae.length) errors.push(`package-data formulae ${nf} != catalog ${cat.formulae.length}`);
      if (nc !== cat.casks.length) errors.push(`package-data casks ${nc} != catalog ${cat.casks.length}`);
    } catch (e) {
      errors.push(`package-data JSON invalid: ${e.message}`);
    }
  }
}

if (errors.length) {
  console.error("verify-site FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `verify-site OK: ${cat.formulae.length} formula + ${cat.casks.length} cask page(s), assets + search data verified in ${dir}`
);
