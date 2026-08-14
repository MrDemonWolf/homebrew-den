cask "wolfwave" do
  version "2.1.0"
  sha256 "d833069e850c3fa95ef85460db680300bcf757fe6988b60c8e1ff2617c80123b"

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
