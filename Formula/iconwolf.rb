class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  version "0.0.3"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/MrDemonWolf/iconwolf/releases/download/v0.0.3/iconwolf-macos-arm64.tar.gz"
      sha256 "b97a215b4bff13c12b144bac3358c3d22f534b7116409361ffd793641da9d2fe"
    end
  end

  depends_on "node"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/iconwolf"
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
    assert_match "0.0.3", shell_output("#{bin}/iconwolf --version")
  end
end
