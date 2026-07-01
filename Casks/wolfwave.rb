cask "wolfwave" do
  version "2.0.0"
  sha256 "1141cc41194444cfca020dfde34e00ca9fcb1f1023287896b60e27d2fc9d540e"

  url "https://github.com/MrDemonWolf/wolfwave/releases/download/v#{version}/WolfWave-#{version}.dmg"
  name "WolfWave"
  desc "macOS menu bar app that bridges Apple Music with Twitch, Discord, and stream overlays"
  homepage "https://mrdemonwolf.github.io/wolfwave"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :tahoe"

  app "WolfWave.app"

  zap trash: [
    "~/Library/Preferences/com.mrdemonwolf.wolfwave.plist",
    "~/Library/Caches/com.mrdemonwolf.wolfwave",
    "~/Library/Logs/com.mrdemonwolf.wolfwave",
  ]
end
