# Homebrew Den

A [Homebrew](https://brew.sh) tap for macOS apps distributed as DMGs via GitHub Releases.

## Usage

```sh
brew tap mrdemonwolf/den
brew install --cask <name>
```

To remove the tap:

```sh
brew untap mrdemonwolf/den
```

## Available Casks

| Cask | Description |
| ---- | ----------- |
| _none yet_ | Casks will be listed here as they are added |

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

[MIT](LICENSE)
