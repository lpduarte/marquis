# Changelog

All notable changes to Marquis will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-04-06

Reliability and simplification pass. Driven by real bugs found during mobile testing.

### Added
- **Error handling** with friendly Portuguese messages and diagnostic codes (MQ-F00–F04, MQ-P01, MQ-S01, MQ-R00). Errors show a human message with a suggested action, plus a small footnote code for debugging. Technical details go to `console.error`.
- **Loading indicator** — animated dots ("A processar...") shown via `showLoading` before the synchronous `marked.parse` runs. Visible only if the parse is slow enough for the browser to paint a frame; invisible on fast files.
- **`overflow-wrap: break-word`** on `.content` and `overflow-wrap: anywhere` on `.content code` — prevents long file paths and identifiers from causing horizontal overflow on mobile.
- **`max-width: 100%`** on `.content pre` — keeps fenced code blocks contained.
- **`body { overflow-x: hidden }`** as a safety net against any residual horizontal scroll.

### Changed
- **Service worker rewritten from scratch** — network-first for all same-origin requests (was cache-first). Deploys are now immediately visible without manual cache bumps. Offline falls back to cache. ~35 lines instead of ~60.
- **`marked` and `DOMPurify` self-hosted** in the repo instead of loaded from jsdelivr CDN. Eliminates CDN dependency, SRI hash maintenance, opaque responses (~21 MB phantom quota), and cross-origin caching complexity. Total: 57 KB added to the repo.
- **Programmatic focus outline suppressed** on `.content:focus` — the A5 accessibility fix moved focus into the article on render, which triggered iOS Safari's blue system accent ring. Now hidden via `outline: none` (safe because the article has `tabindex="-1"` and is unreachable via keyboard Tab).

### Removed
- CDN `<script>` tags with `integrity` and `crossorigin` attributes for marked and DOMPurify.
- Runtime caching of arbitrary external URLs in the service worker.
- `mode: 'no-cors'` fetch in the service worker install.

### Fixed
- Stale service worker cache causing deployed changes to be invisible to returning visitors. Root cause: cache-first strategy + no CACHE bump on deploy. Fixed by switching to network-first.
- Horizontal overflow on mobile when reading documents with long inline code (e.g., file paths). The postmortem's `/Library/Developer/CommandLineTools/usr/bin/xcrun` path was the culprit.
- iOS Safari intermittently showing a blue focus ring around the article body on file open.

---

## [1.0.0] — 2026-04-05

First public release. Live at [lpduarte.github.io/marquis](https://lpduarte.github.io/marquis/).

### Added

**Core reader**
- Markdown rendering via `marked@12.0.2` with GitHub-Flavored Markdown (tables, task lists, fenced code)
- File opening via drag-and-drop and file picker (accepts `.md`, `.markdown`, `.txt`)
- HTML sanitization via `DOMPurify@3.1.6` before insertion
- Binary file detection (null-byte / non-printable heuristic) with user-facing message
- External links in rendered content open in a new tab with `rel="noopener"`
- `Escape` and back button return to the welcome screen

**Visual identity**
- Serif title "Marquis" with three circles over the M as a stylized crown
- Tagline: *"Devolve o monospace às máquinas."*
- Three themes: light, sepia, dark (persisted to `localStorage`)
- Literata typography via Google Fonts (400, 600, 700, italic 400)
- Fade-up entrance animation with staggered first 20 blocks of content
- Always-visible scroll progress bar at the viewport bottom during reading
- Floating controls bar with auto-hide, blur backdrop, theme-aware background

**Welcome screen**
- Inline "abre um ficheiro" link, responsive between pointer and touch (whole screen tap target on mobile)
- Transient `welcome-msg` for warnings (multi-file drop, binary rejection)
- "open source →" link at the bottom of the viewport linking to the repo

**Favicons and icons**
- `favicon.svg` with `@media (prefers-color-scheme: dark)` for automatic theme adaptation
- `favicon-light.png` (192×192, transparent) and `favicon-dark.png` (192×192, transparent) as PNG fallbacks for third-party iOS browsers
- `apple-touch-icon.png` (180×180) — sepia solid background with dark-sepia glyph, ~15% margin, for iOS home screen

**PWA**
- `manifest.json` with sepia theme/background color, standalone display mode, and multi-icon list
- Service worker (`sw.js`) with cache-first strategy, pre-cached core assets + CDN dependencies
- Service worker uses individual `cache.put` per asset (not atomic `addAll`) to survive transient CDN failures
- Runtime caching of any successfully fetched asset
- `theme-color` meta tags with light/dark variants

### Accessibility
- `aria-label` on every control button
- Decorative SVGs marked `aria-hidden="true"` and `focusable="false"`
- `inert` attribute on hidden controls, so they stay out of the keyboard tab order
- Auto-show controls on reader entry so keyboard users see them at least once
- Focus management: moves into `<article tabindex="-1">` on render, returns to open button on back
- `role="progressbar"` with `aria-valuenow` updates on scroll
- `:focus-visible` outlines matching each theme's text color
- `prefers-reduced-motion` disables load animation, body transitions, and smooth scroll
- `role="status" aria-live="polite"` on transient welcome messages
- WCAG AA contrast across all three themes
- Selection-aware click handler on the reader (does not toggle controls when text is being selected)
- `html lang="pt"` declared

### Security
- All CDN scripts pinned to exact versions with SRI (`integrity="sha384-..."`)
- `DOMPurify` sanitization on all rendered content
- `rel="noopener"` on external links generated from user markdown
- `crossorigin` attributes on CDN preconnects

### Developer experience
- No build step — HTML, CSS, and JS served as static files
- Zero dependencies to install
- `.gitignore` for `.claude/` and `.DS_Store`
- MIT license
- `README.md` with project description and credits
- `SPEC.md` documenting scope, principles, and v1 boundary

### Known limitations (see `SPEC.md` for rationale)
- No error handling for `FileReader` / parser failures — silent fallthrough
- No loading state for large files; `marked.parse` is synchronous
- Service worker is cache-first for HTML, which delays deploy visibility
- Strings hardcoded in Portuguese
- No CI, no tests, no linting

---

*v1 post-mortem lives in [`POSTMORTEM.md`](./POSTMORTEM.md). It documents the process, not the product.*
