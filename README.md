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
| `iconwolf` | 0.0.2 | Alpha | Cross-platform app icon generator for Expo/React Native projects |

## Available Casks

| Cask | Description |
| ---- | ----------- |
| _none yet_ | Casks will be listed here as they are added |

## Documentation Site

Browse the full documentation at **[mrdemonwolf.github.io/homebrew-den](https://mrdemonwolf.github.io/homebrew-den/)**.

The site auto-rebuilds on every push to `main` and includes:

- Dark/light theme with system preference detection
- Cmd+K / Ctrl+K search palette for quick package lookup
- Per-formula detail pages with install commands, metadata, and README from the source repo
- Stability badges (Alpha, Beta, RC, Pre-release) based on semver and GitHub Releases

To build locally:

```sh
bash scripts/build-site.sh
open _site/index.html
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

## License

[MIT](LICENSE) &mdash; &copy; 2026 [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)
