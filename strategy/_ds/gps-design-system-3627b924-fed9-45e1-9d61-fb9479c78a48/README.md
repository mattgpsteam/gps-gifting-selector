# GPS Design System

**Global Promotional Sourcing (GPS)** — 25-year-old, woman-owned, Las Vegas-based loyalty-solutions partner for the casino and gaming industry. The only all-in-one provider of loyalty solutions for casinos. $200M+ marketing partner to top casino groups; NWBOC-certified; 100% on-time delivery rate.

- **Tagline:** *Casino Gifting Solutions*
- **Mission:** Consistently provide an exceptional experience for our clients and their guests through tailored loyalty solutions.
- **USP:** For experienced casino marketers seeking a trusted partner, GPS is the **ONLY** all-in-one provider of loyalty solutions.

## Products / brands represented

1. **GPS (parent brand)** — full-service loyalty / promotional sourcing partner. Logos: purple wordmark with "casino gifting solutions" lock-up.
2. **ezGIFT®** — GPS's flagship digital gifting platform: custom-branded online stores where casino guests redeem points for gifts. Sub-programs include **365 by ezGIFT** (24/7 rewards), **VIP Gift Program**, and **Tier Reward** programs. Logos include "Powered by GPS" lock-ups.

## Sources used

- `uploads/2025_GPS-BrandGuide-OneSheet.pdf` — colors, fonts, logo rules (primary source)
- `uploads/ezGIFT_Comparison Chart-Final2025.pdf` — product positioning copy
- `uploads/ezGift_CaseStudy_365Rewards.pdf`, `uploads/ezGift VIP Case Study.pdf`, `uploads/Tier Reward Case Study.pdf` — tone, stats, layout reference
- 30+ GPS + ezGIFT logo variants (PNG + SVG) in `assets/logos/`
- Avenir Next LT Pro font family (28 weights/styles) in `fonts/`

## Sources not loaded (flag to user)

The following were listed in the attachment manifest but did not arrive in the filesystem and should be re-uploaded if available:

- `2025_GPS-BrandGuide_ForMarketing.pdf` — the **long-form** brand guide (would unblock much more detail on tone, imagery, photography direction, do/don'ts)
- `2025_GPS_MasterTemplate.pptx` — GPS slide master
- `ezgift_Overall_Deck_2026.pptx` — ezGIFT sales deck
- `ezGIFT-Logo-R.ai`, `2027-BuyersGuide_LinkedIn.ai` — source Illustrator files

---

## Content fundamentals

**Voice.** Confident, warm, partnership-oriented. GPS positions themselves as an extension of the client's team, not a vendor. Copy leans on proof (25 years, 100% on-time, $200M+, named stats) rather than adjectives.

**Point of view.** Third-person about GPS ("We act as an extension of your team"). Second-person *you/your* when addressing the client ("your guests," "your top players"). Never first-person singular.

**Sentence rhythm.** Short declaratives punched against longer supporting lines. Em-dashes and compound sentences for flavor. Characteristic cadence:
- "We don't just take orders. We take ownership."
- "Women-owned. Las Vegas-based. In the trust business since 2001."
- "They get a partner invested in their success from day one."

**Casing.**
- Headlines: Title Case or ALL CAPS for display (e.g. `THE FUTURE OF CASINO GIFTING IS DIGITAL`). Wide letter-spacing on all-caps.
- **All-caps headlines never end with a period.** Drop the terminal period on any display/headline set in uppercase (`KEEP PLAYERS COMING BACK`, not `KEEP PLAYERS COMING BACK.`). Sentence-case body copy and pull quotes keep normal punctuation.
- Section labels / overlines: ALL CAPS, tracked out (`SOLUTION`, `RESULTS`, `CHALLENGE`).
- Product marks: `ezGIFT®` — lowercase `ez`, uppercase `GIFT`, registered symbol. Always include the ®.
- `GPS` — always uppercase, never "Gps" or "gps".

**Emoji.** Not used. Case studies use bullet points (`•`) and inline stat chips instead. Keep emoji out of UI and decks.

**Unicode / typographic marks.** Curly quotes (`"" ''`), em-dash (`—`), and bullet (`•`) are all in the brand character set. `®` on product names.

**Numbers.** Play-up stats loudly. Case studies foreground percentages and dollar figures in oversized type (`80%`, `$50 MILLION`, `225%`). Use condensed weights for these.

**What we don't say.** "Revolutionary," "cutting-edge," emoji-driven hype, hedges like "may" / "could." The tone is *earned*, not hyped.

## Visual foundations

**Color.** A purple-driven palette:
- **Pantone 268 C — `#582c83`** (primary deep purple) — logos, headlines, buttons, accents, inverse backgrounds.
- **Pantone 264 C — `#bda3e2`** (secondary light purple) — highlights, pull-quote borders, soft washes, supporting typography on dark, tagline lock-ups.
- **Bright purple — `#8208d1`** — a saturated accent for CTAs, emphasis words, and glow moments on dark. Replaces the old neon purple.
- **Deep purple — `#2e034a`** — a near-black brand purple that can stand in for black on dark surfaces and backgrounds.
- **White** and **black** round out the palette. No non-purple brand hues.
A derived 50-900 purple ramp and a neutral grey ramp live in `colors_and_type.css` for UI needs.

**Type.** Avenir Next LT Pro across the board — Regular / Medium / Demi / Bold for most UI, plus Light / Thin for airy display moments and Condensed for stat callouts. **Bold (700) is the maximum weight — Heavy/Black (800+) is never used**, including in headlines and display. No secondary typeface; hierarchy is achieved through weight + size + case rather than family mixing.

**Backgrounds.** Predominantly **white** or **very pale purple wash** (`#faf8fd`). Dark sections use **solid deep purple** (`#582c83`) or a subtle purple-to-darker-purple gradient. No repeating patterns, no grain, no hand-drawn textures. Full-bleed photography appears in case-study covers — typically warm, aspirational lifestyle / casino-guest imagery.

**Gradients.** Used sparingly: 135° deep-purple gradient for hero panels, light-to-primary purple soft-gradient for accent strips. Avoid rainbow or multi-hue gradients.

**Imagery direction.** Warm, human, aspirational — guests enjoying experiences, real products (gifts, apparel, technology), casino environments. Not cool-toned, not desaturated, not heavily filtered. Photography is treated as a full-bleed hero or a clean rectangular placement with generous margin — never collaged.

**Iconography.** See ICONOGRAPHY section.

**Corner radii.** Medium-soft. Cards ~10–14px, buttons ~6–10px, pills fully rounded, images 10–14px. Nothing pin-sharp (0px) or overly bubbly (>28px) in product UI.

**Cards.** White surface, subtle border (`#e7e6eb`) or soft shadow (`--sh-2`), 10–14px radius, generous internal padding (`--sp-6` to `--sp-8`). Purple left-accent strips are **avoided** — GPS's own case-study layouts instead use an overline label (tracked uppercase in purple) above a heading.

**Shadows.** Low-contrast, purple-tinted (`rgba(31, 15, 49, 0.06–0.14)`). Elevations 1–4 provided as `--sh-1` through `--sh-4`, plus a `--sh-brand` for purple glow on primary CTAs.

**Borders.** 1px solid. Subtle (`--grey-200`) for surface divisions, strong (`--grey-300`) for form fields, brand (`--gps-purple-light`) for emphasis.

**Transparency / blur.** Used rarely. Acceptable: purple at 8–14% alpha over white for hover/press washes, soft 20% white over dark hero imagery for readability scrims. Avoid heavy glassmorphism.

**Buttons.** Labels are **UPPERCASE**, Bold (700), with ~0.08em tracking, and **center-aligned** — echoing the brand "LET'S CONNECT »" lockup. CTAs that point forward use the **brand double-chevron** glyph (the tall, narrow filled `»` from `ButtonAsset 1.svg`, ~0.62:1 width:height), never a long horizontal arrow or single chevron. Primary = solid Pantone 268 C on white text; secondary = 2px purple outline on white; ghost = transparent; dark = `#2e034a`. Radii ~6–10px; an optional fully-rounded pill variant exists.

**Hover states.** Primary buttons darken the purple (`--purple-700`), secondary/ghost buttons fill to `--purple-50` or add a 1px `--border-brand`. Links gain an underline. Images lift with `--sh-3`.

**Press states.** Slight inward feel: scale to 0.98 or shift to `--purple-800`. No exaggerated bounce.

**Motion.** Calm and confident. Standard duration 200ms with `cubic-bezier(0.22, 0.61, 0.36, 1)` for easing out. No elastic bounces, no spring overshoot. Fades and short vertical translates (8–16px) for content entry.

**Layout rules.** Generous margins; hero sections use 80–128px vertical padding. Headlines left-aligned by default. Stat-forward sections center-align. Fixed elements: top nav stays pinned, CTAs persistent in hero.

**Vibe.** Trusted, tailored, confident. Mid-weight luxury with a casino-industry sensibility — polished, not flashy. The deep purple does the work; the system stays out of the way.

## Iconography

GPS's brand materials are **not icon-heavy**. Case studies and the brand guide rely on typography, photography, and big statistics instead of a dense icon system. There is no proprietary GPS icon font.

- **Approach:** minimal, utilitarian. Icons exist to support UI affordances (navigation, actions, form inputs) — not decoration.
- **Style we recommend:** **Lucide** (clean 1.5–2px stroke, rounded joins) at CDN `https://cdn.jsdelivr.net/npm/lucide@latest`. Matches the Avenir Next geometry and the modest brand tone. *Flagged as substitute — no source system was provided.*
- **Check marks in the ezGIFT comparison chart use a heavy fill-style check — we mirror that with a solid purple circle containing a Lucide `check` when a "feature hit" treatment is needed.
- **QR codes** appear on most printed one-sheets — treat them as a design primitive for deck/print layouts.
- **Emoji:** not used. **Unicode as iconography:** only `•` (bullet), `—` (em dash), and `®` (registered).

---

## File index

```
README.md                              ← you are here
SKILL.md                               ← Agent-Skills entry point (drop into Claude Code)
colors_and_type.css                    ← tokens, semantic classes, font-face rules

assets/logos/                          ← all GPS + ezGIFT logo lockups (purple / lightpurple / white)
fonts/                                 ← Avenir Next LT Pro — 20 weights/styles

preview/                               ← small HTML specimens (rendered in Design System tab)
  colors-brand.html                    brand swatches (268 C, 264 C, bright, deep, white, black)
  colors-purple-scale.html             derived 50–900 purple ramp
  colors-neutrals.html                 purple-cast grey ramp
  colors-semantic.html                 fg roles + status colors
  colors-gradients.html                brand gradient set
  type-family.html                     Avenir weight ladder
  type-display.html                    hero tier
  type-headings-body.html              H1–H4, body, caption
  type-utility.html                    overline, stat, caption
  spacing-scale.html                   4px base spacing
  spacing-radii.html                   border radii
  spacing-shadows.html                 elevation 1–4 + brand glow
  components-buttons.html              primary / secondary / ghost / dark
  components-inputs.html               text, select, validation, checkbox
  components-badges.html               badges, overlines, stat chips
  components-cards.html                surface, wash, dark, feature
  brand-logos-gps.html                 GPS logo lockups
  brand-logos-ezgift.html              ezGIFT logo lockups
  brand-voice.html                     signature quote + do/don't

ui_kits/
  gps-marketing/index.html             corporate site (nav, hero, stats, solutions,
                                       case studies, quote, CTA, footer)
  ezgift/index.html                    player storefront (points balance, catalog,
                                       gift detail, cart, checkout)

slides/index.html                      7-slide 16:9 deck (title, section, stats,
                                       content, comparison, quote, closing)
slides/deck-stage.js                   slide-deck web component (scaling, keyboard)
```
