# UI/UX Review: Homebrew Den documentation site

**Reviewed:** 2026-07-10 · **Input:** Local code (`site/` templates, `shared.js`, `input.css`) + rendered preview · **Method:** NN/g heuristic evaluation + guideline review

## Executive summary

- Strong baseline: brand-consistent, responsive, server-rendered tables that work without JS, semantic landmarks, persisted theme, keyboardable command palette.
- **Single worst problem (now fixed):** the cyan accent `#00aced` was used as link/interactive **text** and only reached **2.59:1** contrast on the light theme's white/near-white backgrounds — below the WCAG AA 4.5:1 floor. Routed accent text through a new `--link` token (brand blue `#0e4d8d`, 8.5:1, on light; cyan retained on dark).
- The rest are minor/cosmetic: skip-link (fixed), one mislabeled copy button (fixed), decorative SVGs not hidden from AT, and animations that ignored `prefers-reduced-motion` (fixed).
- No catastrophic (blocking) issues. The site is usable and completes its core task (find a package → copy an install command) cleanly.

**Findings:** 🟥 0 catastrophic · 🟧 1 major (fixed) · 🟨 2 minor (1 fixed) · ⬜ 3 cosmetic (1 fixed)

## Findings

### 🟧 Severity 3 — Major

#### 1. Accent-as-text fails AA contrast on the light theme — ✅ FIXED (2026-07-10)
- **Resolution:** Added a `--link` custom property (`#0e4d8d` light / `#00aced` dark); accent **text** (`text-accent` → `text-[var(--link)]`, plus the base `a{}` rule) now uses it while fills, borders, and icons keep cyan. Dark theme is visually unchanged.
- **What:** `#00aced` on white (`#ffffff`) computes to **2.59:1**; on the `--bg` `#f4f7fb` it is even lower. AA requires 4.5:1 for normal text and 3:1 for large text / UI components — this fails both. Measured from `site/input.css` (`--color-accent: #00aced`, `a { color: var(--color-accent) }`).
- **Where (light theme only):** all body links; hero "1 formulae · 1 casks" links; version chips (`text-accent`); the `brew …` command text inside the "How to Use" cards (`text-[0.85rem] text-accent`); "Release notes" links; sidebar/breadcrumb hover state. Dark theme (`#00aced` on `#091533`) is high-contrast and unaffected.
- **Guideline:** NN/g accessibility — sufficient text contrast; WCAG 2.1 SC 1.4.3 Contrast (Minimum).
- **Evidence:** [Ensure High Contrast (NN/g)](https://www.nngroup.com/articles/low-contrast/) — low-contrast text hurts readability for everyone, not just low-vision users.
- **Fix:**
  - [ ] Keep `#00aced` for fills, borders, icons, and the dark theme.
  - [ ] For accent **text** on the light theme, use a token that clears 4.5:1 — the existing brand blue `#0e4d8d` measures **8.5:1** on white. Either point `a { color }` at a new `--link` var (`#0e4d8d` light / `#00aced` dark) or darken `--color-accent` for text usages only.
  - [ ] Re-verify the version chip and "How to Use" command text after the change.

### 🟨 Severity 2 — Minor

#### 2. No "skip to main content" link
- **What:** Keyboard and screen-reader users must tab through the full nav (search, theme, GitHub) on every page before reaching content. No skip link exists in `site/partials/nav.html`.
- **Where:** All pages.
- **Guideline:** NN/g accessibility for keyboard users; WCAG 2.1 SC 2.4.1 Bypass Blocks.
- **Evidence:** [Accessibility for Keyboard Users (NN/g)](https://www.nngroup.com/articles/keyboard-accessibility/) — provide a way to bypass repeated blocks of navigation.
- **Fix:**
  - [ ] Add a visually-hidden-until-focused `<a href="#main">Skip to content</a>` as the first focusable element; give `<main>` (detail pages) / the first content section (index) an `id="main"`.

#### 3. Animations ignore `prefers-reduced-motion`
- **What:** The fade-in/slide-up modal animations and all `transition`s run unconditionally; there is no `@media (prefers-reduced-motion: reduce)` block in `site/input.css`.
- **Where:** Search modal open, theme/hover transitions, smooth scroll.
- **Guideline:** NN/g motion & accessibility; WCAG 2.1 SC 2.3.3 Animation from Interactions.
- **Evidence:** [Designing for Users with Motion Sensitivities (WCAG 2.3.3)](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html).
- **Fix:**
  - [ ] Add a reduced-motion media query that neutralizes `--animate-*`, `scroll-behavior`, and transition durations.

### ⬜ Severity 1 — Cosmetic

#### 4. Hero copy button is mislabeled
- **What:** The hero button copies `brew tap mrdemonwolf/den` but its `aria-label` reads "Copy install command" (`site/template.html`). A screen-reader user hears the wrong action.
- **Fix:**
  - [ ] Change the hero button `aria-label` to "Copy tap command".

#### 5. Decorative SVGs are exposed to assistive tech
- **What:** The nav logo mark, the "1/2/3" step badges, and the version-history clock icon are decorative but not `aria-hidden="true"`, so screen readers may announce empty graphics.
- **Fix:**
  - [ ] Add `aria-hidden="true"` (and `focusable="false"`) to purely decorative inline SVGs.

#### 6. Detail-page section labels as tiny `<h2>`
- **What:** "Install/Details/Caveats" are `<h2>` at `0.8rem` uppercase — smaller than body text — under a `2rem` `<h1>`. Semantically valid but visually flattens the heading hierarchy (an "eyebrow label" pattern).
- **Guideline:** NN/g visual hierarchy — heading prominence should track heading level.
- **Evidence:** [Heading Hierarchy Matters (NN/g)](https://www.nngroup.com/articles/headings-pickup-lines/).
- **Fix (optional):**
  - [ ] Leave as-is (acceptable pattern), or bump the card titles to a slightly larger weight/size so scannability improves.

## Unverified (needs a different input to check)
- Real-device touch-target sizing and mobile Safari rendering — verified only at emulated widths.
- Screen-reader announcement order — inferred from markup, not tested with VoiceOver/NVDA.

## What's working well
- **Progressive enhancement:** package tables are server-rendered (`build-site.sh`), so the core task works with JS disabled.
- **Semantics & a11y basics:** `nav`/`main`/`aside`/`footer` landmarks, `aria-label` on every icon button, `sr-only` labels, `rel="noopener noreferrer"` on external links.
- **Responsive:** table→card layout on mobile, sidebar→scrollable strip, sensible breakpoints.
- **Theme:** respects system preference, persists to `localStorage`, brand-accurate light default.
- **Command palette:** Cmd/Ctrl+K, arrow-key navigation, Esc to close, focus restore on close.

## Quick wins
- [x] Fix the hero copy button `aria-label` (finding #4).
- [x] Add a skip-to-content link (finding #2).
- [x] Add the reduced-motion media query (finding #3).
- [x] Accent-text contrast fix (finding #1) — applied via the `--link` token.
- [ ] Remaining (cosmetic, optional): `aria-hidden` on decorative SVGs (finding #5).
