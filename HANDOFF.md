# Handoff: GPS Gifting Program Selector

## Overview
An interactive decision-tree tool that guides casino Directors of Marketing through up to six branching questions about their loyalty/gifting program and recommends one of three GPS gifting models: **Traditional Gifting**, **Hybrid Gifting Program**, or **Full Digital Dropship (ezGIFT®)**. It is a lead-qualification and sales-enablement tool — reps demo it on casino floors, and (once hosted) prospects can self-serve it from a GPS web property.

Two deliverables ship together and you can go either route:
- **Fast path — deploy the standalone file as-is.** `GPS Gifting Program Selector.html` is a single, fully self-contained file (inlined fonts, logo, CSS, and JS). It runs offline with no build step and no dependencies. This is the recommended artifact for GitHub Pages.
- **Rebuild path — reimplement in a real codebase.** If GPS wants this inside an existing site/app (React/Vue/etc.), recreate the design from this spec using that codebase's patterns.

## About the Design Files
The HTML files in this bundle are **design references** — a working prototype showing the intended look and behavior. They are production-grade for a static deploy, but if you are integrating into an existing app, treat them as the source of truth for **visual + interaction spec** and reimplement using the target codebase's established framework, components, and patterns rather than pasting the HTML in.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, branching logic, and interactions are all defined here and in the files. Recreate pixel-for-pixel.

---

## Hosting on GitHub Pages (fast path)

The standalone file is the entire site. To publish it:

1. Create a new GitHub repo (e.g. `gps-gifting-selector`).
2. Copy `GPS Gifting Program Selector.html` into the repo root and **rename it to `index.html`** (GitHub Pages serves `index.html` by default).
3. Commit and push to `main`.
4. In the repo, go to **Settings → Pages → Build and deployment**, set **Source = Deploy from a branch**, branch = `main`, folder = `/ (root)`, and save.
5. Wait ~1 minute; the site is live at `https://<user-or-org>.github.io/<repo>/`.

Notes:
- No build tooling, framework, or `package.json` is required — it is one static file.
- To use a custom domain (e.g. `selector.gpspromo.com`), add a `CNAME` file with the domain and configure DNS per GitHub's docs.
- If you instead want the rebuilt/framework version hosted, build to static output and either push the build to a `gh-pages` branch or use a GitHub Actions Pages workflow.

If you rebuild in a framework, everything below is the spec.

---

## Screens / Views

The tool is a single-page, single-column experience with three view states. Layout is a centered vertical stack: brand header on top, then either the **Question** card or the **Result** card. Max content width **640px**, centered, on a pale-purple radial-wash background.

### Global frame
- **Container:** `min-height: 100vh`, background `radial-gradient(1100px 520px at 50% -8%, #f0e7fb 0%, #faf8fd 46%, #ffffff 100%)`. Flex column, center-aligned, padding `56px 20px 88px`.
- **Header (always visible):**
  - GPS logo (`GPS-logo-main-purple.png`), `height: 38px`, centered, `margin-bottom: 22px`.
  - Overline: "GIFTING PROGRAM SELECTOR" — Demi 12px, letter-spacing 0.16em, uppercase, color `#582c83`, margin-bottom 14px.
  - H1 headline: default "Find Your Gifting Model" — Bold, `clamp(34px, 5.5vw, 52px)`, line-height 1.04, letter-spacing -0.015em, color `#2e034a`.
  - Intro paragraph: Regular 16px/1.6, color `#5a5563` (fg-2), max-width 460px, centered, margin-top 18px. Default: "Answer up to six questions about your program and we'll recommend the right structure for your property."

### 1. Question view
Shown while the user is answering. Contains a progress bar + a question card.

- **Progress bar** (width 100%, margin-bottom 28px):
  - Left label "QUESTION N OF 6" — Demi 11px, tracking 0.12em, uppercase, color fg-3 (`#8a8594`).
  - Right label percent (e.g. "33%") — Demi 11px condensed, color `#582c83`.
  - Track: height 4px, `background: #ece1f7` (purple-100), radius 999px. Fill: `background: var(--accent)`, width = percent, `transition: width 0.5s`.
- **Question card:** white, `border: 1px solid #e7e6eb`, radius 14px, padding `40px 40px 36px`, shadow `--sh-3`.
  - Overline: "QUESTION N OF 6" — Demi 11px, tracking 0.14em, uppercase, color `#bda3e2`.
  - H2 question text: Bold, `clamp(22px, 3vw, 28px)`/1.2, letter-spacing -0.01em, color `#2e034a`, margin-bottom 26px.
  - **Option buttons** (2–3 per question): full-width flex row, `gap: 15px`, background `#faf8fd`, `border: 1.5px solid #e7e6eb`, radius 10px, padding `17px 18px`, left-aligned, margin-bottom 10px, cursor pointer.
    - Leading letter badge (A/B/C): 26×26px circle, `background: #ece1f7`, Bold 12px condensed, color `#582c83`.
    - Label line: Demi 15px/1.4, color `#2e034a`.
    - Sub line: Regular 13px/1.5, color fg-2, margin-top 3px.
    - **Hover:** `border-color: #582c83; background: #f5eefc (purple-50); box-shadow: --sh-2`.
  - **Back button** (only when history exists): ghost, inline-flex, chevron-left SVG 13px + "BACK" — Demi 12px, tracking 0.1em, uppercase, color fg-3; hover color `#582c83`.

### 2. Result view
Shown when a leaf (PHYSICAL / HYBRID / DIGITAL) is reached.

- **Result card:** white, `border: 1px solid #e7e6eb`, **`border-top: 4px solid var(--accent)`**, radius 14px, shadow `--sh-4`, overflow hidden. Inner padding `30px 40px 38px`.
  - Overline: "RECOMMENDED MODEL" — Demi 11px, tracking 0.16em, uppercase, color `var(--accent)`.
  - H2 title: Bold, `clamp(30px, 5vw, 44px)`/1.06, **uppercase**, letter-spacing 0.005em, color `#2e034a`.
  - Description paragraph: Regular 16px/1.65, color fg-2, max-width 500px, margin-bottom 30px.
  - **Pillar grid:** 2×2 grid, `gap: 10px`, margin-bottom 32px. Each cell: `background: #faf8fd`, `border: 1px solid #ece1f7`, radius 10px, padding `15px 16px`. Label: Demi 10px, tracking 0.12em, uppercase, fg-3. Value: Demi 14px/1.4, color `#2e034a`.
  - **CTA row** (flex, gap 10px, wrap):
    - Primary: `background: var(--accent)`, white text, Bold 14px, tracking 0.08em, uppercase, padding `14px 24px`, radius 8px, trailing **GPS double-chevron** glyph. Hover `filter: brightness(0.88)`.
    - Secondary "START OVER": white, `border: 2px solid #d9d6e0`, color fg-2, radius 8px. Hover: border + text `#582c83`.
- **Answer trail** (below card, margin-top 26px): overline "YOUR ANSWERS", then a vertical list of rows — `Q1` … (Demi 12px condensed, purple, min-width 26px) + the chosen option label (Regular 13px/1.5).

---

## Interactions & Behavior

- **State machine.** A `NODES` map defines every question node (`{ num, q, options[] }`); each option has `{ label, sub, next }` where `next` is either another node id or a result key. A `RESULTS` map defines the three leaves.
- **Choosing an option:** push `{ nodeId, optionIndex }` onto `history`; if `next` is a result key, set `resultKey` and render the Result view; otherwise advance `currentNodeId`.
- **Back:** pop the last history entry, return to that node, clear any result.
- **Start Over / Restart:** reset `history = []`, `currentNodeId = 'Q1'`, `resultKey = null`.
- **Progress %:** `Math.round(((node.num - 1) / 6) * 100)`.
- **Accent color changes per result:** Traditional `#582c83`, Hybrid `#7a4fb8`, Digital `#8208d1`. It drives the progress fill, result top border, overline, and primary CTA (exposed as CSS custom property `--accent`).
- **Transitions:** 200ms `cubic-bezier(0.22, 0.61, 0.36, 1)` on hovers; progress fill 500ms. No entry animation (deliberately removed — content is visible at rest). Calm, no bounce.

## State Management
- `history: Array<{ nodeId: string, optionIndex: number }>`
- `currentNodeId: string` (starts `'Q1'`)
- `resultKey: 'PHYSICAL' | 'HYBRID' | 'DIGITAL' | null`

No data fetching. The CTA buttons are currently non-navigating — wire them to a contact form, mailto, or CRM endpoint when integrating. Consider adding lead capture (name / property / email) before or after the result if this becomes a public web tool.

## Full branching logic + copy
The complete node graph, all question/option text, and all result content (titles, descriptions, four pillars each, CTA labels) live verbatim in **`Gifting Program Selector.dc.html`** inside the `NODES` and `RESULTS` objects. That is the authoritative source for copy and routing — read it directly rather than re-transcribing.

## Design Tokens
From the GPS Design System (`colors_and_type.css`, included in this bundle):
- **Colors:** primary purple `#582c83` (Pantone 268 C), light purple `#bda3e2` (264 C), bright purple `#8208d1`, deep/near-black purple `#2e034a`, hybrid mid purple `#7a4fb8`. Backgrounds: white, pale wash `#faf8fd`. Borders: subtle `#e7e6eb`, strong `#d9d6e0`, purple-100 `#ece1f7`, purple-50 `#f5eefc`. Text: fg-1 near-black purple, fg-2 `#5a5563`, fg-3 `#8a8594`.
- **Type:** Avenir Next LT Pro only. Weights used: Regular 400, Demi 600, Bold 700 (700 is the max — never Heavy/Black). A condensed cut is used for stat/number chips.
- **Radii:** cards 14px, buttons 8px, option rows 10px, pills/badges 999px.
- **Shadows:** purple-tinted low-contrast elevations `--sh-2`/`--sh-3`/`--sh-4`.
- **Spacing:** 4px base scale; hero/section padding 40–56px.
- **Casing:** all-caps display/overlines/buttons never end in a period; tracked-out uppercase.

## Assets
- `assets/GPS-logo-main-purple.png` — header logo (also a white version `GPS-logo-main-white.png` for dark surfaces).
- **GPS double-chevron glyph** — inline SVG `<symbol id="gpsChev">` defined in the DC; the brand forward-CTA mark (never a horizontal arrow). Reuse the path data from the file.
- **Fonts** — Avenir Next LT Pro. In the standalone file these are inlined; in a rebuild, self-host the family from the GPS design system `fonts/` folder (licensed brand font — do not swap for Inter/Roboto).
- No third-party icon dependency; the only icons are the inline chevron glyph and a small chevron-left SVG on the Back button.

## Files (in this bundle)
- `GPS Gifting Program Selector.html` — **standalone, deployable** self-contained build. Rename to `index.html` for GitHub Pages.
- `Gifting Program Selector.dc.html` — editable source component; authoritative for branching logic, copy, and structure.
- `support.js` — runtime that renders the component (referenced by the `.dc.html`; already inlined into the standalone file).
- `colors_and_type.css` — GPS design tokens + `@font-face` rules.
- `assets/` — GPS logos.

Read `Gifting Program Selector.dc.html` first for the interaction model and copy, then this README for the visual spec and deploy steps.
