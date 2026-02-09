# CLAUDE.md

## Project Overview

**homebrew-den** is a Homebrew tap (`mrdemonwolf/den`) for distributing macOS apps as casks. Apps are packaged as DMGs and hosted via GitHub Releases.

## Repository Structure

```
homebrew-den/
├── Casks/          # Cask Ruby files go here (not yet created)
├── LICENSE          # MIT — Copyright (c) 2026 MrDemonWolf, Inc.
├── README.md        # Tap usage, available casks table, contributor guide
└── CLAUDE.md        # This file
```

## Conventions

- Cask files live in `Casks/<name>.rb` and follow the standard Homebrew cask DSL.
- Casks target DMG installers from GitHub Releases.
- SHA-256 checksums are generated with `shasum -a 256`.
- The available casks table in README.md should be updated whenever a cask is added or removed.

## Useful Commands

```sh
brew tap mrdemonwolf/den          # Add the tap
brew install --cask <name>        # Install a cask
brew untap mrdemonwolf/den        # Remove the tap
brew install --cask Casks/<name>.rb  # Test a cask locally
```
