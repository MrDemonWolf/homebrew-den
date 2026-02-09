class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.0.2"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.2/iconwolf-macos-arm64.tar.gz"
      sha256 ""
    else
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.2/iconwolf-macos-x64.tar.gz"
      sha256 ""
    end
  end

  on_linux do
    url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.2/iconwolf-linux-x64.tar.gz"
    sha256 ""
  end

  def install
    bin.install "iconwolf"
  end

  def caveats
    <<~EOS
      iconwolf generates icon files into a directory you specify (default: ./assets/images/).
      Those output files are your project assets and are NOT managed by Homebrew.

      To fully remove iconwolf:
        brew uninstall iconwolf

      This removes the CLI binary. No other cleanup needed.
    EOS
  end

  test do
    assert_match "0.0.2", shell_output("#{bin}/iconwolf --version")
  end
end
