import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Build the site ONCE for the whole test run into an isolated temp dir, then
// hand its path to every test file via `provide`/`inject`. OFFLINE keeps it
// deterministic; SITE_OUT_DIR points Astro's output away from the repo's _site,
// so there is no shared-file race between parallel workers.
export default function setup({ provide }) {
  const root = path.resolve(import.meta.dirname, "..");
  const dir = mkdtempSync(path.join(os.tmpdir(), "homebrew-den-site-"));
  // Vitest injects BASE_URL="/" which Vite would use to override Astro's base;
  // drop it so the build uses the configured /homebrew-den base.
  const env = { ...process.env, OFFLINE: "1", SITE_OUT_DIR: dir };
  delete env.BASE_URL;
  execSync("npx astro build", { cwd: root, stdio: "inherit", timeout: 120_000, env });
  provide("siteDir", dir);
  return () => rmSync(dir, { recursive: true, force: true });
}
