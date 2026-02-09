class Iconwolf < Formula
  desc "Cross-platform app icon generator for Expo/React Native projects"
  homepage "https://github.com/MrDemonWolf/iconwolf"
  url "https://github.com/MrDemonWolf/iconwolf/archive/refs/tags/v0.0.2.tar.gz"
  sha256 "0d85efbc04206f5a0462d12f07bfe8400b78a963287bf3327c8198b8fcf20368"
  license "MIT"

  depends_on "node"

  def install
    # Install all deps (including devDeps for TypeScript compilation)
    system "npm", "install"
    # Compile TypeScript to dist/
    system "npm", "run", "build"
    # Prune devDependencies before packaging
    system "npm", "prune", "--omit=dev"

    libexec.install "dist", "node_modules", "package.json"
    (bin/"iconwolf").write_env_script libexec/"dist/index.js",
                                     PATH: "#{Formula["node"].opt_bin}:$PATH"
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
    assert_match "0.0.2", shell_output("#{bin}/iconwolf --version")
  end
end
