class ObsBackup < Formula
  desc "Back up macOS OBS scenes and profiles to Google Drive"
  homepage "https://github.com/MrDemonWolf/obs-setup"
  url "https://github.com/MrDemonWolf/obs-setup/archive/refs/tags/v0.1.1.tar.gz"
  sha256 "c98993501d876f2357671da27a9cf00780a545f59d8c648ac16a0ddc4616b166"
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
    assert_path_exists libexec/"backup.sh"
    assert_path_exists libexec/"sanitize.py"
  end
end
