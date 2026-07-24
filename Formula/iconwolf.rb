class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.4.0"
  license "MIT"

  depends_on :macos
  depends_on arch: :arm64
  depends_on "node"

  on_macos do
    on_arm do
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v#{version}/iconwolf-macos-arm64.tar.gz"
      sha256 "3d2fc96dcb820723caf70c6e9f8a1a37145a120eb66701d7961507f52e6f4c8b"
    end
  end

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
    assert_match version.to_s, shell_output("#{bin}/iconwolf --version")
  end
end
