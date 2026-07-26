cask "wolfwave" do
  version "2.0.1"
  sha256 "b52a547344fb407d0efbf4aa51afa0d7daa68750ea0a57d26be54ccf4ee85c5d"

  url "https://github.com/MrDemonWolf/wolfwave/releases/download/v#{version}/WolfWave-#{version}.dmg",
      verified: "github.com/MrDemonWolf/wolfwave/"
  name "WolfWave"
  desc "Menu bar app bridging Apple Music with Twitch, Discord, and stream overlays"
  homepage "https://mrdemonwolf.github.io/wolfwave"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :tahoe

  app "WolfWave.app"

  zap trash: [
    "~/Library/Caches/com.mrdemonwolf.wolfwave",
    "~/Library/Logs/com.mrdemonwolf.wolfwave",
    "~/Library/Preferences/com.mrdemonwolf.wolfwave.plist",
  ]
end
