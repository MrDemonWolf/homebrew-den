# AGENTS.md

## Project Overview

**homebrew-den** is a Homebrew tap (`mrdemonwolf/den`) for distributing CLI tools and macOS apps. Formulae target pre-built binaries and casks target DMG installers, both hosted via GitHub Releases.

The project includes an auto-generated documentation site deployed to GitHub Pages.

## Repository Structure

```
homebrew-den/
├── Formula/             # Formula Ruby files (CLI tools)
├── Casks/               # Cask Ruby files (macOS apps)
├── astro.config.mjs     # Astro config (static, site/base, outDir _site, Tailwind v4)
├── src/                 # Astro site
│   ├── lib/             # Shared build-time modules (single source of truth)
│   │   ├── catalog.mjs  #   THE .rb metadata parser (loadCatalog/parseField)
│   │   ├── stability.mjs#   THE stability classifier (detectStability)
│   │   ├── releases.mjs #   GitHub Releases fetch (offline/strict/token/retry)
│   │   └── serialize.mjs#   script-safe JSON + safeUrl (XSS helpers)
│   ├── layouts/         # Base.astro (+ head/theme/scripts), used by every page
│   ├── components/      # Nav, SearchModal, Footer, PackageTable, DetailPage,
│   │                    # StabilityBadge, VersionHistory
│   ├── pages/           # index.astro, formulae/[name].astro, casks/[name].astro
│   ├── scripts/site.js  # Client JS (theme, search, copy, section-tracking)
│   └── styles/global.css# Tailwind v4 source (theme config + custom styles)
├── public/favicon.svg   # SVG favicon (brew cup icon)
├── package.json         # Node deps (astro, @tailwindcss/vite, vitest, cheerio)
├── scripts/
│   ├── verify-site.mjs           # Post-build artifact check (run in CI)
│   ├── verify-checksums.mjs      # sha256 of real release artifacts
│   └── check-release-freshness.mjs # Flags packages behind their latest release
├── tests/
│   ├── global-setup.js         # One offline astro build → provided to all tests
│   ├── helpers.js              # Shared test utilities (inject siteDir, catalog)
│   ├── build-output.test.js    # Built-site file structure + metadata + data
│   ├── html-content.test.js    # Generated HTML DOM structure + a11y
│   ├── stability.test.js       # detectStability (src/lib/stability.mjs)
│   ├── formula-validation.test.js / cask-validation.test.js  # .rb field checks
│   ├── readme-tables.test.js   # README tables vs .rb catalog
│   ├── validation-negative.test.js # field validators reject bad input
│   ├── safe-url.test.js        # URL-scheme allowlist (both safeUrl copies)
│   └── xss.test.js             # hostile .rb metadata stays escaped
├── vitest.config.js     # Vitest config (globalSetup → build once)
├── .github/workflows/
│   ├── ci.yml               # Test + brew validation; deploy _site to Pages
│   └── release-freshness.yml # Scheduled staleness check
├── LICENSE              # MIT — Copyright (c) 2026 MrDemonWolf, Inc.
├── README.md            # Tap usage, available packages, contributor guide
└── AGENTS.md            # This file
```

## Conventions

- Formula files live in `Formula/<name>.rb` and follow the standard Homebrew formula DSL.
- Cask files live in `Casks/<name>.rb` and follow the standard Homebrew cask DSL.
- Casks target DMG installers from GitHub Releases.
- SHA-256 checksums are generated with `shasum -a 256`.
- The available formulae/casks tables in README.md should be updated whenever a formula or cask is added or removed (`tests/readme-tables.test.js` fails on drift).

## Documentation Site

The site is an **[Astro](https://astro.build) static site** (base `/homebrew-den`,
output `_site/`) with per-formula and per-cask detail pages. Formula and cask
detail pages share **one** `src/components/DetailPage.astro`; the two thin route
files (`src/pages/formulae/[name].astro`, `casks/[name].astro`) pass the per-type
differences (breadcrumb label, License-vs-Application row, install command).
Everything is server-rendered so pages work with JavaScript disabled; the client
script (`src/scripts/site.js`) only adds progressive enhancement. Styled with
Tailwind CSS v4 via `@tailwindcss/vite` (`src/styles/global.css` holds the theme
config + custom styles). Themed after the mrdemonwolf.com brand (Poppins/Mulish
fonts, brand blue `#0e4d8d`, accent `#00aced`).

**Single sources of truth (no duplication):** `.rb` metadata is parsed **once** in
`src/lib/catalog.mjs` (`loadCatalog`), reused by the site pages, the test helpers,
`verify-checksums.mjs`, `verify-site.mjs`, and `check-release-freshness.mjs`.
Stability is classified **once** in `src/lib/stability.mjs` (`detectStability`),
used at build time and by tests — there is no browser copy.

### Key features
- Light-default theme with a dark toggle (system preference, localStorage, no-flash inline head script)
- Package tables + detail pages are server-rendered at build time (work without JavaScript)
- Cmd+K / Ctrl+K search palette with keyboard navigation and focus trapping (reads an embedded script-safe `package-data` JSON)
- Per-formula pages at `/formulae/<name>/` and per-cask pages at `/casks/<name>/`, sticky sidebar (desktop) + horizontal strip (mobile)
- Active-section tracking via IntersectionObserver on detail pages
- Stability badges: alpha (0.x.x), beta, RC, pre-release (semver + GitHub Releases prerelease flag)
- Version history table on detail pages (pulled from the GitHub Releases API in `src/lib/releases.mjs`)
- Auto-deploys via GitHub Actions on push to main (`ci.yml` builds strict `_site`, verifies it, then deploys)

### Security notes (do not regress)

- Anything embedded in a `<script>` tag goes through `serializeJson()` in
  `src/lib/serialize.mjs` — it neutralizes `</script>` breakout and the
  U+2028/U+2029 separators.
- Every URL rendered into an `href` goes through `safeUrl()`. It strips C0
  controls/DEL **before** testing the scheme, because the WHATWG URL parser
  removes ASCII tab/LF/CR while resolving a scheme — without that step
  `java<TAB>script:alert(1)` reaches the browser as `javascript:`. This helper is
  intentionally duplicated (build-time `src/lib/serialize.mjs` + bundled client
  `src/scripts/site.js`); `tests/safe-url.test.js` asserts both copies behave
  identically. Change one, change the other.
- Astro auto-escapes `{expr}` in markup, so `set:html` is the risky construct —
  avoid it for any `.rb`- or API-derived value.

### Build locally

Requires **Node.js 22+**.

```sh
npm install          # Install dependencies (first time only)
npm run dev          # Live dev server
npm run build        # Build the static site into _site/
npm run preview      # Serve the built _site/
```

Env knobs: `OFFLINE=1` (skip network, empty version history), `STRICT_RELEASES=1`
(fail on GitHub API error; implied when `CI=true`), `GITHUB_TOKEN` (authenticated
API requests), `SITE_OUT_DIR` (override the output dir; tests use it to build
into a temp dir). `node scripts/verify-site.mjs _site` checks the built artifact.

## Testing

The project uses **Vitest** + **cheerio**. `tests/global-setup.js` runs **one**
offline `astro build` into a temp dir and hands its path to every test file via
`provide`/`inject` — the suite builds once, with no shared-file race.

### Test files
- `tests/global-setup.js` — single offline build; `tests/helpers.js` — inject `siteDir`, re-export the catalog parser
- `tests/build-output.test.js` — built-site file structure, embedded data, server-rendered metadata
- `tests/html-content.test.js` — generated HTML DOM structure, links, search-dialog a11y
- `tests/stability.test.js` — `detectStability` (from `src/lib/stability.mjs`)
- `tests/formula-validation.test.js` / `cask-validation.test.js` — `.rb` field validation (sourced from `loadCatalog`)
- `tests/readme-tables.test.js` — README tables vs `.rb` catalog; `validation-negative.test.js` — validators reject bad input
- `tests/safe-url.test.js` — URL-scheme allowlist matrix against both `safeUrl` copies
- `tests/xss.test.js` — hostile `.rb` metadata stays escaped (builds a throwaway fixture tap)

### Running tests

```sh
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
```

### CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

1. **Build & test** (ubuntu) — `npm ci`, `npm audit`, a strict `astro build`,
   `verify-site.mjs`, `npm test`, then uploads `_site` as the Pages artifact.
2. **Homebrew validation** (macOS) — `brew style`, `brew readall`,
   `brew audit --strict --online` for every formula/cask, real artifact checksum
   verification, plus informational `brew livecheck` and an install smoke test.
3. **Deploy** — gated on *both* jobs succeeding, `main` pushes only, and deploys
   the exact artifact that passed. Never build a second time for deploy.

Actions are pinned to full commit SHAs with version comments — keep it that way.
`release-freshness.yml` runs weekly to flag packages behind their latest release.

## Useful Commands

```sh
brew tap mrdemonwolf/den             # Add the tap
brew install <formula>               # Install a formula
brew install --cask <name>           # Install a cask
brew untap mrdemonwolf/den           # Remove the tap
brew install --cask Casks/<name>.rb  # Test a cask locally
npm install                          # Install Node.js dependencies
npm run build                        # Build the documentation site into _site/
npm test                             # Run test suite
npm run test:watch                   # Run tests in watch mode
```
