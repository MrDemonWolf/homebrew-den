#!/usr/bin/env node
// Verify each formula/cask's declared sha256 matches the actual downloadable
// release artifact — not merely that a sha256 field is present. Run in CI.
// Uses the single catalog parser so url/version/sha256 come from one source.
import path from "node:path";
import { createHash } from "node:crypto";
import { loadCatalog } from "../src/lib/catalog.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

// Fail loudly on a bad override rather than silently degrading: Number("abc")
// is NaN, and `attempt <= NaN` is false, so the retry loop would never run a
// single attempt and would throw an undefined error.
function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer (got ${JSON.stringify(raw)})`);
  }
  return value;
}

const TIMEOUT_MS = envInt("CHECKSUM_TIMEOUT_MS", 180000);
const RETRIES = envInt("CHECKSUM_RETRIES", 3);
const RETRY_DELAY_MS = envInt("CHECKSUM_RETRY_DELAY_MS", 3000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Download once, with bounded retries. Mirrors the old curl flags
// (--retry 3 --retry-delay 3) so a transient CDN hiccup does not fail the brew
// job — and, since deploy needs the brew job, block the Pages deploy.
async function download(url) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { redirect: "follow", signal: ctrl.signal });
      if (!res.ok) {
        // Drain the body so the socket can be reused/closed promptly.
        await res.arrayBuffer().catch(() => {});
        const err = new Error(`HTTP ${res.status}`);
        // 4xx (bad URL, renamed asset, private repo) will never succeed on a
        // retry — fail immediately instead of burning RETRIES * delay first.
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          err.permanent = true;
        }
        throw err;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (e.permanent) throw e;
      lastErr = e;
      if (attempt < RETRIES) console.log(`   .. attempt ${attempt + 1} failed (${e.message}), retrying`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

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

  try {
    const buf = await download(expanded);
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
  }
}

process.exit(status);
