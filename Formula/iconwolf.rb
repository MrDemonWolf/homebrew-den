class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.0.7"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.7/iconwolf-macos-arm64.tar.gz"
      sha256 "8d5cdc89369387f317cecb040606e7176e93a52d089b05a97400787fcfe767b7"
    end
  end

  depends_on "node"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/iconwolf"
  end

  def caveats
    <<~EOS
      Quick start:
        iconwolf AppIcon.icon            # From Apple Icon Composer
        iconwolf app-icon.png            # From any square PNG

      By default, generates 5 files to ./assets/images/:
        icon.png, splash-icon.png, and android-icon-{foreground,background,monochrome}.png

      Common flags:
        --favicon              Add a 48x48 rounded web favicon (opt-in)
        --android              Android adaptive icons only
        --icon                 Standard icon.png only
        --splash               Splash screen icon only
        -o, --output <dir>     Custom output directory
        --bg-color <hex>       Android background color (default: #FFFFFF)

      Full docs: https://github.com/MrDemonWolf/iconwolf
    EOS
  end

  test do
    assert_match "0.0.7", shell_output("#{bin}/iconwolf --version")
  end
end
