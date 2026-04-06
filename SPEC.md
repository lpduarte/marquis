# Marquis — Specification

Living document. Describes what Marquis is, what it commits to, and — just as importantly — what it explicitly refuses to be. Updated per major version.

## What it is

Marquis is a minimalist in-browser reader for markdown files. The user drags a `.md` (or picks one), and the file is rendered as a typographically serious, quiet page. There is no editor, no sync, no account, no server. The entire experience happens locally in the browser.

The product answers one question: *"Where do I read the markdown I wrote?"*

## Principles

These are invariants. Any change that violates one of these is out of scope regardless of how appealing the feature sounds.

1. **Local by default.** User files never leave the browser. No uploads, no telemetry, no analytics, no third-party tracking.
2. **No build step.** HTML, CSS, JS served as static files. If it needs bundling or transpiling, it doesn't belong here.
3. **Literary minimalism.** Serif typography, three calm themes, generous whitespace. The app gets out of the way of the text.
4. **Reader, not editor.** Marquis does not compete with writing tools. It is the quiet place *after* the writing is done.
5. **Accessible by default.** WCAG AA minimum for contrast, keyboard navigation, screen reader support, reduced motion, focus management. Accessibility is not a feature flag — it's the floor.
6. **Works offline.** Once visited, Marquis must function with no network. Service worker is mandatory, not optional.
7. **Installable.** PWA with a manifest, a home-screen icon, and a standalone display mode.

## v1 — shipped (2026-04-05)

### Core reading
- Opens `.md`, `.markdown`, and `.txt` files via drag-and-drop or file picker
- Single-file at a time (no tabs, no history)
- Parses GitHub-Flavored Markdown via `marked` (tables, task lists, code blocks, etc.)
- Sanitizes output via `DOMPurify` before insertion
- Rejects files that look binary (null bytes / non-printable heuristic) with an inline message
- External links in rendered content open in a new tab with `rel="noopener"`

### Identity and chrome
- Title with a serif "M" and three dots as a stylized crown
- Tagline: *"Devolve o monospace às máquinas."*
- Favicon SVG with light/dark media query + PNG fallbacks for third-party iOS browsers
- Apple touch icon in sepia (the instalation identity) — opaque, ~15% glyph margin
- Welcome footer with discreet link to the source repo
- Open-source link at the bottom of the welcome viewport

### Reading experience
- Three themes: light, sepia, dark (chosen in the floating controls, persisted to `localStorage`)
- Fade-up entrance animation with staggered first 20 blocks
- Always-visible scroll progress bar at the viewport bottom during reading
- Controls bar auto-hides after 3 seconds; tap/click reveals it; inert when hidden
- `Escape` returns to welcome; `Back` button does the same; focus returns to the open button
- Mobile: whole welcome screen is a tap target to open the picker

### Infrastructure
- Static hosted on GitHub Pages at `lpduarte.github.io/marquis`
- Service Worker with cache-first strategy and individual `cache.put` per asset (resilient to CDN hiccups)
- Manifest with sepia theme color, standalone display mode, and multi-format icon list
- `viewport-fit=cover` meta for iOS safe-area support (unused in v1, ready for v2)

### Accessibility (v1 level)
- `aria-label` on every control button; decorative SVGs marked `aria-hidden`
- `inert` attribute on hidden controls, so they stay out of the tab order
- Auto-show controls on reader entry, so keyboard users see them at least once
- Focus moves into `<article tabindex="-1">` on render and returns to the open button on back
- `role="progressbar"` with `aria-valuenow` updates on scroll
- `:focus-visible` outlines matching theme color
- WCAG AA contrast across all three themes (verified)
- `prefers-reduced-motion` disables load animation, body transitions, smooth scroll
- Selection-safe: text selection in the reader no longer accidentally toggles controls

### Stack
- HTML + CSS + vanilla JavaScript (no framework, no bundler)
- `marked@12.0.2` — markdown parser (self-hosted, no CDN)
- `DOMPurify@3.1.6` — HTML sanitizer (self-hosted, no CDN)
- `Literata` via Google Fonts — reading typeface (only remaining external dependency; local serif fallbacks if offline)
- Service worker: network-first for all same-origin requests, cache fallback for offline only

## v1 — explicitly NOT included

These were considered and rejected. Do not reopen without a compelling case.

### Rejected on principle
- **Editing.** Marquis is a reader. The moment it becomes an editor, it's a different product.
- **Sync, accounts, cloud storage.** Violates the "local by default" principle.
- **Analytics, telemetry, A/B testing.** Violates "local by default" and also the literary tone.
- **Ads or sponsorships.** Obvious.

### Rejected on scope
- **Font size controls** (existed briefly, removed). Zero-use feature per the user's own report. Theme + fixed size is enough.
- **Snarkdown or smaller parser.** Would save ~50KB but remove GFM tables and task lists. Not worth the regression.
- **Multiple file tabs.** Contradicts "single quiet document".
- **Reading position persistence / bookmarks.** Would need per-file identification in localStorage; over-engineering for a reader of files the user already owns.
- **Export to PDF / print stylesheet.** The browser's native print already works on rendered HTML; dedicated styling is out of scope.
- **Table of contents sidebar.** Too much UI for the minimalist brief.

### Deferred (maybe v2)
- **i18n.** Strings are currently hardcoded in Portuguese.
- **Changelog automation / release tagging.** Manual.
- **CI / linting / automated tests.** None.

### Shipped post-v1.0.0 (v1.1.0)
- **Error handling for `FileReader` / parser failures.** Friendly messages with error codes (MQ-F00–F04, MQ-P01, MQ-S01, MQ-R00). Loading indicator with animated dots.
- **Loading state for large files.** `showLoading` with rAF yield before sync parse.
- **Network-first service worker.** Eliminates deploy staleness by design.
- **Self-hosted `marked` and `DOMPurify`.** Zero CDN dependencies at runtime. No SRI maintenance.
- **Horizontal overflow prevention.** `overflow-wrap` rules for prose and inline code on mobile.
- **Programmatic focus outline suppressed.** iOS Safari blue ring no longer flashes on render.

## Design decisions worth remembering

- **Sepia as the installation identity.** The apple-touch-icon uses the sepia theme as its solid background. It's not "the app's only color" — it's the color of *Marquis installed*, distinct from the transparent favicon of *Marquis visited*.
- **Three dots as a crown.** The favicon glyph is "M" with three dots above, central dot larger. Visual reference to a marquis' heraldic crown, without being literal.
- **"Devolve o monospace às máquinas"** — tagline. Retained over the softer "A devolver..." variant for its declarative punch.
- **Open source link at the footer** — uses the words "open source →" in lowercase, muted, bottom-anchored. Part colophon, part signal of trust ("the code is there, go check").
- **Progress bar outside the controls toolbar.** Always visible during reading, independent of whether the controls are expanded.

## How v2 should begin

Before writing any code for v2:

1. Read [`POSTMORTEM.md`](./POSTMORTEM.md).
2. Decide the v2 *question* — what problem is v2 solving that v1 did not? If there isn't a clear answer, there is no v2.
3. Update this file with a new `## v2` section mirroring the structure above: core, identity, infrastructure, accessibility, stack. List what v2 adds and what v2 *removes* from v1 (if anything).
4. Update `CHANGELOG.md` with a new entry.
5. Only then, start writing code.
