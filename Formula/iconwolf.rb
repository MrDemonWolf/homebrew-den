class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.0.6"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.6/iconwolf-macos-arm64.tar.gz"
      sha256 "0454adfe6cc8c57ee113a1d8f5998e2dfb6b1a75847aacee9eb532503adb52b9"
    end
  end

  depends_on "node"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/iconwolf"
  end

  def caveats
    <<~EOS
      Usage:
        iconwolf <input> [options]

      Input:
        Path to an Apple Icon Composer .icon folder or a source PNG.
        .icon folders are the primary input format (from Apple's Icon Composer app).

      Options:
        -o, --output <dir>     Output directory (auto-detects src/ projects)
        --android              Generate Android adaptive icon variants only
        --favicon              Generate web favicon with rounded corners (opt-in)
        --splash               Generate splash screen icon only
        --icon                 Generate standard icon.png only
        --bg-color <hex>       Background color for Android adaptive icon (default: #FFFFFF)
        -h, --help             Display help
        -V, --version          Display version

      Default output (5 files): icon.png, android-icon-{foreground,background,monochrome}.png, splash-icon.png
      Favicon is opt-in only (use --favicon to include it).

      Examples:
        iconwolf AppIcon.icon                              # Generate 5 default variants
        iconwolf AppIcon.icon --favicon                    # Include rounded favicon
        iconwolf AppIcon.icon --android                    # Android icons only
        iconwolf app-icon.png -o ./assets/icons            # Custom output directory
        iconwolf AppIcon.icon --bg-color "#1A1A2E"         # Custom Android bg color

      Output files are your project assets and are NOT managed by Homebrew.
      To uninstall: brew uninstall iconwolf
    EOS
  end

  test do
    assert_match "0.0.6", shell_output("#{bin}/iconwolf --version")
  end
end
