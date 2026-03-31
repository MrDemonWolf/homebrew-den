cask "wolfwave" do
  version "1.0.2"
  sha256 "665e0719a9aa12db30f6235acfeea4b32fdabd59314d3ab5af9a90ce9716133b"

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
