# CLAUDE.md

## Project Overview

**homebrew-den** is a Homebrew tap (`mrdemonwolf/den`) for distributing CLI tools and macOS apps. Formulae target pre-built binaries and casks target DMG installers, both hosted via GitHub Releases.

The project includes an auto-generated documentation site deployed to GitHub Pages.

## Repository Structure

```
homebrew-den/
├── Formula/             # Formula Ruby files (CLI tools)
├── Casks/               # Cask Ruby files (macOS apps)
├── site/
│   ├── template.html    # Homepage template (placeholders for partials, rows, JSON)
│   ├── detail-template.html   # Single detail-page template (shared by formulae + casks)
│   ├── partials/        # Shared HTML fragments (nav, search-modal, footer)
│   ├── shared.js        # Shared client JS (theme, search, copy, escaping, detail-page rendering)
│   ├── input.css        # Tailwind CSS source (theme config + custom styles)
│   └── favicon.svg      # SVG favicon (brew cup icon)
├── package.json         # Node.js deps (tailwindcss, vitest, cheerio)
├── scripts/
│   └── build-site.sh    # Parses .rb files, builds _site/
├── tests/
│   ├── helpers.js              # Shared test utilities
│   ├── build-output.test.js    # Build + output validation tests
│   ├── stability.test.js       # Stability detection tests
│   ├── formula-validation.test.js  # .rb file field validation tests
│   └── html-content.test.js    # HTML DOM structure tests
├── vitest.config.js     # Vitest configuration
├── .github/
│   └── workflows/
│       ├── deploy-site.yml  # Build + deploy to GitHub Pages on push to main
│       └── ci.yml           # CI: tests on push to main + PRs
├── LICENSE              # MIT — Copyright (c) 2026 MrDemonWolf, Inc.
├── README.md            # Tap usage, available packages, contributor guide
└── CLAUDE.md            # This file
```

## Conventions

- Formula files live in `Formula/<name>.rb` and follow the standard Homebrew formula DSL.
- Cask files live in `Casks/<name>.rb` and follow the standard Homebrew cask DSL.
- Casks target DMG installers from GitHub Releases.
- SHA-256 checksums are generated with `shasum -a 256`.
- The available formulae/casks tables in README.md should be updated whenever a formula or cask is added or removed.

## Documentation Site

The site is a static site with per-formula and per-cask detail pages. Formula and cask detail pages share **one** `site/detail-template.html`; `build-site.sh` fills in the few per-type differences (breadcrumb label, the License-vs-Application row, and the install command), and `initDetailPage()` in `site/shared.js` renders the common markup (stability badge, caveats, version history, sidebar tracking) for both. Styled with Tailwind CSS v4 (utility classes in HTML/JS + minimal custom CSS in `site/input.css` for theme variables, base resets, and table styles). Themed after the mrdemonwolf.com brand (Poppins/Mulish fonts, brand blue `#0e4d8d`, accent `#00aced`). A shell script parses `.rb` files, builds Tailwind, and generates everything.

### Key features
- Light-default theme with a dark toggle (respects system preference, saves to localStorage)
- Package tables are server-rendered at build time (work without JavaScript)
- Cmd+K / Ctrl+K search palette with keyboard navigation and focus trapping
- Per-formula pages at `/formulae/<name>/` and per-cask pages at `/casks/<name>/`, with sticky sidebar navigation (desktop) and horizontal scrollable strip (mobile)
- Active section tracking via IntersectionObserver on detail pages
- Stability badges: detects alpha (0.x.x), beta, RC, pre-release (from GitHub Releases API and version suffixes)
- Version history table on detail pages (pulled from GitHub Releases API)
- Shared nav/search/footer markup lives in `site/partials/`; `build-site.sh`'s `render_template` splices partials and placeholders
- Both detail-page types render from a single `site/detail-template.html`; shared client logic (theme, search, copy, stability badges, `initDetailPage`) lives once in `site/shared.js`
- Auto-deploys via GitHub Actions on push to main

### Build locally

Requires Node.js (for Tailwind CSS build).

```sh
npm install                     # Install Tailwind CSS (first time only)
bash scripts/build-site.sh      # Build site (includes Tailwind build)
open _site/index.html
```

The build script:
1. Parses `Formula/*.rb` and `Casks/*.rb` for metadata (name, version, desc, homepage, license, caveats)
2. Checks GitHub Releases API for pre-release flags, detects semver stability, and fetches version history
3. Generates `_site/index.html`, `_site/formulae/<name>/index.html`, and `_site/casks/<name>/index.html`
4. Builds Tailwind CSS (`site/input.css` → `site/output.css`)
5. Copies CSS, favicon, and `shared.js` to `_site/`

Supports `GITHUB_TOKEN` env var for authenticated API requests in CI.

## Testing

The project uses **Vitest** + **cheerio** for automated testing. Tests run against the real build output (`_site/`) produced by the build script.

### Test files
- `tests/helpers.js` — Shared utilities (paths, `runBuild()`, `loadHTML()`)
- `tests/build-output.test.js` — Build execution, file structure, template substitution, JSON validity, metadata
- `tests/stability.test.js` — Pure JS stability detection logic (mirrors bash semver rules)
- `tests/formula-validation.test.js` — `.rb` file field validation (desc, homepage, version, license, sha256, test block)
- `tests/html-content.test.js` — Generated HTML DOM structure, elements, links, cross-page references

### Running tests

```sh
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
```

### CI

Tests run automatically on every push to `main` and on pull requests via `.github/workflows/ci.yml`.

## Useful Commands

```sh
brew tap mrdemonwolf/den             # Add the tap
brew install <formula>               # Install a formula
brew install --cask <name>           # Install a cask
brew untap mrdemonwolf/den           # Remove the tap
brew install --cask Casks/<name>.rb  # Test a cask locally
npm install                          # Install Node.js dependencies
bash scripts/build-site.sh          # Build the documentation site
npm test                             # Run test suite
npm run test:watch                   # Run tests in watch mode
```
