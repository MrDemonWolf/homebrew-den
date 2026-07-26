#!/usr/bin/env node
// Verify each formula/cask's declared sha256 matches the actual downloadable
// release artifact — not merely that a sha256 field is present. Run in CI.
// Uses the single catalog parser so url/version/sha256 come from one source.
import path from "node:path";
import { createHash } from "node:crypto";
import { loadCatalog } from "../src/lib/catalog.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const TIMEOUT_MS = Number(process.env.CHECKSUM_TIMEOUT_MS || 180000);

let status = 0;
const cat = loadCatalog(ROOT);

for (const pkg of [...cat.formulae, ...cat.casks]) {
  const { filename, version, url, sha256 } = pkg;
  if (!url || !sha256) {
    console.log(`-- skip ${filename} (no url/sha256)`);
    continue;
  }
  // Homebrew casks interpolate #{version} into the url.
  const expanded = url.replaceAll("#{version}", version || "");
  console.log(`-> ${filename}  ${expanded}`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(expanded, { redirect: "follow", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const actual = createHash("sha256").update(buf).digest("hex");
    if (actual === sha256) {
      console.log(`   OK   ${actual}`);
    } else {
      console.log(`   FAIL expected=${sha256} actual=${actual}`);
      status = 1;
    }
  } catch (e) {
    console.log(`   FAIL ${e.message}`);
    status = 1;
  } finally {
    clearTimeout(timer);
  }
}

process.exit(status);
