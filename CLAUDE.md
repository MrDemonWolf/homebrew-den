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
│   ├── styles.css       # Dark/light theme CSS
│   └── favicon.svg      # SVG favicon (brew cup icon)
├── scripts/
│   └── build-site.sh    # Parses .rb files, fetches READMEs, builds _site/
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

The site is a single-page static site with per-formula detail pages. Zero dependencies — a shell script parses `.rb` files and builds everything.

### Key features
- Dark/light theme toggle (respects system preference, saves to localStorage)
- Cmd+K / Ctrl+K search palette with keyboard navigation
- Per-formula pages at `/formulae/<name>/` with README pulled from the formula's GitHub repo
- Stability badges: detects alpha (0.x.x), beta, RC, pre-release (from GitHub Releases API and version suffixes)
- Auto-deploys via GitHub Actions on push to main

### Build locally

```sh
bash scripts/build-site.sh
open _site/index.html
```

The build script:
1. Parses `Formula/*.rb` and `Casks/*.rb` for metadata (name, version, desc, homepage, license, caveats)
2. Fetches README HTML from each formula's GitHub repo via the API
3. Checks GitHub Releases API for pre-release flags + detects semver stability
4. Generates `_site/index.html` and `_site/formulae/<name>/index.html`
5. Copies CSS and favicon to `_site/`

Supports `GITHUB_TOKEN` env var for authenticated API requests in CI.

## Useful Commands

```sh
brew tap mrdemonwolf/den             # Add the tap
brew install <formula>               # Install a formula
brew install --cask <name>           # Install a cask
brew untap mrdemonwolf/den           # Remove the tap
brew install --cask Casks/<name>.rb  # Test a cask locally
bash scripts/build-site.sh          # Build the documentation site
```
