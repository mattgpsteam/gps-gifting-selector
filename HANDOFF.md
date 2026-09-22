> **Repo-specific changes on top of the design build (read before dropping in a new one):**
> - `index.html` is now built from `source/selector.template.html` with `node tools/build.js`. Edit the source, never `index.html`.
> - GPS changes in the source: result CTA reads "Case Study" and opens `strategy/*.html`; a lead gate (name, email, phone optional, casino, tradeshows) hides the result until filled in; every answer and the lead are posted to `server/` (selector-log), which stores them in SQLite and mirrors to Airtable. See `server/README.md`.
> - New design drop: copy it to `index.html`, run `node tools/build.js --extract`, then re-apply the GPS changes (diff against git history of `source/`) and `node tools/build.js`.


# Handoff: GPS Gifting Program Selector

> **This is an UPDATE to an already-deployed app.** If a GitHub Pages site already exists for this tool, the fastest correct action is: replace `index.html` with the new standalone build and push. Details in **Updating the hosted app** below. Everything else in this README is the spec behind that file.

## Overview
An interactive decision tool that qualifies casino Directors of Marketing through six to eight questions about their loyalty program and recommends one of three GPS gifting models — **Traditional Gifting**, **Hybrid Gifting Program**, or **Full Digital Dropship (ezGIFT®)** — then surfaces the GPS products that fit that model.

It is a sales-enablement and lead-qualification tool. Reps demo it on casino floors (must work offline), and prospects self-serve it from the hosted site.

---

## Updating the hosted app

The entire site is **one self-contained file**. No build step, no framework, no `package.json`, no dependencies. Fonts, logo, CSS, and all logic are inlined — it runs offline from a USB stick.

```
1. Copy  "GPS Gifting Program Selector.html"  from this bundle
2. Overwrite  index.html  in the repo root  (Pages serves index.html by default)
3. git add index.html && git commit -m "Update gifting selector logic" && git push
4. Pages redeploys in ~1 minute
```

First-time setup, if Pages is not yet enabled: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Site lands at `https://<user-or-org>.github.io/<repo>/`. For a custom domain (e.g. `selector.gpspromo.com`), add a `CNAME` file containing the domain and point DNS per GitHub's docs.

**Do not hand-edit `index.html`.** It is a compiled artifact (~1.1 MB, mostly inlined font binaries). The editable source is `Gifting Program Selector.dc.html`; the standalone is regenerated from it. Hand-edits are lost on the next regeneration.

### Still open before this is a true public lead tool
- **CTAs do not navigate.** The primary result CTA and "Build This Program" are inert. Wire them to a contact form, `mailto:`, or CRM endpoint.
- **No lead capture.** Nothing is recorded. Consider a name / property / email step before revealing the result, or after it.
- **No analytics.** There is no tracking of drop-off by question or of which model gets recommended — both are valuable.
- **`window.location.href` navigation.** The result CTA navigates to sibling `*.dc.html` case-study files that are NOT part of a Pages deploy of the single file. On the hosted site this link will 404 unless those pages are also deployed or the CTA is repointed.

---

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, routing logic, and interactions are all final. Recreate exactly.

## About the design files
The HTML here is production-grade for a static deploy. If you are instead integrating into an existing GPS site or app, treat these files as the authoritative **visual + logic spec** and reimplement using that codebase's framework and component patterns.

---

## THE RECOMMENDATION ENGINE — read this first

This is the part that changed most and the part most likely to be reimplemented wrong. **It is not a decision tree.** An earlier version was; it was replaced because the question set has a multi-select and because budget must be able to override intent.

It is a **two-part model: a score, clamped by gates.**

### 1. Every answer carries a score
Negative pulls toward Traditional, positive toward Digital.

| Question | Answer | Score |
|---|---|---|
| Q1 Goal | Reduce budgets | −2 |
| | Drive incremental visits | −1 |
| | Change player behavior | +1 |
| Q2 Budget | $10–14 | −3 |
| | $15–18 | −2 |
| | $19–24 | −1 |
| | $25–35 | +1 |
| | $40+ | +2 |
| Q3 VIP gifting today | Yes | +1 |
| | No | −1 |
| Q4 VIP budget | $50+ / $75+ / $150+ | +1 / +2 / +3 |
| Q5 Tiers | Single / Multi + VIP / High-worth only | −1 / +1 / +2 |
| Q6 Demographics | 55+ rural / Mixed / Younger digital | −2 / 0 / +2 |
| Q7 Reduce lever | Re-segment / Day-of earn / Consolidate vendors | −2 / +1 / −2 |
| Q8 Rain checks | Yes / No | +2 / −2 |
| Q7′ Add programs | Yes / No | 0 / −1 |
| Q8′ Ideas (multi) | Bank points / VIP experiences / Continuous spend / Increase budget | +2 / +1 / +3 / −1 |
| Q9 Behavior target | VIPs / Inactive / Developing / New guests | +1 / +2 / +1 / −2 |

**Thresholds:** `score ≤ 0` → Traditional · `1–3` → Hybrid · `≥ 4` → Digital.

### 2. Gates clamp the result — a ceiling
Applied after scoring. Each gate lowers the maximum reachable model and records the reason it did so.

- Budget **$10–18** → ceiling Traditional
- Budget **$19–24** → ceiling Hybrid
- Budget **$25–35** → ceiling Hybrid, *unless* tiers = high-worth-only AND demographics = younger
- Demographics **55+ rural** → ceiling Hybrid (never Digital — address quality and redemption risk)
- Tiers **single** → ceiling Hybrid (no segment to carve out)
- **"No" to adding programs** → ceiling Hybrid (stay inside the model they run)

### 3. Floors override the ceiling — deliberately
Two signals raise a **floor** of Hybrid that **beats the budget gate**:

- **Q3 VIP gifting = Yes** — they already run two tracks, whether or not they call it that.
- **Q8′ "Bank points" or "Continuous point spend"** — banking is precisely what makes a low budget work ($15/month accumulated is a $180 redemption, which clears fulfillment economics a single $15 gift never could).

This is intentional and was an explicit product decision. A $15-budget property that banks points lands **Hybrid, not Traditional**. When this fires, the result renders a reconciling explanation. The floor never reaches Digital — only Hybrid.

Resolution order in `evaluate()`:
```
score → threshold → clamp to ceiling → raise to floor (if higher) → final key
```

### 4. Rules that make the copy trustworthy
Two defects were found and fixed here; do not regress them.

- **Driver reasons are tagged** with the models they argue for (`supports: ['HYBRID','DIGITAL']`). A reason is rendered only if it agrees with the final recommendation. A signal that lost to a gate is either **reframed as an explicit override** ("Rain-check exposure would normally point digital, but…") or dropped. Never render a bullet arguing for a model that was not recommended.
- **Gate reasons are tagged** with the ceiling they set, and are dropped if the final recommendation outranks that ceiling (which happens when a floor overrode it). The reconciling message is hoisted to first position so the 4-bullet cap cannot truncate it.

---

## Question flow

Q1–Q3 always ask. Q4 only if Q3 = Yes. Q5–Q6 always. The last one or two come from the Q1 branch:

```
Q1 Goal
Q2 Budget
Q3 Do you currently utilize VIP gifting?
  └─ Yes → Q4 VIP budget ($50+ / $75+ / $150+)
Q5 Tier differentiation
Q6 Player demographics
├─ Q1 = Reduce budgets     → Q7  Which lever?  → if "reduce qualified" → Q8 Rain checks?
├─ Q1 = Drive visits       → Q7′ Add/enhance programs? → if Yes → Q8′ Ideas (MULTI-SELECT)
└─ Q1 = Change behavior    → Q9  Which players?
```

Total 6–8 questions. **The progress denominator shows the longest path still possible**, so it only ever shrinks (8 → 7 → 6) and never counts upward — a deliberate fix, don't "simplify" it back to `sequence().length`.

**Q8′ is the only multi-select.** Checkbox UI, submit button disabled (opacity 0.4, click no-ops) until at least one box is checked. Options in this order: Bank points · VIP experiences · Continuous point spend · Increase gifting budget.

**Back** pops the last answer and then **prunes any answers no longer reachable** — necessary because changing Q1 or Q3 changes which later questions exist.

---

## Product recommendations — "Top Options for Your Property"

Below the result. Products are **filtered by eligibility first**, then ranked by fit score. Each card shows a "Why" line selected from the highest-priority matching rule, so the copy is specific to what the user answered.

| Product | Eligible when | What it is |
|---|---|---|
| **Sonar AI** | Always | AI voice + SMS host reaching players about a gift they've already earned. Two-way conversations, property's own persona, branded caller ID, redemption lift vs. holdout control. See `sonarhost.ai`. **Not** a database-scoring tool. |
| **ezGIFT® Kiosk** | Result = Hybrid | Self-serve on-floor gifting station — more choice, same footprint, no added staff |
| **365 by ezGIFT®** | Result = Digital | Always-on branded storefront for continuous point spend |
| **Periscope** | Q9 = New guests | Finds high-potential players not yet in the database |

So: Traditional ends with Sonar alone; Hybrid shows Sonar + Kiosk; Digital shows Sonar + 365; Periscope joins any of them when new guests are the target.

Sonar's fit score rises most on: inactive players, rain checks, a 55+ base (branded caller ID drives answer rates with exactly that demographic), and "drive incremental visits."

A **"Best fit"** badge marks the top-ranked card, suppressed when only one card is eligible.

---

## Screens

Single-column, centered, max width **640px** (720px for the case-study view), on a pale-purple radial wash. Header (logo + overline + H1 + intro) is always visible.

- **Global frame** — `min-height:100vh`, `radial-gradient(1100px 520px at 50% -8%, #f0e7fb 0%, #faf8fd 46%, #ffffff 100%)`, padding `56px 20px 88px`.
- **Question view** — progress bar (label left, percent right, 4px track `#ece1f7`, fill `var(--accent)`, 500ms width transition) + white card, `1px solid #e7e6eb`, radius 14px, padding `40px 40px 36px`, `--sh-3`. Options are full-width rows: letter badge in a 26px `#ece1f7` circle, Demi 15px label, Regular 13px sub. Hover: `border-color:#582c83; background:#f5eefc; box-shadow:--sh-2`.
  - **Budget (Q2) and VIP budget (Q4) options have no sub-copy** — labels only, by design.
- **Multi-select view** — same shell; 26px rounded-square checkboxes that fill `#582c83` with a white check when on; row goes `background:#f5eefc; border-color:#582c83`. Submit button below.
- **Result view** — white card with `border-top: 4px solid var(--accent)`, overline "RECOMMENDED MODEL", uppercase H2 title, description, 2×2 pillar grid, CTA row (primary in `var(--accent)` with the GPS double-chevron + secondary "START OVER"). Then the product grid, then "YOUR ANSWERS".
- **Case-study view** — reached from the result CTA: scenario, numbered steps, three input fields for modeling the property, three stat tiles.

**Accent per result:** Traditional `#582c83` · Hybrid `#7a4fb8` · Digital `#8208d1`. Bound as CSS custom property `--accent`, driving progress fill, card top border, overline, and primary CTA.

---

## Design tokens
From the GPS Design System (`colors_and_type.css`, in this bundle):

- **Colors** — primary `#582c83` (Pantone 268 C), light `#bda3e2` (264 C), bright `#8208d1`, deep `#2e034a`, hybrid mid `#7a4fb8`. Surfaces white and `#faf8fd`. Borders `#e7e6eb` / `#d9d6e0` / `#ece1f7` / `#f5eefc`. Text `#2e034a` / `#5a5563` / `#8a8594`.
- **Type** — Avenir Next LT Pro only. Regular 400 / Demi 600 / Bold 700. **700 is the maximum — never Heavy or Black.** Condensed cut for numerals and stat chips.
- **Contrast** — body text ≥ 4.5:1. `#bda3e2` on white is **2.2:1 and fails** — never use it for text, only for borders, rules, and decorative marks. (This was a real bug, caught twice.)
- **Radii** — cards 14px, buttons 8px, rows 10px, pills 999px.
- **Motion** — 200ms `cubic-bezier(0.22, 0.61, 0.36, 1)`; progress fill 500ms. No entry animations, no bounce — content is visible at rest.
- **Casing** — all-caps display, overlines, and buttons; tracked out; never ending in a period.

## Assets
- `assets/GPS-logo-main-purple.png` — header logo (white variant included for dark surfaces)
- **GPS double-chevron** — inline SVG `<symbol id="gpsChev">`; the brand forward-CTA mark. Never substitute a horizontal arrow or single chevron.
- **Fonts** — Avenir Next LT Pro, inlined in the standalone. In a rebuild, self-host from the design system's `fonts/`. Licensed brand font — do not substitute Inter, Roboto, or a system stack.
- No icon library. Only the chevron glyph, a back chevron, and a checkmark, all inline SVG.

## Files in this bundle
| File | Role |
|---|---|
| `GPS Gifting Program Selector.html` | **Deployable standalone.** Rename to `index.html`. Compiled — do not hand-edit. |
| `Gifting Program Selector.dc.html` | **Editable source.** Authoritative for all logic and copy. |
| `support.js` | Runtime referenced by the source file (already inlined into the standalone) |
| `colors_and_type.css` | GPS design tokens + `@font-face` rules |
| `assets/` | GPS logos |

**Reading order:** this README's recommendation-engine section → the `evaluate()`, `sequence()`, and `products()` methods in `Gifting Program Selector.dc.html` → the rest of this README for visual spec.
