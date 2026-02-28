class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.3.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.3.0/iconwolf-macos-arm64.tar.gz"
      sha256 "e1496a7e38cb7d000a2341b68cfdb9f52a834848eb103b01dbe5e5288db1b742"
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

      By default, generates 4 files to ./assets/images/:
        icon.png, adaptive-icon.png, splash-icon.png, favicon.png

      Common flags:
        --splash-input <path>  Use a separate image for the splash screen
        --android              All Android adaptive icons (adds background + monochrome)
        --favicon              Favicon only
        --icon                 Standard icon.png only
        --splash               Splash screen icon only
        -o, --output <dir>     Custom output directory
        --bg-color <hex>       Android background color (default: #FFFFFF)
        --dark-bg-color <hex>  Dark mode background for .icon folder output

      Generate .icon folders:
        iconwolf input.png -o AppIcon.icon --bg-color "#091533"
        iconwolf input.png -o AppIcon.icon --bg-color "#091533" --dark-bg-color "#1E3A5F"

      Full docs: https://github.com/MrDemonWolf/iconwolf
    EOS
  end

  test do
    assert_match "0.3.0", shell_output("#{bin}/iconwolf --version")
  end
end
