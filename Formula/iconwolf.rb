class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  url "https://github.com/MrDemonWolf/iconwolf/archive/refs/tags/v0.0.1.tar.gz"
  sha256 "a86dd90a4ffff43209a9cf38f2b625002192ef715d84283f4b558d1d0526f66b"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  def caveats
    <<~EOS
      iconwolf generates icon files into a directory you specify (default: ./assets/images/).
      Those output files are your project assets and are NOT managed by Homebrew.

      To fully remove iconwolf:
        brew uninstall iconwolf

      This removes the CLI binary and all supporting files. No other cleanup needed.
    EOS
  end

  test do
    assert_match "0.0.1", shell_output("#{bin}/iconwolf --version")
  end
end
