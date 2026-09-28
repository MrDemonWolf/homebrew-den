class ObsBackup < Formula
  desc "Back up macOS OBS scenes and profiles to Google Drive"
  homepage "https://github.com/MrDemonWolf/obs-setup"
  version "0.1.0"
  url "https://github.com/MrDemonWolf/obs-setup/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "577b0ed4e9a78a7063c8b3ef6c6b9fc710f144e891a999952fc47b561956b068"
  license "MIT"

  depends_on "python"

  def install
    libexec.install "scripts/backup.sh" => "backup.sh"
    libexec.install "scripts/sanitize.py" => "sanitize.py"
    bin.install_symlink libexec/"backup.sh" => "obs-backup"
  end

  def caveats
    <<~EOS
      Clone the config repo, then run setup once:
        git clone https://github.com/MrDemonWolf/obs-setup.git ~/Developer/mrdemonwolf/obs-setup
        obs-backup setup

      Back up anytime with:
        obs-backup
    EOS
  end

  test do
    assert_predicate libexec/"backup.sh", :exist?
    assert_predicate libexec/"sanitize.py", :exist?
  end
end
