cask "wolfwave" do
  version "1.2.0"
  sha256 "90081458726d92441e527a12bf9716f79d0fef061d1fd651c5d176475bc04e63"

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
