class ObsBackup < Formula
  desc "Back up macOS OBS scenes and profiles to Google Drive"
  homepage "https://github.com/MrDemonWolf/obs-setup"
  url "https://github.com/MrDemonWolf/obs-setup/archive/refs/tags/v0.1.2.tar.gz"
  sha256 "64325a4f04ffac852305de1b3a2ace3909f848edc6a6c9a96a95a0be97a5beeb"
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
