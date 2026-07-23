#!/usr/bin/env bash
set -euo pipefail

# Verify that each formula/cask's declared sha256 matches the actual downloadable
# release artifact — not merely that a sha256 field is present. Run in CI.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
status=0

field() {
  grep -m1 -E "^[[:space:]]*$2 " "$1" | sed "s/.*$2 \"\([^\"]*\)\".*/\1/"
}

check() {
  local rb="$1" version url sha256 expanded actual
  version=$(field "$rb" version)
  url=$(field "$rb" url)
  sha256=$(field "$rb" sha256)
  if [ -z "$url" ] || [ -z "$sha256" ]; then
    echo "-- skip $(basename "$rb") (no url/sha256)"
    return
  fi
  expanded="${url//"#{version}"/$version}"
  echo "-> $(basename "$rb")  $expanded"
  actual=$(curl -fsSL --connect-timeout 15 --max-time 180 --retry 3 --retry-delay 3 "$expanded" \
    | shasum -a 256 | awk '{print $1}')
  if [ "$actual" = "$sha256" ]; then
    echo "   OK   $actual"
  else
    echo "   FAIL expected=$sha256 actual=$actual"
    status=1
  fi
}

shopt -s nullglob
for rb in "$ROOT"/Formula/*.rb "$ROOT"/Casks/*.rb; do
  [ -f "$rb" ] || continue
  check "$rb"
done

exit "$status"
