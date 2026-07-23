# Homebrew Den

A [Homebrew](https://brew.sh) tap for CLI tools and macOS apps by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

## Quick Start

```sh
brew tap mrdemonwolf/den
brew install <formula>          # CLI tools
brew install --cask <name>      # macOS apps
```

## Available Formulae

| Formula | Version | Stability | Description |
| ------- | ------- | --------- | ----------- |
| `iconwolf` | 0.4.0 | Alpha | Cross-platform app icon generator for Expo/React Native projects |

## Available Casks

| Cask | Description |
| ---- | ----------- |
| `wolfwave` | macOS menu bar app that bridges Apple Music with Twitch, Discord, and stream overlays |

## Documentation Site

Browse the full documentation at **[mrdemonwolf.github.io/homebrew-den](https://mrdemonwolf.github.io/homebrew-den/)**.

The site auto-rebuilds on every push to `main` and includes:

- Dark/light theme with system preference detection
- Cmd+K / Ctrl+K search palette for quick package lookup
- Per-formula and per-cask detail pages with install commands, metadata, caveats, and version history
- Stability badges (Alpha, Beta, RC, Pre-release) based on semver and GitHub Releases

To build locally:

```sh
npm install                # Install dependencies (first time only)
bash scripts/build-site.sh
open _site/index.html
```

The build needs **Node.js** (Tailwind CSS) and **Python 3** (parsing the GitHub
Releases API for version history). Useful environment knobs:

- `OFFLINE=1` — skip all network calls and build with empty version history
  (explicit local offline mode).
- `STRICT_RELEASES=1` — fail the build if the GitHub API is unreachable (set
  automatically when `CI=true`) so production never ships pages with version
  history silently dropped.
- `OUT_DIR=<dir>` — write the site somewhere other than `_site` (the test suite
  uses this to build into an isolated temp directory).

## Adding a New Formula

Create a file at `Formula/<name>.rb` pointing at a pre-built release binary:

```ruby
class <Name> < Formula
  desc "<Short description>"
  homepage "https://github.com/<owner>/<repo>"
  version "<version>"
  license "MIT"

  depends_on :macos
  depends_on arch: :arm64

  on_macos do
    on_arm do
      url "https://github.com/<owner>/<repo>/releases/download/v#{version}/<name>-macos-arm64.tar.gz"
      sha256 "<sha256>"
    end
  end

  def install
    bin.install "<name>"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/<name> --version")
  end
end
```

Test the formula locally before pushing:

```sh
brew install --build-from-source Formula/<name>.rb
```

## Adding a New Cask

Create a file at `Casks/<name>.rb` using this template:

```ruby
cask "<name>" do
  version "<version>"
  sha256 "<sha256>"

  url "https://github.com/<owner>/<repo>/releases/download/v#{version}/<name>-#{version}.dmg"
  name "<App Name>"
  desc "<Short description>"
  homepage "https://github.com/<owner>/<repo>"

  app "<App Name>.app"
end
```

Generate the SHA-256 checksum:

```sh
shasum -a 256 <name>-<version>.dmg
```

Test the cask locally before pushing:

```sh
brew install --cask Casks/<name>.rb
```

## Contributing

### Running Tests

Tests run automatically on every push and PR via CI. To run locally:

```sh
npm install
npm test
```

## License

[MIT](LICENSE) &mdash; &copy; 2026 [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)
