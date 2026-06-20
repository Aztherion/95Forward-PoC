# 95 Forward — Design System

An opinionated, AI-guided workspace for **relationship-based fundraising** at nonprofits. Not a donor database, not a generic CRM — a *coach in software* that walks a major-gift fundraiser through one disciplined method: find the right people, prioritize them honestly, learn enough to matter, go have the conversation, make the ask, and follow up fast. An AI copilot runs through every step, but **it always proposes and the human always decides.**

> **The thesis, in one line:** a calm, confident coach that shows its work — warm enough to be about people and mission, transparent enough that you trust every number it puts in front of you, focused enough that you always know what to do next.

The product is currently **unnamed**; *95 Forward* is the company. The underlying "For Impact" methodology is trademarked and the partnership posture is undecided, so **no "For Impact®" wordmark is baked into this identity** — it is method-neutral and ownable.

---

## Sources & provenance

This system was built **from a written brand brief**, not from an existing codebase, Figma file, or screenshots. There were no pre-existing brand fonts, colors, logos, or product UI to mine. Everything here — palette, type, the logo mark, every component — is an **original proposal derived from the method's own world** (the ranked list, the QPI score, the two roles, the funding horizons, the 24-hour heartbeat, the Altitude framework). Treat it as a confident v1 to react to, not a recreation of something that already exists.

- No GitHub repo, no Figma link, no slide deck were attached.
- Fonts are loaded from **Google Fonts CDN** (see "Substitutions" below).
- Icons are **Lucide**, loaded from CDN.

---

## The two registers (the hardest design problem here)

One coherent system serves two very different modes, with an AI woven through both. **Shared tokens, two densities, one voice.**

- **Register A — Portfolio & analysis** (ranked list, prospect profiles, Green Sheet): information-rich but calm and prioritized. Unmistakable hierarchy, comfortable density. A focused cockpit where the next move is obvious — not a wall of columns.
- **Register B — In the moment** (the live-visit companion, the ask): stripped-down, quiet, large readable type, low chrome. Present at your side but never dominating a human conversation. A calm prompt, not a teleprompter.

See `ui_kits/workspace/` for both registers in one click-through app.

---

## CONTENT FUNDAMENTALS — how 95 Forward writes

The copy is **a coach's voice: plain, direct, encouraging, dignified.** It lowers the anxiety of asking for money by reframing the work as helping people fund something they already care about. Never salesy, never pushy, never "crush your quota."

- **Voice & person.** Speaks *to* the fundraiser as "you," and refers to the copilot as "your copilot" / "Copilot." Warm but never chummy. The product has a point of view and nudges toward the right action.
- **Active, concrete verbs.** Buttons and prompts are imperatives: "Plan the visit," "Log the ask," "Follow up by tomorrow," "See inside the score," "Add what you know." Avoid vague labels ("Submit," "Manage," "Details").
- **Consistent action vocabulary across a flow.** The button that says **"Log the ask"** leads to a confirmation that says **"Ask logged."** Verb in, verb back.
- **Empties & unknowns are invitations, not errors.** Never a blank field or a red warning for missing data. Write *"Unknown — worth researching"*, *"No research yet — add what you know."* A gap is a research opportunity; "Unknown" is **honorable**.
- **Transparency in the words, too.** The copilot's microcopy admits it's provisional: *"Copilot suggests…," "The copilot proposes this score. You decide."* Source tags are factual and terse: `IRS 990-PF · 2024`.
- **Encouraging, not gushing.** "Goal met — nicely done." "Fast and good beats slow and perfect." Momentum language, calm not frantic.
- **Casing.** Sentence case everywhere (headings, buttons, labels). The only uppercase is the small letter-spaced **eyebrow/overline** meta labels (e.g. `QUALIFIED PROSPECT INDEX`). Numbers are tabular.
- **No emoji.** None, anywhere. The tone is dignified and professional; warmth comes from words and color, not emoji. Icons are quiet line icons (Lucide), never decorative.
- **Examples.**
  - Title: *"Your next right move"* · *"Master Prospect List"* · *"The discipline"*
  - Button: *"Plan the visit"* · *"Log a touch"* · *"Adjust the score"*
  - Empty: *"Unknown — worth researching"* · *"No contact yet"*
  - AI: *"Capacity looks higher than recorded — this foundation gave $1M+ to peers last year."*
  - The ask (Register B, serif): *"Would you consider a gift of $250,000 to name the new youth wing?"*

---

## VISUAL FOUNDATIONS

The aesthetic is **"Altitude"** — warm + credible, with **transparency (legibility) as the soul.** It reads invested-in and modern without tipping into lavish/corporate-cold or charity-cliché. It deliberately avoids the AI-design defaults the brief called out: no warm-cream + high-contrast serif + terracotta; no near-black + acid accent; no zero-radius broadsheet hairlines; no bluish-purple gradients, sparkles, or glow standing in for "intelligence."

### Color
Derived from the horizon and elevation: a **warm slate-blue ink** ("the ground"), a **horizon blue** primary, a **dawn-gold** "go" light for the 90+ prospect, a **sage** for the warm path, and a **reserved iris** that is *only ever* the AI/copilot voice. Surfaces sit on an **atmospheric haze** (a faint cool-warm off-white — `#F7F9FA`), kept slightly cool to stay clear of the cream cliché. See `tokens/colors.css` and the Colors cards.
- **Primary / Relationship Manager:** Horizon Blue `#235C86`.
- **Go / momentum / Today:** Dawn Gold `#C8862A` — energizing, never alarming. The single emphasis color; spend it sparingly.
- **Natural Partner / success / the door:** Sage `#3B7458`.
- **AI / copilot (reserved):** Iris `#4A4F94` — never used for human-entered data.
- **QPI five parts:** Capacity (blue), Relationship (sage), Timing (gold), Gift History (iris), Philanthropy (teal `#2F7E8C`).
- **Horizons:** Today (gold) → Tomorrow (blue) → Forever (deep iris) — a near→far progression.
- **Unknown:** neutral ink on haze with a **dashed** border — never red.

### Type
Three voices (see `tokens/typography.css`):
- **Hanken Grotesk** — warm humanist grotesque, carries *all* UI and body. Credible and friendly at once.
- **Newsreader** — low-contrast humanist serif, **reserved for human moments only**: the ask, big quotes, "the conversation." It is never UI chrome. This is what keeps Register B feeling humane.
- **IBM Plex Mono** — the **evidence** voice: citation/source tags, IDs, raw scores. Mono = provenance.
- **The score figure:** the QPI number is Hanken **800 (heavy)**, tabular, at display size — the one place type goes big. 90+ renders in dawn-gold.
- Tabular, lined figures everywhere numeric (`--num-tabular`) so score columns align.

### Spacing, radii, borders
- **4px base grid** (`tokens/spacing.css`). Register A leans on the 8/12/16/24 steps; Register B opens up with 32/40/64 and ≥44px touch targets.
- **Radii are gentle and consistent** (`--radius-md: 10px` default; cards `14px`). Present but never sharp-broadsheet, never pill-soft everywhere. Pills are reserved for badges/tags and the cadence chip.
- **Borders** are hairlines (`--ink-100`) for structure, `--ink-200` for controls. Cards are defined by **a hairline + a quiet lift**, not a heavy drop shadow.

### Shadows & elevation
Ink-tinted (never pure black), soft, low, layered (`tokens/elevation.css`). `--shadow-sm` for cards at rest, `--shadow-md` on hover/raised, `--shadow-lg/xl` for popovers/dialogs. The **one** energizing exception is `--ring-go` — a soft warm ring on 90+ "go" states. No neon, no glow-as-intelligence.

### Backgrounds & texture
Flat, calm surfaces. **No photographic backgrounds, no full-bleed imagery, no repeating patterns or grain.** The only gradients used are *meaningful*: the faint top-light on the "next move" callout (gold-50 → white) and the near→far horizon swatch. Imagery, if ever added, should be warm and human (people and mission) — but the system ships imagery-free by design and uses `<image-slot>`-style placeholders when a real photo is needed.

### Motion
"Purposeful & in motion" — momentum, never frantic (`tokens/motion.css`). Calm `ease-out` entrances (`f95-rise`, 6px lift + fade). The signature motion is the **heartbeat** (`f95-heartbeat`, a 2.6s pulse) on cadence indicators — the 24-hour follow-up made *felt*. QPI parts stagger-rise when the score opens. **No bounce, no infinite decorative loops, no spectacle.** Everything respects `prefers-reduced-motion`.

### States & interaction
- **Hover:** surfaces lift (`translateY(-1px)` + `shadow-md`); buttons darken one step; ghost/secondary fill with haze.
- **Press:** a 0.5px nudge down + the darkest color step (no shrink-bounce).
- **Focus:** a 3px blue ring (`--ring`); the gold ring (`--ring-go`) on go-variant controls.
- **AI / provisional:** iris-tinted surfaces and inputs, with a left accent stripe — visibly *not yet committed*. Always paired with approve / edit / dismiss.

### The signature moment
The **QPIScore** (`components/fundraising/QPIScore.jsx`): a 0–100 number that **opens to reveal its five parts and the reasoning + source behind each.** The thesis made into one component — a number you can see inside, that respects the fundraiser's judgment and lets them adjust it. Boldness is spent here; everything around it stays quiet.

---

## ICONOGRAPHY

- **Library:** **[Lucide](https://lucide.dev)** (CDN: `unpkg.com/lucide`). Chosen for its quiet, humanist line style — consistent **~1.8px stroke**, rounded caps/joins, no fills. It matches the warm-but-credible tone and never feels techy or playful.
- **Usage:** line icons only, stroke `1.8`, sized 15–20px in UI chrome, colored with ink tokens (`--ink-400`/`--ink-500`) or a semantic accent when meaningful. Icons support text; they rarely stand alone.
- **No emoji, ever.** No unicode dingbats as icons. No multicolor/filled icon sets.
- **Custom marks:** the only bespoke vector art is the **brand mark** and the small role/horizon glyphs baked into `RoleChip` (a door) and `HorizonTag` (sun → ring), which carry meaning the icon set can't. These are intentional and minimal — not decorative illustration.
- **In `assets/`:** `mark.svg` (app-icon mark), `logo-horizontal.svg` (mark + wordmark, light), `logo-on-dark.svg` (for ink backgrounds). The mark is a rising chevron (forward + up = altitude) with a dawn-gold point of light.

---

## Index / manifest

**Root**
- `styles.css` — the single entry point consumers link (`@import` lines only).
- `readme.md` — this guide. · `SKILL.md` — Agent-Skills-compatible entry.

**`tokens/`** — `colors.css` · `typography.css` · `spacing.css` · `elevation.css` · `motion.css` · `base.css` (resets). All reachable from `styles.css`.

**`fonts/`** — `fonts.css` (Google Fonts: Hanken Grotesk, Newsreader, IBM Plex Mono).

**`assets/`** — `mark.svg` · `logo-horizontal.svg` · `logo-on-dark.svg`.

**`guidelines/`** — foundation specimen cards (Design System tab): Colors (brand, ink, neutrals, QPI parts, horizons, states, human-vs-AI), Type (headings, body, the human moment, provenance mono, the score figure), Spacing (scale, radii, elevation), Brand (logo, cadence heartbeat).

**`components/core/`** — `Button` · `Badge` · `Tag` · `Avatar` · `Card` · `Input`.
**`components/fundraising/`** — `QPIScore` (the signature) · `RoleChip` (Manager vs Partner) · `HorizonTag` · `SourceTag` · `AISuggestion` · `ProspectRow`. Each has a `.jsx`, `.d.ts`, and `.prompt.md`; each directory has one `@dsCard` showcase.

**`ui_kits/workspace/`** — the click-through product. `index.html` boots it; `Shell.jsx` (sidebar, topbar, Lucide `Icon`), `MasterList.jsx`, `ProspectProfile.jsx`, `GreenSheet.jsx`, `VisitCompanion.jsx` (Register B), `App.jsx`, `data.js`. Flow: ranked list → profile (QPI opens) → Green Sheet → visit mode → log the ask → 24-hour follow-up.

> **Bundle note:** component cards and the UI kit load the compiler-generated `_ds_bundle.js` and read components from `window.Ds95ForwardDesignSystem_31a0c4`. The bundle is regenerated automatically; do not hand-edit it.

---

## Substitutions to confirm

- **Fonts are proposed, not brand-owned.** Hanken Grotesk / Newsreader / IBM Plex Mono are loaded from Google Fonts and are easy to swap. If 95 Forward licenses brand faces, drop the binaries into `fonts/` and update `fonts/fonts.css` + `--font-sans/serif/mono`.
- **Logo is an original v1 proposal.** The mark and wordmark were created here (no logo existed). Treat as a starting point for a real brand exploration.
- **Icons:** Lucide via CDN. If an offline/self-hosted set is required, vendor the SVGs into `assets/icons/`.
