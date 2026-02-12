# CLAUDE.md

## Project Overview

**homebrew-den** is a Homebrew tap (`mrdemonwolf/den`) for distributing CLI tools and macOS apps. Formulae target pre-built binaries and casks target DMG installers, both hosted via GitHub Releases.

The project includes an auto-generated documentation site deployed to GitHub Pages.

## Repository Structure

```
homebrew-den/
├── Formula/             # Formula Ruby files (CLI tools)
├── Casks/               # Cask Ruby files (macOS apps, not yet created)
├── site/
│   ├── template.html    # Main page HTML template ({{PACKAGES_JSON}} placeholder)
│   ├── formula-template.html  # Per-formula detail page template
│   ├── input.css        # Tailwind CSS source (theme config + custom styles)
│   └── favicon.svg      # SVG favicon (brew cup icon)
├── package.json         # Node.js deps (tailwindcss, @tailwindcss/cli)
├── scripts/
│   └── build-site.sh    # Parses .rb files, builds _site/
├── .github/
│   └── workflows/
│       └── deploy-site.yml  # Build + deploy to GitHub Pages on push to main
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

The site is a single-page static site with per-formula detail pages. Styled with Tailwind CSS v4 (utility classes in HTML/JS + minimal custom CSS in `site/input.css` for theme variables, base resets, and table styles). A shell script parses `.rb` files, builds Tailwind, and generates everything.

### Key features
- Dark/light theme toggle (respects system preference, saves to localStorage)
- Cmd+K / Ctrl+K search palette with keyboard navigation
- Per-formula pages at `/formulae/<name>/` with sticky sidebar navigation (desktop) and horizontal scrollable strip (mobile)
- Active section tracking via IntersectionObserver on formula pages
- Stability badges: detects alpha (0.x.x), beta, RC, pre-release (from GitHub Releases API and version suffixes)
- Version history table on formula pages (pulled from GitHub Releases API)
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
3. Generates `_site/index.html` and `_site/formulae/<name>/index.html`
4. Builds Tailwind CSS (`site/input.css` → `site/output.css`)
5. Copies CSS and favicon to `_site/`

Supports `GITHUB_TOKEN` env var for authenticated API requests in CI.

## Useful Commands

```sh
brew tap mrdemonwolf/den             # Add the tap
brew install <formula>               # Install a formula
brew install --cask <name>           # Install a cask
brew untap mrdemonwolf/den           # Remove the tap
brew install --cask Casks/<name>.rb  # Test a cask locally
npm install                          # Install Node.js dependencies
bash scripts/build-site.sh          # Build the documentation site
```
