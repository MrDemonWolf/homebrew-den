#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/_site"
SITE_SRC="$REPO_ROOT/site"
PARTIALS="$SITE_SRC/partials"
TEMPLATE="$SITE_SRC/template.html"
FORMULA_TEMPLATE="$SITE_SRC/formula-template.html"
CASK_TEMPLATE="$SITE_SRC/cask-template.html"
CSS_INPUT="$SITE_SRC/input.css"
CSS_OUTPUT="$SITE_SRC/output.css"

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"

# --- Shared partials (spliced into every page via render_template) ---
NAV_HTML="$(cat "$PARTIALS/nav.html")"
SEARCH_MODAL_HTML="$(cat "$PARTIALS/search-modal.html")"
FOOTER_HTML="$(cat "$PARTIALS/footer.html")"

COPY_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'

# --- Helper: extract the first quoted value of a field from a .rb file ---
extract_field() {
  local rb="$1" field="$2"
  grep -m1 "^\s*$field " "$rb" | sed "s/.*$field \"\([^\"]*\)\".*/\1/"
}

# --- Helper: extract caveats heredoc from a .rb file ---
extract_caveats() {
  local rb="$1"
  local in_caveats=false
  local caveats=""
  while IFS= read -r line; do
    if $in_caveats; then
      if echo "$line" | grep -q '^\s*EOS$'; then
        break
      fi
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

# --- Helper: JSON-escape a string (also neutralizes </script> breakout) ---
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//</\\u003c}"
  s="${s//>/\\u003e}"
  s="${s//$'\r'/}"
  s="${s//$'\n'/\\n}"
  printf '%s' "$s"
}

# --- Helper: HTML-escape a string for safe interpolation into markup ---
html_escape() {
  local s="$1"
  s="${s//&/&amp;}"
  s="${s//</&lt;}"
  s="${s//>/&gt;}"
  s="${s//\"/&quot;}"
  s="${s//\'/&#39;}"
  printf '%s' "$s"
}

# --- Helper: derive "owner/repo" from any GitHub URL ---
github_repo() {
  local url="$1"
  case "$url" in
    *github.com/*)
      url="${url#*github.com/}"
      printf '%s' "$url" | cut -d/ -f1-2
      ;;
  esac
}

# --- Helper: fetch releases for a repo; prints "is_prerelease\nversions_json" ---
fetch_releases() {
  local repo="$1" version="$2" releases
  if ! releases=$(curl -sf \
    ${GITHUB_TOKEN:+-H "Authorization: token $GITHUB_TOKEN"} \
    "https://api.github.com/repos/$repo/releases?per_page=100" 2>/dev/null); then
    echo "  !! warning: could not fetch releases for $repo (API error or rate limit)" >&2
    releases="[]"
  fi
  python3 -c '
import json, sys
target = sys.argv[1]
try:
    releases = json.loads(sys.stdin.read())
    if not isinstance(releases, list):
        releases = []
    is_pre = "false"
    for r in releases:
        if r.get("tag_name") == "v" + target and r.get("prerelease"):
            is_pre = "true"
            break
    versions = []
    for r in releases:
        tag = r.get("tag_name", "") or ""
        versions.append({
            "version": tag[1:] if tag.startswith("v") else tag,
            "tag": tag,
            "date": (r.get("published_at") or "")[:10],
            "prerelease": bool(r.get("prerelease", False)),
            "url": r.get("html_url", "") or "",
        })
    print(is_pre)
    print(json.dumps(versions))
except Exception:
    print("false")
    print("[]")
' "$version" <<< "$releases" 2>/dev/null || printf 'false\n[]\n'
}

# --- Helper: derive a stability label from a version + prerelease flag ---
detect_stability() {
  local version="$1" is_pre="$2" stability="stable"
  [ "$is_pre" = "true" ] && stability="pre-release"
  case "$version" in
    0.*) [ "$stability" = "stable" ] && stability="alpha" ;;
  esac
  if printf '%s' "$version" | grep -qiE '[-](alpha|beta|rc|dev|canary|nightly|preview)'; then
    case "$version" in
      *[Aa]lpha*) stability="alpha" ;;
      *[Bb]eta*)  stability="beta" ;;
      *[Rr][Cc]*) stability="rc" ;;
      *)          stability="pre-release" ;;
    esac
  fi
  printf '%s' "$stability"
}

# --- Helper: render a stability badge (empty for stable/unknown) ---
badge_html() {
  local base color label
  base='inline-block font-sans text-[0.7rem] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-xl whitespace-nowrap align-middle'
  case "$1" in
    alpha)       color='bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'; label='Alpha' ;;
    beta)        color='bg-[rgba(168,85,247,0.15)] text-[#a855f7]'; label='Beta' ;;
    rc)          color='bg-[rgba(59,130,246,0.15)] text-[#3b82f6]'; label='RC' ;;
    pre-release) color='bg-[rgba(249,115,22,0.15)] text-[#f97316]'; label='Pre-release' ;;
    *) return ;;
  esac
  printf ' <span class="%s %s">%s</span>' "$base" "$color" "$label"
}

# --- Helper: build a package table row of static HTML ---
package_row() {
  local name="$1" version="$2" desc="$3" stability="$4" href="$5" install="$6"
  local name_e version_e desc_e install_e badge
  name_e=$(html_escape "$name")
  version_e=$(html_escape "$version")
  desc_e=$(html_escape "$desc")
  install_e=$(html_escape "$install")
  badge=$(badge_html "$stability")
  cat <<ROW
        <tr>
          <td data-label="Name"><a href="$href" class="font-semibold text-accent">$name_e</a></td>
          <td data-label="Version"><span class="font-mono text-[0.8rem] bg-accent-subtle text-accent px-2 py-0.5 rounded-xl whitespace-nowrap">v$version_e</span>$badge</td>
          <td data-label="Description">$desc_e</td>
          <td data-label="Install"><span class="font-mono text-[0.85rem] text-[var(--text-muted)] inline-flex items-center gap-2"><code>$install_e</code><button type="button" class="copy-sm inline-flex items-center justify-center w-6 h-6 border-none rounded-sm bg-transparent text-[var(--text-muted)] cursor-pointer transition-all duration-200 ease-in-out hover:text-accent hover:bg-accent-subtle" data-copy="$install_e" aria-label="Copy install command">$COPY_ICON</button></span></td>
        </tr>
ROW
}

empty_row() {
  printf '        <tr><td colspan="4" class="text-center text-[var(--text-muted)] py-8">%s</td></tr>\n' "$1"
}

# --- Render a template file, substituting {{KEY}} placeholders ---
# Usage: render_template <template> KEY1 VALUE1 KEY2 VALUE2 ...
# Two passes resolve placeholders that appear inside spliced partials.
render_template() {
  local template="$1"; shift
  local content pass idx key val token
  content="$(cat "$template")"
  local args=("$@")
  for pass in 1 2; do
    idx=0
    while [ "$idx" -lt "${#args[@]}" ]; do
      key="${args[$idx]}"
      val="${args[$((idx + 1))]}"
      token="{{$key}}"
      while [[ "$content" == *"$token"* ]]; do
        content="${content%%"$token"*}${val}${content#*"$token"}"
      done
      idx=$((idx + 2))
    done
  done
  printf '%s\n' "$content"
}

# =====================================================================
# Parse Formula/*.rb
# =====================================================================
formulae_json="["
formulae_rows=""
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
  desc=$(extract_field "$rb" "desc")
  homepage=$(extract_field "$rb" "homepage")
  version=$(extract_field "$rb" "version")
  license=$(extract_field "$rb" "license")
  caveats=$(extract_caveats "$rb")

  [ -z "$name" ] && continue

  is_prerelease="false"
  versions_json="[]"
  repo=$(github_repo "$homepage")
  if [ -n "$repo" ]; then
    parsed=$(fetch_releases "$repo" "$version")
    is_prerelease=$(printf '%s\n' "$parsed" | head -1)
    versions_json=$(printf '%s\n' "$parsed" | tail -n +2)
  fi
  stability=$(detect_stability "$version" "$is_prerelease")
  echo "  -> $name v$version stability: $stability"

  formula_names+=("$name")
  formula_versions+=("$version")
  formula_descs+=("$desc")
  formula_homepages+=("$homepage")
  formula_licenses+=("$license")
  formula_caveats+=("$caveats")
  formula_stabilities+=("$stability")
  formula_releases_json+=("$versions_json")

  $first || formulae_json+=","
  first=false
  formulae_json+=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s","caveats":"%s","stability":"%s"}' \
    "$(json_escape "$name")" "$(json_escape "$version")" "$(json_escape "$desc")" \
    "$(json_escape "$homepage")" "$(json_escape "$license")" "$(json_escape "$caveats")" \
    "$(json_escape "$stability")")

  formulae_rows+=$(package_row "$name" "$version" "$desc" "$stability" "formulae/$name/" "brew install $name")
  formulae_rows+=$'\n'
done
formulae_json+="]"
[ -n "$formulae_rows" ] || formulae_rows=$(empty_row "No formulae available yet.")

# =====================================================================
# Parse Casks/*.rb
# =====================================================================
casks_json="["
casks_rows=""
first=true
declare -a cask_names=()
declare -a cask_versions=()
declare -a cask_descs=()
declare -a cask_homepages=()
declare -a cask_appnames=()
declare -a cask_stabilities=()
declare -a cask_releases_json=()
declare -a cask_caveats_arr=()

for rb in "$REPO_ROOT"/Casks/*.rb; do
  [ -f "$rb" ] || continue

  name=$(extract_field "$rb" "cask")
  version=$(extract_field "$rb" "version")
  desc=$(extract_field "$rb" "desc")
  homepage=$(extract_field "$rb" "homepage")
  app_name=$(extract_field "$rb" "name")
  url=$(extract_field "$rb" "url")
  caveats=$(extract_caveats "$rb")

  [ -z "$name" ] && continue

  is_prerelease="false"
  versions_json="[]"
  repo=$(github_repo "$url")
  [ -n "$repo" ] || repo=$(github_repo "$homepage")
  if [ -n "$repo" ]; then
    parsed=$(fetch_releases "$repo" "$version")
    is_prerelease=$(printf '%s\n' "$parsed" | head -1)
    versions_json=$(printf '%s\n' "$parsed" | tail -n +2)
  fi
  stability=$(detect_stability "$version" "$is_prerelease")
  echo "  -> $name v$version stability: $stability (cask)"

  cask_names+=("$name")
  cask_versions+=("$version")
  cask_descs+=("$desc")
  cask_homepages+=("$homepage")
  cask_appnames+=("$app_name")
  cask_stabilities+=("$stability")
  cask_releases_json+=("$versions_json")
  cask_caveats_arr+=("$caveats")

  $first || casks_json+=","
  first=false
  casks_json+=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","appName":"%s","stability":"%s"}' \
    "$(json_escape "$name")" "$(json_escape "$version")" "$(json_escape "$desc")" \
    "$(json_escape "$homepage")" "$(json_escape "$app_name")" "$(json_escape "$stability")")

  casks_rows+=$(package_row "$name" "$version" "$desc" "$stability" "casks/$name/" "brew install --cask $name")
  casks_rows+=$'\n'
done
casks_json+="]"
[ -n "$casks_rows" ] || casks_rows=$(empty_row "No casks available yet.")

packages_json=$(printf '{"formulae":%s,"casks":%s}' "$formulae_json" "$casks_json")

# =====================================================================
# Build index.html
# =====================================================================
render_template "$TEMPLATE" \
  ROOT "" \
  NAV "$NAV_HTML" \
  SEARCH_MODAL "$SEARCH_MODAL_HTML" \
  FOOTER "$FOOTER_HTML" \
  PACKAGES_JSON "$packages_json" \
  FORMULAE_ROWS "$formulae_rows" \
  CASKS_ROWS "$casks_rows" \
  FORMULA_COUNT "${#formula_names[@]}" \
  CASK_COUNT "${#cask_names[@]}" \
  > "$SITE_DIR/index.html"

# =====================================================================
# Build individual formula pages
# =====================================================================
for i in "${!formula_names[@]}"; do
  fname="${formula_names[$i]}"
  mkdir -p "$SITE_DIR/formulae/$fname"

  formula_json=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","license":"%s","caveats":"%s","stability":"%s","versions":%s}' \
    "$(json_escape "$fname")" "$(json_escape "${formula_versions[$i]}")" \
    "$(json_escape "${formula_descs[$i]}")" "$(json_escape "${formula_homepages[$i]}")" \
    "$(json_escape "${formula_licenses[$i]}")" "$(json_escape "${formula_caveats[$i]}")" \
    "$(json_escape "${formula_stabilities[$i]}")" "${formula_releases_json[$i]:-[]}")

  render_template "$FORMULA_TEMPLATE" \
    ROOT "../../" \
    NAV "$NAV_HTML" \
    SEARCH_MODAL "$SEARCH_MODAL_HTML" \
    FOOTER "$FOOTER_HTML" \
    PACKAGES_JSON "$packages_json" \
    FORMULA_NAME "$fname" \
    FORMULA_JSON "$formula_json" \
    > "$SITE_DIR/formulae/$fname/index.html"
done

# =====================================================================
# Build individual cask pages
# =====================================================================
for i in "${!cask_names[@]}"; do
  cname="${cask_names[$i]}"
  mkdir -p "$SITE_DIR/casks/$cname"

  cask_json=$(printf '{"name":"%s","version":"%s","desc":"%s","homepage":"%s","appName":"%s","caveats":"%s","stability":"%s","versions":%s}' \
    "$(json_escape "$cname")" "$(json_escape "${cask_versions[$i]}")" \
    "$(json_escape "${cask_descs[$i]}")" "$(json_escape "${cask_homepages[$i]}")" \
    "$(json_escape "${cask_appnames[$i]}")" "$(json_escape "${cask_caveats_arr[$i]:-}")" \
    "$(json_escape "${cask_stabilities[$i]}")" "${cask_releases_json[$i]:-[]}")

  render_template "$CASK_TEMPLATE" \
    ROOT "../../" \
    NAV "$NAV_HTML" \
    SEARCH_MODAL "$SEARCH_MODAL_HTML" \
    FOOTER "$FOOTER_HTML" \
    PACKAGES_JSON "$packages_json" \
    CASK_NAME "$cname" \
    CASK_JSON "$cask_json" \
    > "$SITE_DIR/casks/$cname/index.html"
done

# =====================================================================
# Build Tailwind CSS + copy static assets
# =====================================================================
echo "Building Tailwind CSS..."
npx @tailwindcss/cli -i "$CSS_INPUT" -o "$CSS_OUTPUT" --minify

cp "$CSS_OUTPUT" "$SITE_DIR/output.css"
cp "$SITE_SRC/favicon.svg" "$SITE_DIR/favicon.svg"
cp "$SITE_SRC/shared.js" "$SITE_DIR/shared.js"

echo "Site built successfully in $SITE_DIR"
echo "Formulae: ${#formula_names[@]}"
echo "Casks: ${#cask_names[@]}"
