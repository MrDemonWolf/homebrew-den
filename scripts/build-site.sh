#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/_site"
TEMPLATE="$REPO_ROOT/site/template.html"
FORMULA_TEMPLATE="$REPO_ROOT/site/formula-template.html"
CSS_INPUT="$REPO_ROOT/site/input.css"
CSS_OUTPUT="$REPO_ROOT/site/output.css"

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
declare -a formula_stabilities=()
declare -a formula_releases_json=()

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

  # Determine stability + fetch all releases for version history
  stability="stable"
  versions_json="[]"
  if echo "$homepage" | grep -q 'github\.com/'; then
    repo_path_rel=$(echo "$homepage" | sed 's|https://github.com/||')

    # Fetch all releases (used for both stability check and version history)
    all_releases_json=$(curl -sf \
      ${GITHUB_TOKEN:+-H "Authorization: token $GITHUB_TOKEN"} \
      "https://api.github.com/repos/$repo_path_rel/releases?per_page=100" 2>/dev/null || echo "[]")

    # Parse releases with python3 for reliability
    parsed_releases=$(python3 -c "
import json, sys
target_version = sys.argv[1]
try:
    releases = json.loads(sys.stdin.read())
    if not isinstance(releases, list): releases = []
    is_pre = 'false'
    for r in releases:
        if r.get('tag_name') == 'v' + target_version and r.get('prerelease'):
            is_pre = 'true'
            break
    versions = []
    for r in releases:
        tag = r.get('tag_name', '')
        ver = tag.lstrip('v')
        versions.append({
            'version': ver,
            'tag': tag,
            'date': (r.get('published_at') or '')[:10],
            'prerelease': r.get('prerelease', False),
            'url': r.get('html_url', '')
        })
    print(is_pre)
    print(json.dumps(versions))
except:
    print('false')
    print('[]')
" "$version" <<< "$all_releases_json" 2>/dev/null || printf 'false\n[]\n')

    is_prerelease=$(echo "$parsed_releases" | head -1)
    versions_json=$(echo "$parsed_releases" | tail -n +2)

    if [ "$is_prerelease" = "true" ]; then
      stability="pre-release"
    fi
  fi
  # Semver: 0.x.x is alpha (overrides stable, but not an explicit pre-release flag)
  if echo "$version" | grep -q '^0\.'; then
    if [ "$stability" = "stable" ]; then
      stability="alpha"
    fi
  fi
  # Check for common pre-release version suffixes
  if echo "$version" | grep -qiE '[-](alpha|beta|rc|dev|canary|nightly|preview)'; then
    case "$version" in
      *[Aa]lpha*) stability="alpha" ;;
      *[Bb]eta*)  stability="beta" ;;
      *[Rr][Cc]*) stability="rc" ;;
      *)          stability="pre-release" ;;
    esac
  fi
  echo "  -> $name v$version stability: $stability (${versions_json:0:40}...)"
  formula_stabilities+=("$stability")
  formula_releases_json+=("$versions_json")

  $first || formulae_json+=","
  first=false

  escaped_caveats=$(json_escape "$caveats")
  formulae_json+=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s","caveats":"%s","stability":"%s"}' \
    "$name" "$version" "$desc" "$homepage" "$license" "$escaped_caveats" "$stability")
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

# --- Build index.html (use printf to avoid sed escape issues on GNU sed/Linux) ---
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    *'{{PACKAGES_JSON}}'*)
      printf '%s' "${line%%'{{PACKAGES_JSON}}'*}"
      printf '%s' "$packages_json"
      printf '%s\n' "${line#*'{{PACKAGES_JSON}}'}"
      ;;
    *)
      printf '%s\n' "$line"
      ;;
  esac
done < "$TEMPLATE" > "$SITE_DIR/index.html"

# --- Build individual formula pages ---
for i in "${!formula_names[@]}"; do
  fname="${formula_names[$i]}"
  mkdir -p "$SITE_DIR/formulae/$fname"

  escaped_caveats=$(json_escape "${formula_caveats[$i]}")
  versions_data="${formula_releases_json[$i]:-[]}"
  formula_json=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s","caveats":"%s","stability":"%s","versions":%s}' \
    "$fname" "${formula_versions[$i]}" "${formula_descs[$i]}" "${formula_homepages[$i]}" "${formula_licenses[$i]}" "$escaped_caveats" "${formula_stabilities[$i]}" "$versions_data")

  # Build the page using printf to avoid sed escape issues across platforms
  {
    while IFS= read -r line || [ -n "$line" ]; do
      # Replace formula name (safe, no special chars)
      line="${line//\{\{FORMULA_NAME\}\}/$fname}"

      case "$line" in
        *'{{FORMULA_JSON}}'*)
          printf '%s' "${line%%'{{FORMULA_JSON}}'*}"
          printf '%s' "$formula_json"
          printf '%s\n' "${line#*'{{FORMULA_JSON}}'}"
          ;;
        *'{{PACKAGES_JSON}}'*)
          printf '%s' "${line%%'{{PACKAGES_JSON}}'*}"
          printf '%s' "$packages_json"
          printf '%s\n' "${line#*'{{PACKAGES_JSON}}'}"
          ;;
        *)
          printf '%s\n' "$line"
          ;;
      esac
    done
  } < "$FORMULA_TEMPLATE" > "$SITE_DIR/formulae/$fname/index.html"
done

# --- Build Tailwind CSS ---
echo "Building Tailwind CSS..."
npx @tailwindcss/cli -i "$CSS_INPUT" -o "$CSS_OUTPUT" --minify

# --- Copy static assets ---
cp "$CSS_OUTPUT" "$SITE_DIR/output.css"
cp "$REPO_ROOT/site/favicon.svg" "$SITE_DIR/favicon.svg"

echo "Site built successfully in $SITE_DIR"
echo "Formulae: ${#formula_names[@]}"
echo "Casks: $(echo "$casks_json" | grep -o '"name"' | wc -l | tr -d ' ')"
