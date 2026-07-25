// GitHub release history for a repo, built at build time. Honors OFFLINE (skip
// network, empty history), STRICT_RELEASES (fail the build on API error), and
// GITHUB_TOKEN. Timeout/retry preserved from the old curl flags, env-overridable.
// Replaces the curl + python merge in build-site.sh using Node's global fetch.

const TIMEOUT_MS = Number(process.env.RELEASES_TIMEOUT_MS || 30000);
const RETRIES = Number(process.env.RELEASES_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.RELEASES_RETRY_DELAY_MS || 2000);
const MAX_PAGES = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(repo, page, token) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "homebrew-den-build",
  };
  if (token) headers.Authorization = `token ${token}`;

  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { headers, signal: ctrl.signal });
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

async function fetchReleases(repo, token) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchPage(repo, page, token);
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Resolve a package's release history.
 * @returns {Promise<{ isPrerelease: boolean, versions: Array }>}
 */
export async function resolveReleases(repo, version, opts = {}) {
  const empty = { isPrerelease: false, versions: [] };
  if (!repo) return empty;

  const offline = opts.offline ?? process.env.OFFLINE === "1";
  // Match the old default: explicit STRICT_RELEASES wins; otherwise strict in CI.
  const strict =
    opts.strict ??
    (process.env.STRICT_RELEASES !== undefined
      ? process.env.STRICT_RELEASES === "1"
      : process.env.CI === "true");
  const token = opts.token ?? process.env.GITHUB_TOKEN;

  if (offline) {
    console.error(`  -- offline mode: skipping release fetch for ${repo}`);
    return empty;
  }

  let releases;
  try {
    releases = await fetchReleases(repo, token);
  } catch (err) {
    console.error(`  !! warning: could not fetch releases for ${repo} (${err.message})`);
    if (strict) {
      console.error(`  !! aborting: refusing to publish ${repo} without version history.`);
      console.error(`  !! (set OFFLINE=1 for an explicit local offline build)`);
      process.exit(1);
    }
    return empty;
  }

  let isPrerelease = false;
  for (const r of releases) {
    const tag = r.tag_name || "";
    if ((tag === version || tag === `v${version}`) && r.prerelease) {
      isPrerelease = true;
      break;
    }
  }

  const versions = releases.map((r) => {
    const tag = r.tag_name || "";
    return {
      version: tag.startsWith("v") ? tag.slice(1) : tag,
      tag,
      date: (r.published_at || "").slice(0, 10),
      prerelease: Boolean(r.prerelease),
      url: r.html_url || "",
    };
  });

  return { isPrerelease, versions };
}
