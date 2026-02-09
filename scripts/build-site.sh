#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/_site"
TEMPLATE="$REPO_ROOT/site/template.html"
FORMULA_TEMPLATE="$REPO_ROOT/site/formula-template.html"
CSS_SRC="$REPO_ROOT/site/styles.css"

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"

# --- Helper: extract caveats from .rb file ---
extract_caveats() {
  local rb="$1"
  local in_caveats=false
  local caveats=""
  while IFS= read -r line; do
    if $in_caveats; then
      if echo "$line" | grep -q '^\s*EOS$'; then
        break
      fi
      # Strip leading whitespace (6 spaces from heredoc indent)
      local cleaned
      cleaned=$(echo "$line" | sed 's/^      //')
      if [ -n "$caveats" ]; then
        caveats="$caveats\n$cleaned"
      else
        caveats="$cleaned"
      fi
    fi
    if echo "$line" | grep -q '<<~EOS'; then
      in_caveats=true
    fi
  done < "$rb"
  echo "$caveats"
}

# --- Helper: JSON-escape a string ---
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  echo "$s"
}

# --- Parse Formula/*.rb files ---
formulae_json="["
first=true
declare -a formula_names=()
declare -a formula_versions=()
declare -a formula_descs=()
declare -a formula_homepages=()
declare -a formula_licenses=()
declare -a formula_caveats=()

for rb in "$REPO_ROOT"/Formula/*.rb; do
  [ -f "$rb" ] || continue

  name=$(basename "$rb" .rb)
  desc=$(grep -m1 '^\s*desc ' "$rb" | sed 's/.*desc "\(.*\)"/\1/')
  homepage=$(grep -m1 '^\s*homepage ' "$rb" | sed 's/.*homepage "\(.*\)"/\1/')
  version=$(grep -m1 '^\s*version ' "$rb" | sed 's/.*version "\(.*\)"/\1/')
  license=$(grep -m1 '^\s*license ' "$rb" | sed 's/.*license "\(.*\)"/\1/')
  caveats=$(extract_caveats "$rb")

  [ -z "$name" ] && continue

  formula_names+=("$name")
  formula_versions+=("$version")
  formula_descs+=("$desc")
  formula_homepages+=("$homepage")
  formula_licenses+=("$license")
  formula_caveats+=("$caveats")

  $first || formulae_json+=","
  first=false

  escaped_caveats=$(json_escape "$caveats")
  formulae_json+=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s","caveats":"%s"}' \
    "$name" "$version" "$desc" "$homepage" "$license" "$escaped_caveats")
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

# --- Build individual formula pages ---
for i in "${!formula_names[@]}"; do
  fname="${formula_names[$i]}"
  mkdir -p "$SITE_DIR/formulae/$fname"

  escaped_caveats=$(json_escape "${formula_caveats[$i]}")
  formula_json=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s","caveats":"%s"}' \
    "$fname" "${formula_versions[$i]}" "${formula_descs[$i]}" "${formula_homepages[$i]}" "${formula_licenses[$i]}" "$escaped_caveats")

  sed -e "s|{{FORMULA_JSON}}|$formula_json|g" \
      -e "s|{{FORMULA_NAME}}|$fname|g" \
      -e "s|{{PACKAGES_JSON}}|$packages_json|g" \
      "$FORMULA_TEMPLATE" > "$SITE_DIR/formulae/$fname/index.html"
done

# --- Copy static assets ---
cp "$CSS_SRC" "$SITE_DIR/styles.css"
cp "$REPO_ROOT/site/favicon.svg" "$SITE_DIR/favicon.svg"

echo "Site built successfully in $SITE_DIR"
echo "Formulae: ${#formula_names[@]}"
echo "Casks: $(echo "$casks_json" | grep -o '"name"' | wc -l | tr -d ' ')"
