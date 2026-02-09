class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.0.4"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.4/iconwolf-macos-arm64.tar.gz"
      sha256 "a64973753318df740e64f334c4f7ce89c149ce1afe98a04050b3739cc80eea50"
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
        -o, --output <dir>     Output directory (default: ./assets/images/)
        --android              Generate Android adaptive icon variants only
        --favicon              Generate web favicon only
        --splash               Generate splash screen icon only
        --icon                 Generate standard icon.png only
        --bg-color <hex>       Background color for Android adaptive icon (default: #FFFFFF)
        -h, --help             Display help
        -V, --version          Display version

      Examples:
        iconwolf AppIcon.icon                              # Generate all variants from .icon
        iconwolf AppIcon.icon --android                    # Android icons only
        iconwolf app-icon.png -o ./assets/icons            # Custom output directory
        iconwolf AppIcon.icon --bg-color "#1A1A2E"         # Custom Android bg color

      Output files are your project assets and are NOT managed by Homebrew.
      To uninstall: brew uninstall iconwolf
    EOS
  end

  test do
    assert_match "0.0.4", shell_output("#{bin}/iconwolf --version")
  end
end
