cask "wolfwave" do
  version "1.1.0"
  sha256 "90ce49a591ef0251456d9ec6f8de8f78e44263919fb4ab5fef0cc582cc5e1447"

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
