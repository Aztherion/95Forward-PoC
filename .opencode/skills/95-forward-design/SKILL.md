---
name: 95-forward-design
description: Use for ALL 95 Forward UI work — an AI-guided, relationship-based major-gifts fundraising workspace embedded as an add-on inside the quiet Keystone CRM host. Contains the design tokens (color, type, spacing, elevation, motion), the host-vs-95-Forward emphasis registers, the component primitives, and the coach's copy voice. Load this before building or styling any interface in this repo or any later initiative.
license: MIT
compatibility: opencode
metadata:
  canonical-handoff: 95-forward-design-system-handoff/project
  ported-tokens: apps/web/src/styles
  ported-components: apps/web/src/components/ds
---

# 95 Forward — design skill

An opinionated, AI-guided workspace for **relationship-based fundraising**. A _coach in
software_, not a donor database. The copilot **proposes; the human decides** — always
provisional (approve / edit / dismiss), always with provenance, never sci-fi (no glow,
sparkles, or gradients standing in for "intelligence").

**The soul of this brand is transparency + warmth + calm focus.**

## Sources of truth (read these; do not invent tokens)

- **Canonical handoff** — `95-forward-design-system-handoff/project/`
  - `readme.md` (full brand guide), `styles.css` (entry point), `tokens/*.css`
    (colors, typography, spacing, elevation, motion, base), `fonts/fonts.css`,
    `guidelines/*.card.html` (specimens), `components/core` + `components/fundraising`
    (reference `.jsx`), `ui_kits/workspace` (click-through reference shell), `assets/*.svg`.
- **Ported, production tokens** — `apps/web/src/styles/` (`tokens.css`, `fonts.css`,
  `register.css`). These are a faithful 1:1 port of the handoff token CSS.
- **Ported TSX primitives** — `apps/web/src/components/ds/` (Button, Badge, Tag, Avatar,
  Card, Input, RoleChip, HorizonTag, SourceTag, Heartbeat, Logo).
- **Live gallery** — run the web app and open `/styleguide` to see every primitive in
  both registers.

When this skill and any prose differ on a design specific, **the handoff wins**.

## The two emphasis registers (this product's core idea)

One token system, two emphasis registers driven by route:

- **Host register (quiet/grey)** — the Keystone CRM host chrome and host routes
  (`/`, `/constituents`, `/revenue`, `/major-giving`, `/lists`, `/marketing`,
  `/events`, `/volunteers`, `/memberships`, `/analysis`, `/settings`). Muted ink accents,
  no brand color emphasis. Deliberately recessive so the add-on stands out.
- **95 Forward register (alive/full-color)** — the `/95-forward/*` routes. The full
  "Altitude" palette: horizon blue, dawn gold, sage, reserved iris. Confident and warm.

Resolve a route's register with `resolveRegister(pathname)` from `@95forward/shared`
and set `data-register="host" | "95-forward"` on the route-group layout wrapper.
`apps/web/src/styles/register.css` maps `--reg-*` semantic variables per register.

## Color (handoff: tokens/colors.css)

- Primary / Relationship Manager: **Horizon Blue** `#235C86`.
- Go / momentum / Today: **Dawn Gold** `#C8862A` — the single emphasis color; spend it
  sparingly (the 90+ "go" prospect, the next right move).
- Natural Partner / success / the door: **Sage** `#3B7458`.
- AI / copilot (reserved — never on human-entered data): **Iris** `#4A4F94`.
- QPI five parts: Capacity (blue), Relationship (sage), Timing (gold), Gift History
  (iris), Philanthropy (teal `#2F7E8C`).
- Horizons near→far: Today (gold) → Tomorrow (blue) → Forever (deep iris).
- App surface is **haze** `#F7F9FA` (cool off-white, never cream). Ink is warm slate-blue,
  never pure black. **Unknown** is neutral ink + dashed border — never red.

## Type (handoff: tokens/typography.css, fonts/fonts.css)

- **Hanken Grotesk** — all UI & body.
- **Newsreader** (serif) — human moments only (the ask, big quotes). Never UI chrome.
- **IBM Plex Mono** — evidence/provenance: citation tags, IDs, raw scores.
- The QPI number is Hanken 800 (heavy), tabular, display size — the one place type goes
  big; 90+ renders in dawn gold. Numbers are tabular everywhere (`--num-tabular`).

## Spacing, radii, motion

- 4px base grid. Radii are gentle (`--radius-md: 10px`, cards `14px`); pills reserved for
  badges/tags and the cadence chip. Cards = hairline + a quiet lift, not heavy shadows.
- Motion is "purposeful, never frantic." Signature is the **heartbeat**
  (`f95-heartbeat`, 2.6s pulse) on cadence indicators. Everything respects
  `prefers-reduced-motion`.

## Copy voice — a coach: plain, encouraging, dignified

- Speak to the fundraiser as "you"; the AI is "your copilot" / "Copilot".
- Active, concrete verbs: "Plan the visit", "Log the ask", "See inside the score".
  Avoid "Submit", "Manage", "Details".
- Empties & unknowns are **invitations, not errors**: "Unknown — worth researching",
  "No research yet — add what you know."
- Sentence case everywhere; the only uppercase is the small letter-spaced eyebrow/overline
  meta label. Tabular numbers. **No emoji, ever.** Icons are quiet Lucide line icons
  (~1.8px stroke), supporting text, rarely alone.

## When invoked without guidance

Ask what to build, then act as an expert designer who outputs production TSX (preferred in
this repo) using the ported tokens and primitives — never hard-coded hex or invented tokens.
