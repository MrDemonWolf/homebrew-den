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
      Run `iconwolf --help` for usage information and examples.

      Output files are your project assets and are NOT managed by Homebrew.
    EOS
  end

  test do
    assert_match "0.0.6", shell_output("#{bin}/iconwolf --version")
  end
end
