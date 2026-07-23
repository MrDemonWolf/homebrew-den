#!/usr/bin/env bash
set -euo pipefail

# Requires: bash, curl, python3 (release-history parsing), node/npx (Tailwind).
# The @tailwindcss/cli dep is expected in node_modules (npm ci); npx runs with
# --no-install so the build never silently downloads a package.
#
# Environment knobs:
#   OUT_DIR           output directory (default: <repo>/_site). Tests point this
#                     at an isolated temp dir so they never touch a user's _site.
#   GITHUB_TOKEN      optional token for authenticated GitHub API requests.
#   OFFLINE=1         skip all network calls; build with empty version history
#                     (explicit local offline mode).
#   STRICT_RELEASES=1 fail the build if the GitHub API cannot be reached (set
#                     automatically when CI=true) so production never publishes
#                     pages with version history silently removed.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${OUT_DIR:-$REPO_ROOT/_site}"
SITE_SRC="$REPO_ROOT/site"
PARTIALS="$SITE_SRC/partials"
TEMPLATE="$SITE_SRC/template.html"
DETAIL_TEMPLATE="$SITE_SRC/detail-template.html"
CSS_INPUT="$SITE_SRC/input.css"
CSS_OUTPUT="$SITE_SRC/output.css"

# Fail the build on a fetch error in CI (or when explicitly requested).
if [ "${CI:-}" = "true" ]; then
  STRICT_RELEASES="${STRICT_RELEASES:-1}"
fi

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
  grep -m1 "^[[:space:]]*$field " "$rb" | sed "s/.*$field \"\([^\"]*\)\".*/\1/"
}

# --- Helper: extract caveats heredoc from a .rb file ---
extract_caveats() {
  local rb="$1"
  local in_caveats=false
  local caveats=""
  while IFS= read -r line; do
    if $in_caveats; then
      if printf '%s' "$line" | grep -q '^[[:space:]]*EOS$'; then
        break
      fi
      local cleaned
      cleaned=$(printf '%s' "$line" | sed 's/^      //')
      if [ -n "$caveats" ]; then
        caveats="$caveats\n$cleaned"
      else
        caveats="$cleaned"
      fi
    fi
    if printf '%s' "$line" | grep -q '<<~EOS'; then
      in_caveats=true
    fi
  done < "$rb"
  printf '%s' "$caveats"
}

# --- Helper: JSON-escape a string for safe embedding inside a <script> block ---
# Neutralizes </script> breakout (< >) and the U+2028/U+2029 line separators
# that terminate JS string literals. Octal escapes keep this bash-3.2 safe.
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//</\\u003c}"
  s="${s//>/\\u003e}"
  s="${s//$'\342\200\250'/\\u2028}"
  s="${s//$'\342\200\251'/\\u2029}"
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

# --- Helper: allow only safe URL schemes; anything else collapses to "#" ---
safe_url() {
  local url="$1"
  case "$url" in
    http://* | https://* | mailto:*) printf '%s' "$url" ;;
    *) printf '#' ;;
  esac
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

# --- Helper: count entries in a JSON array (0 on any error) ---
json_len() {
  printf '%s' "$1" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(len(d) if isinstance(d, list) else 0)
except Exception:
    print(0)' 2>/dev/null || printf '0'
}

# --- Helper: fetch releases for a repo across pages.
# Prints "is_prerelease\nversions_json" on success; returns non-zero on API error. ---
fetch_releases() {
  local repo="$1" version="$2"
  local page=1 body count
  local combined
  combined="$(mktemp "${TMPDIR:-/tmp}/releases.XXXXXX")"

  while [ "$page" -le 10 ]; do
    if ! body=$(curl -fsS \
      --connect-timeout 10 --max-time 30 \
      --retry 3 --retry-delay 2 \
      ${GITHUB_TOKEN:+-H "Authorization: token $GITHUB_TOKEN"} \
      "https://api.github.com/repos/$repo/releases?per_page=100&page=$page"); then
      rm -f "$combined"
      return 1
    fi
    # GitHub returns pretty-printed (multi-line) JSON, so pages are separated by
    # an explicit sentinel rather than by newline.
    printf '%s\n@@PAGEBREAK@@\n' "$body" >> "$combined"
    count=$(json_len "$body")
    [ "$count" -lt 100 ] && break
    page=$((page + 1))
  done

  # Merge every page's array, compute the current-version prerelease flag
  # (matching tags with OR without a leading "v"), and emit the version list.
  python3 -c '
import json, sys
target = sys.argv[1]
merged = []
for chunk in sys.stdin.read().split("@@PAGEBREAK@@"):
    chunk = chunk.strip()
    if not chunk:
        continue
    try:
        data = json.loads(chunk)
    except Exception:
        continue
    if isinstance(data, list):
        merged.extend(data)
is_pre = "false"
for r in merged:
    tag = r.get("tag_name", "") or ""
    if tag in (target, "v" + target) and r.get("prerelease"):
        is_pre = "true"
        break
versions = []
for r in merged:
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
' "$version" < "$combined"
  local rc=$?
  rm -f "$combined"
  return "$rc"
}

# --- Helper: resolve release history for a package into is_prerelease + versions_json.
# Honors OFFLINE (skip network) and STRICT_RELEASES (fail on fetch error). ---
resolve_releases() {
  local repo="$1" version="$2" label="$3"
  RELEASE_IS_PRERELEASE="false"
  RELEASE_VERSIONS_JSON="[]"
  [ -n "$repo" ] || return 0
  if [ "${OFFLINE:-}" = "1" ]; then
    echo "  -- offline mode: skipping release fetch for $label" >&2
    return 0
  fi
  local parsed
  if parsed=$(fetch_releases "$repo" "$version"); then
    RELEASE_IS_PRERELEASE=$(printf '%s\n' "$parsed" | head -1)
    RELEASE_VERSIONS_JSON=$(printf '%s\n' "$parsed" | tail -n +2)
  else
    echo "  !! warning: could not fetch releases for $repo (API error or rate limit)" >&2
    if [ "${STRICT_RELEASES:-}" = "1" ]; then
      echo "  !! aborting: refusing to publish $label without version history." >&2
      echo "  !! (set OFFLINE=1 for an explicit local offline build)" >&2
      exit 1
    fi
  fi
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
      *[Bb]eta*) stability="beta" ;;
      *[Rr][Cc]*) stability="rc" ;;
      *) stability="pre-release" ;;
    esac
  fi
  printf '%s' "$stability"
}

# --- Helper: render a stability badge (empty for stable/unknown) ---
badge_html() {
  local base color label
  base='inline-block font-sans text-[0.7rem] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-xl whitespace-nowrap align-middle'
  case "$1" in
    alpha) color='bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'; label='Alpha' ;;
    beta) color='bg-[rgba(168,85,247,0.15)] text-[#a855f7]'; label='Beta' ;;
    rc) color='bg-[rgba(59,130,246,0.15)] text-[#3b82f6]'; label='RC' ;;
    pre-release) color='bg-[rgba(249,115,22,0.15)] text-[#f97316]'; label='Pre-release' ;;
    *) return ;;
  esac
  printf ' <span class="%s %s">%s</span>' "$base" "$color" "$label"
}

# --- Helper: build a package table row of static HTML ---
package_row() {
  local name="$1" version="$2" desc="$3" stability="$4" href="$5" install="$6"
  local name_e version_e desc_e install_e href_e badge
  name_e=$(html_escape "$name")
  version_e=$(html_escape "$version")
  desc_e=$(html_escape "$desc")
  install_e=$(html_escape "$install")
  href_e=$(html_escape "$href")
  badge=$(badge_html "$stability")
  cat <<ROW
        <tr>
          <td data-label="Name"><a href="$href_e" class="font-semibold text-[var(--link)]">$name_e</a></td>
          <td data-label="Version"><span class="font-mono text-[0.8rem] bg-accent-subtle text-[var(--link)] px-2 py-0.5 rounded-xl whitespace-nowrap">v$version_e</span>$badge</td>
          <td data-label="Description">$desc_e</td>
          <td data-label="Install"><span class="font-mono text-[0.85rem] text-[var(--text-muted)] inline-flex items-center gap-2"><code>$install_e</code><button type="button" class="copy-sm inline-flex items-center justify-center w-6 h-6 border-none rounded-sm bg-transparent text-[var(--text-muted)] cursor-pointer transition-all duration-200 ease-in-out hover:text-[var(--link)] hover:bg-accent-subtle" data-copy="$install_e" aria-label="Copy install command">$COPY_ICON</button></span></td>
        </tr>
ROW
}

empty_row() {
  printf '        <tr><td colspan="4" class="text-center text-[var(--text-muted)] py-8">%s</td></tr>\n' "$1"
}

# --- The one Details row that differs between formula (License) and cask
#     (Application) pages. Server-renders its value. ---
detail_row() {
  local dt="$1" id="$2" value="$3"
  cat <<ROW
            <div class="flex items-baseline py-2.5 border-b border-[var(--card-border)] first:pt-0 last:border-b-0 last:pb-0 max-sm:flex-col max-sm:gap-0.5">
              <dt class="w-[120px] shrink-0 text-[0.85rem] font-semibold text-[var(--text-muted)] max-sm:w-auto">$dt</dt>
              <dd class="text-[0.9rem]" id="$id">$(html_escape "$value")</dd>
            </div>
ROW
}

# --- Helper: server-render the version-history <tr> rows from versions JSON.
# Reuses the bash stability rules so there is one classifier at build time. ---
render_version_rows() {
  local json="$1" current="$2"
  local rows="" v date pre url stab status link current_tag
  local badge_base='inline-block font-sans text-[0.7rem] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-xl whitespace-nowrap align-middle'
  while IFS=$'\t' read -r v date pre url; do
    [ -n "$v" ] || continue
    local ispre="false"
    [ "$pre" = "True" ] && ispre="true"
    stab=$(detect_stability "$v" "$ispre")
    status=$(badge_html "$stab")
    [ -n "$status" ] || status="<span class=\"$badge_base bg-[rgba(34,197,94,0.15)] text-[#16a34a]\">Stable</span>"
    current_tag=""
    if [ "$v" = "$current" ]; then
      current_tag=" <span class=\"$badge_base bg-accent-subtle text-[var(--link)]\">Current</span>"
    fi
    if [ -n "$url" ]; then
      link="<a href=\"$(html_escape "$(safe_url "$url")")\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--link)]\">Release notes</a>"
    else
      link=""
    fi
    rows+="        <tr>
          <td data-label=\"Version\"><span class=\"font-mono text-[0.85rem]\">v$(html_escape "$v")</span>$current_tag</td>
          <td data-label=\"Date\">$(html_escape "$date")</td>
          <td data-label=\"Status\">$status</td>
          <td data-label=\"\">$link</td>
        </tr>
"
  done < <(printf '%s' "$json" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    data = []
for r in (data if isinstance(data, list) else []):
    print("\t".join([
        str(r.get("version", "")),
        str(r.get("date", "")),
        str(r.get("prerelease", False)),
        str(r.get("url", "")),
    ]))' 2>/dev/null)
  printf '%s' "$rows"
}

# --- Render a template file, substituting {{KEY}} placeholders ---
# Usage: render_template <template> KEY1 VALUE1 KEY2 VALUE2 ...
# Two passes resolve placeholders that appear inside spliced partials.
render_template() {
  local template="$1"; shift
  local content idx key val token
  content="$(cat "$template")"
  local args=("$@")
  # Two passes resolve placeholders that appear inside spliced partials.
  for _ in 1 2; do
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

  repo=$(github_repo "$homepage")
  resolve_releases "$repo" "$version" "$name"
  is_prerelease="$RELEASE_IS_PRERELEASE"
  versions_json="$RELEASE_VERSIONS_JSON"
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

  repo=$(github_repo "$url")
  [ -n "$repo" ] || repo=$(github_repo "$homepage")
  resolve_releases "$repo" "$version" "$name (cask)"
  is_prerelease="$RELEASE_IS_PRERELEASE"
  versions_json="$RELEASE_VERSIONS_JSON"
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
# Render one detail page (shared by formulae + casks). All essential
# content is server-rendered so the page works with JavaScript disabled;
# the inline script only adds progressive enhancement (search/copy/theme/
# active-section tracking).
# =====================================================================
render_detail_page() {
  local out_dir="$1" name="$2" version="$3" desc="$4" homepage="$5" \
    caveats="$6" stability="$7" versions_json="$8" install="$9" \
    parent="${10}" parent_anchor="${11}" extra_row="${12}"

  mkdir -p "$out_dir"

  local name_e version_e desc_e install_e homepage_href homepage_text_e badge
  name_e=$(html_escape "$name")
  version_e=$(html_escape "$version")
  desc_e=$(html_escape "$desc")
  install_e=$(html_escape "$install")
  homepage_href=$(html_escape "$(safe_url "$homepage")")
  homepage_text_e=$(html_escape "$homepage")
  badge=$(badge_html "$stability")

  # Stability detail cell + header badge.
  local stability_text
  if [ "$stability" = "stable" ]; then
    stability_text="Stable"
  else
    stability_text="${badge# } &mdash; not yet considered stable"
  fi

  # Caveats section (hidden when empty).
  local caveats_hidden="hidden" caveats_html=""
  if [ -n "$caveats" ]; then
    caveats_hidden=""
    # Caveats are stored with literal "\n"; expand to real newlines, then escape.
    caveats_html=$(html_escape "$(printf '%b' "$caveats")")
  fi

  # Version-history section (hidden when empty).
  local versions_hidden="hidden" versions_rows=""
  versions_rows=$(render_version_rows "$versions_json" "$version")
  [ -n "$versions_rows" ] && versions_hidden=""

  # data drives client-side search only; no untrusted release JSON is embedded.
  local detail_script="    const data = $packages_json;"

  render_template "$DETAIL_TEMPLATE" \
    ROOT "../../" \
    NAV "$NAV_HTML" \
    SEARCH_MODAL "$SEARCH_MODAL_HTML" \
    FOOTER "$FOOTER_HTML" \
    ITEM_NAME "$name_e" \
    PARENT "$parent" \
    PARENT_ANCHOR "$parent_anchor" \
    DETAIL_NAME "$name_e" \
    DETAIL_VERSION "v$version_e" \
    DETAIL_STABILITY_BADGE "$badge" \
    DETAIL_STABILITY_TEXT "$stability_text" \
    DETAIL_DESC "$desc_e" \
    INSTALL_COMMAND "$install_e" \
    DETAIL_HOMEPAGE_HREF "$homepage_href" \
    DETAIL_HOMEPAGE_TEXT "$homepage_text_e" \
    EXTRA_DETAIL_ROW "$extra_row" \
    CAVEATS_HIDDEN "$caveats_hidden" \
    DETAIL_CAVEATS "$caveats_html" \
    VERSIONS_HIDDEN "$versions_hidden" \
    VERSIONS_ROWS "$versions_rows" \
    DETAIL_SCRIPT "$detail_script" \
    > "$out_dir/index.html"
}

# =====================================================================
# Build individual formula pages
# =====================================================================
for i in "${!formula_names[@]}"; do
  fname="${formula_names[$i]}"
  render_detail_page \
    "$SITE_DIR/formulae/$fname" \
    "$fname" "${formula_versions[$i]}" "${formula_descs[$i]}" \
    "${formula_homepages[$i]}" "${formula_caveats[$i]}" \
    "${formula_stabilities[$i]}" "${formula_releases_json[$i]:-[]}" \
    "brew install $fname" "Formulae" "formulae" \
    "$(detail_row License detail-license "${formula_licenses[$i]:-N/A}")"
done

# =====================================================================
# Build individual cask pages
# =====================================================================
for i in "${!cask_names[@]}"; do
  cname="${cask_names[$i]}"
  app_display="${cask_appnames[$i]:-$cname}"
  render_detail_page \
    "$SITE_DIR/casks/$cname" \
    "$cname" "${cask_versions[$i]}" "${cask_descs[$i]}" \
    "${cask_homepages[$i]}" "${cask_caveats_arr[$i]:-}" \
    "${cask_stabilities[$i]}" "${cask_releases_json[$i]:-[]}" \
    "brew install --cask $cname" "Casks" "casks" \
    "$(detail_row Application detail-appname "$app_display")"
done

# =====================================================================
# Build Tailwind CSS + copy static assets
# =====================================================================
echo "Building Tailwind CSS..."
npx --no-install @tailwindcss/cli -i "$CSS_INPUT" -o "$CSS_OUTPUT" --minify

cp "$CSS_OUTPUT" "$SITE_DIR/output.css"
cp "$SITE_SRC/favicon.svg" "$SITE_DIR/favicon.svg"
cp "$SITE_SRC/shared.js" "$SITE_DIR/shared.js"

echo "Site built successfully in $SITE_DIR"
echo "Formulae: ${#formula_names[@]}"
echo "Casks: ${#cask_names[@]}"
