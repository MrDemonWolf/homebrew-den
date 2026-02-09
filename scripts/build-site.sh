#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/_site"
TEMPLATE="$REPO_ROOT/site/template.html"
CSS_SRC="$REPO_ROOT/site/styles.css"

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"

# --- Parse Formula/*.rb files ---
formulae_json="["
first=true

for rb in "$REPO_ROOT"/Formula/*.rb; do
  [ -f "$rb" ] || continue

  # Formula name is the filename without .rb extension
  name=$(basename "$rb" .rb)
  desc=$(grep -m1 '^\s*desc ' "$rb" | sed 's/.*desc "\(.*\)"/\1/')
  homepage=$(grep -m1 '^\s*homepage ' "$rb" | sed 's/.*homepage "\(.*\)"/\1/')
  version=$(grep -m1 '^\s*version ' "$rb" | sed 's/.*version "\(.*\)"/\1/')
  license=$(grep -m1 '^\s*license ' "$rb" | sed 's/.*license "\(.*\)"/\1/')

  [ -z "$name" ] && continue

  $first || formulae_json+=","
  first=false

  # Escape JSON strings
  formulae_json+=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s"}' \
    "$name" "$version" "$desc" "$homepage" "$license")
done

formulae_json+="]"

# --- Parse Casks/*.rb files ---
casks_json="["
first=true

for rb in "$REPO_ROOT"/Casks/*.rb; do
  [ -f "$rb" ] || continue

  name=$(grep -m1 '^\s*cask ' "$rb" | sed 's/.*cask "\(.*\)".*/\1/')
  version=$(grep -m1 '^\s*version ' "$rb" | sed 's/.*version "\(.*\)"/\1/')
  desc=$(grep -m1 '^\s*desc ' "$rb" | sed 's/.*desc "\(.*\)"/\1/')
  homepage=$(grep -m1 '^\s*homepage ' "$rb" | sed 's/.*homepage "\(.*\)"/\1/')
  app_name=$(grep -m1 '^\s*name ' "$rb" | sed 's/.*name "\(.*\)"/\1/')

  [ -z "$name" ] && continue

  $first || casks_json+=","
  first=false

  casks_json+=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","appName":"%s"}' \
    "$name" "$version" "$desc" "$homepage" "$app_name")
done

casks_json+="]"

# --- Combine JSON ---
packages_json=$(printf '{"formulae":%s,"casks":%s}' "$formulae_json" "$casks_json")

# --- Build index.html ---
sed "s|{{PACKAGES_JSON}}|$packages_json|g" "$TEMPLATE" > "$SITE_DIR/index.html"

# --- Copy CSS ---
cp "$CSS_SRC" "$SITE_DIR/styles.css"

echo "Site built successfully in $SITE_DIR"
echo "Formulae: $(echo "$formulae_json" | grep -o '"name"' | wc -l | tr -d ' ')"
echo "Casks: $(echo "$casks_json" | grep -o '"name"' | wc -l | tr -d ' ')"
