# 95 Forward — Design System (as built)

**Source of truth for all UI work.** Reconstructed from the running code in `apps/web`, because the
original Claude Design project is no longer accessible and the surviving export in
`95-forward-design-system-handoff/` has drifted from what ships (§8.6).

This document describes **what exists**, not what should. Where the code is inconsistent, §8 says so
rather than picking a winner. If you change the UI, update this file in the same PR.

Every claim carries a file path. Counts are grep-verified against `f1f06ba` — treat them as a
snapshot, not a guarantee.

---

## 1. Stack and where things live

Hand-written **plain global CSS** with BEM-ish `f95-*` / `shell-*` class names, over **CSS custom
properties**. There is **no Tailwind, no PostCSS config, no CSS Modules, no CSS-in-JS, no component
library, and no TypeScript token module** — `apps/web/package.json` lists only `lucide-react`,
`recharts` (added by I17b for the one chart — §10.1), `next`, `react`, `drizzle-orm`,
`graphile-worker` and the Auth0 SDK as runtime deps. All styling
ships through one entrypoint imported exactly once, at `apps/web/src/app/layout.tsx:4`. **Dark mode
does not exist** in any form. The only theming axis is a two-value _register_ (§6.5).

| File                                                     | Defines                                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/styles/globals.css`                        | The only stylesheet entrypoint; `@import`s 6 token files + 8 stylesheets in fixed order                                                 |
| `apps/web/src/styles/tokens/colors.css`                  | 87 colour properties — 42 raw ramp values + 45 semantic aliases, all on bare `:root`                                                    |
| `apps/web/src/styles/tokens/typography.css`              | Families, 14 sizes, 5 weights, 4 line-heights, 5 letter-spacings, 8 composite `--text-*` roles, 3 utility classes                       |
| `apps/web/src/styles/tokens/spacing.css`                 | 13 spacing steps, layout sizes, control heights                                                                                         |
| `apps/web/src/styles/tokens/elevation.css`               | Radii, border widths, 5 shadows, 2 focus rings                                                                                          |
| `apps/web/src/styles/tokens/motion.css`                  | Durations, easings, 3 keyframes, global reduced-motion block                                                                            |
| `apps/web/src/styles/tokens/base.css`                    | Reset, `body` defaults, global `:focus-visible` ring                                                                                    |
| `apps/web/src/styles/register.css`                       | 7 `--reg-*` aliases per register — the only conditional token values in the codebase                                                    |
| `apps/web/src/styles/ds.css` (1020 ln)                   | Button, Badge, Tag, Avatar, Card, field/Input, RoleChip, HorizonTag, SourceTag, Heartbeat, ProvisionalSuggestion, QpiScore, `.f95-prow` |
| `apps/web/src/styles/ds-data.css` (1029 ln)              | DataTable, Pagination, Select, Checkbox, Switch, Tabs, EmptyState, Textarea, FieldGroup/FormRow, filter bar, and all layout primitives  |
| `apps/web/src/styles/warroom.css`                        | **I17b** — health triad, rule chip, mono caption, milestone/scenario badges, initiative dots, metric block, TabNav, chart frame (§10)   |
| `apps/web/src/styles/shell.css`                          | App shell, sidebar, nav, topbar, `.page-placeholder`, `.styleguide`                                                                     |
| `apps/web/src/styles/{visit,jobtray,feedback,login}.css` | Visit mode overlay; background-job pill; feedback menu + the app's only modal; auth screens                                             |
| `apps/web/src/components/ds/`                            | 23 files exporting **24 components** via the `index.ts` barrel                                                                          |
| `apps/web/src/components/shell/`                         | `AppShell`, `Topbar`, `PagePlaceholder`, and `nav.ts` (the nav data)                                                                    |
| `apps/web/src/lib/format.ts`                             | The only shared display-formatting module (§7)                                                                                          |

Imports resolve through the `@/*` → `./src/*` alias (`apps/web/tsconfig.json`). Icons are
`lucide-react` throughout — sizes are keyed to the slot, see §5.12.

**Fonts** — three self-hosted `.woff2` families loaded with `next/font/local` in
`apps/web/src/app/layout.tsx:6-35`, bound to `--font-hanken` / `--font-newsreader` /
`--font-plex-mono` on `<html>`, which `tokens/typography.css:13-15` wraps as `--font-sans` /
`--font-serif` / `--font-mono`.

**Live gallery** — `/styleguide` (`apps/web/src/app/styleguide/page.tsx`), gated by
`NODE_ENV !== "production"` plus the global auth middleware. It demos **11 of the 24** exported
components (§8.5).

---

## 2. Colour

`tokens/colors.css`. Components reference the **semantic aliases**, not the raw ramps.

### Raw ramps

| Ramp         | Values                                                                                                                                              | Role per the token file                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Haze         | `--haze-50 #f7f9fa` · `100 #eff2f4` · `200 #e3e8ec` · `300 #cdd6dd` · `--white #ffffff`                                                             | App background, sunken surfaces, hover fills |
| Ink          | `--ink-900 #16202b` · `800 #20303f` · `700 #2b3e4f` · `600 #44586a` · `500 #5c7081` · `400 #7e909f` · `300 #a7b4be` · `200 #c9d2d9` · `100 #e1e7eb` | Text (900→400), borders (300→100)            |
| Horizon blue | `--blue-700 #1a3f5c` · `600 #235c86` · `500 #3878a3` · `300 #8fb7d2` · `100 #dceaf3` · `50 #eef5fa`                                                 | Brand; Relationship Manager / ownership      |
| Dawn gold    | `--gold-700 #a56f1e` · `600 #c8862a` · `500 #dfa13c` · `300 #ebc684` · `100 #f7e9cd` · `50 #fbf4e4`                                                 | Momentum, "go see them today"                |
| Sage         | `--sage-700 #2d5c46` · `600 #3b7458` · `500 #4e8f6f` · `300 #9cc6b1` · `100 #dcebe2` · `50 #edf5f0`                                                 | Natural Partner role; success                |
| Iris         | `--iris-700 #393e80` · `600 #4a4f94` · `500 #5b61a8` · `300 #acafd6` · `100 #e6e7f4` · `50 #f1f2f9`                                                 | **Reserved for AI/copilot** (but see §8.2)   |
| Teal         | `--teal-600 #2f7e8c` · `--teal-100 #d7eaec`                                                                                                         | QPI "Philanthropy" dimension                 |
| Brick        | `--brick-600 #a8402f` · `--brick-100 #f1dbd6`                                                                                                       | Destructive / danger only                    |

### Semantic aliases — use these

| Token                                                                 | Resolves to               | Used for                                                                  |
| --------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| `--bg-app`                                                            | haze-50                   | `body`, `.shell`, `.f95-visit`                                            |
| `--surface-card` / `--surface-raised`                                 | white                     | Cards, sidebar, topbar, inputs, table wrap                                |
| `--surface-sunk`                                                      | haze-100                  | Empty states, settings notes, sunk cards                                  |
| `--text-strong` / `--text-body` / `--text-secondary` / `--text-muted` | ink-900 / 700 / 500 / 400 | Headings & values / body / meta & table headers / placeholders & eyebrows |
| `--border-hairline` / `--border-default` / `--border-strong`          | ink-100 / 200 / 300       | Card + row rules / control borders / hover borders                        |
| `--brand-primary` / `-hover` / `-press`                               | blue-600 / 500 / 700      | Primary button, links, active tab                                         |
| `--accent-go`                                                         | gold-600                  | The "go" CTA and 90+ emphasis                                             |
| `--text-on-accent`                                                    | white                     | Text on filled backgrounds                                                |

### Status palette — it exists, twice over

A red/amber/green triad is declared at token level: **`--color-success` (sage-600),
`--color-attention` (gold-600), `--color-danger` (brick-600), `--color-info` (blue-600)**
(`tokens/colors.css:98-101`). Deliberately muted — not saturated traffic-light colours.

**Three of those four aliases used to have zero references** — only `--color-danger` was consumed,
and what actually rendered was the `.f95-badge--*` tone classes and `.f95-heartbeat--*` state classes
reaching past the aliases for the raw ramps. **I17b gave them consumers**: the war-room health triad
(§10.2) is built on `--color-success` / `-attention` / `-danger`, and `.f95-heartbeat--*` was re-keyed
onto the same tokens without changing a rendered value. `--color-info` still has none.

`.f95-badge--*` continues to reach for the raw ramps and was deliberately left alone — it is the
table status pill, not a health, and rewiring 8 tones to serve 3 healths would have been a
refactor rather than a fix.

### Special-purpose palettes

| Palette          | Tokens                                                                                                                           | Rule of use (per token comments)                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Roles            | `--role-manager` (blue-600) + `-tint`; `--role-partner` (sage-600) + `-tint`                                                     | "Must never look alike" — enforced by _shape_ too: manager = filled pill, partner = dashed border + door glyph (`RoleChip.tsx`) |
| AI / copilot     | `--ai-ink` (iris-600), `--ai-surface` (iris-50), `--ai-tint` (iris-100), `--ai-border` (iris-300)                                | Copilot surfaces only                                                                                                           |
| Unknown          | `--unknown-ink` (ink-400), `--unknown-surface` (haze-100), `--unknown-border` (ink-200)                                          | "Honorable research gap, NOT an error" — always rendered with a **dashed** border                                               |
| Funding horizons | `--horizon-today` (gold-600), `-tomorrow` (blue-600), `-forever` (iris-700)                                                      | Near → far. Also carries a distinct SVG glyph per value, so the encoding is not colour-only                                     |
| QPI dimensions   | `--qpi-capacity` (blue-600), `-relationship` (sage-600), `-timing` (gold-600), `-history` (iris-600), `-philanthropy` (teal-600) | Five score parts                                                                                                                |
| QPI tier bands   | `--qpi-go` (gold-600, 90-100), `-strong` (blue-600, 70-89), `-build` (sage-600, 50-69), `-early` (ink-400, <50)                  | Thresholds in `packages/shared/src/qpi.ts:70-75`                                                                                |

> The two QPI palettes are consumed through **string-name indirection** — the token name is stored as
> a `varName` string and interpolated as ``var(`${varName}`)`` (`QpiScore.tsx:15-20`,
> `QpiBreakdown.tsx:8-14`). Grepping `var(--qpi-capacity)` finds nothing even though it renders.

### Colour outside the tokens

- **35 hard-coded colour literals** survive outside `colors.css` — 25 in CSS, 10 in TSX. Notably:
  `ds.css` writes `#fff` in 7 declarations (`:178,:182,:186,:445,:525,:529,:533`) while `--white`
  exists; `Avatar.tsx:14` hard-codes 5 uppercase hexes duplicating the blue/sage/gold/iris/teal-600
  ramp; `Mark.tsx:19,22,27` hard-codes `#235C86`, `#FFFFFF`, `#C8862A`. `ds-data.css`, `shell.css`,
  `visit.css`, `feedback.css`, `jobtray.css` and `login.css` contain **zero** raw hexes.
- **Shadows and focus rings are raw rgba by design** (`tokens/elevation.css:24-38`), ink-tinted
  rather than referencing a colour token.
- **6 custom properties are referenced but never defined** — see §8.1.

---

## 3. Typography

| Var            | Family                                     | Job                                                            |
| -------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `--font-sans`  | **Hanken Grotesk** (variable 100–900)      | All UI and body text                                           |
| `--font-serif` | **Newsreader** (variable 200–800 + italic) | Human moments only — the ask, discovery questions (Visit mode) |
| `--font-mono`  | **IBM Plex Mono** (400/500/600)            | Evidence: citation tags, QPI part scores, suggestion deltas    |

**Weights** `--fw-regular 400` · `medium 500` · `semibold 600` · `bold 700` · `heavy 800`.

**Sizes (px)** `--fs-micro 11` · `caption 12` · `small 13` · **`body 15` (default)** · `base 16` ·
`lg 18` · `xl 21` · `2xl 26` · `3xl 32` · `4xl 40` · `5xl 52` · `moment 28` · `score 64` ·
`score-lg 88`.

**Line heights** `--lh-tight 1.1` · `snug 1.25` · `normal 1.45` · `relaxed 1.6`.
**Letter spacing** `--ls-tight -0.02em` · `snug -0.01em` · `normal 0` · `wide 0.04em` ·
`caps 0.08em`.

### Composite roles and what consumes them

| Token            | Composition            | Consumers                                                                                           |
| ---------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `--text-h1`      | 700 / 32px / 1.1 sans  | `.f95-page__title`, `.f95-record-head__title`, `.page-placeholder__title`                           |
| `--text-h2`      | 600 / 26px / 1.25 sans | `.shell-topbar__title`, `.login__title`, styleguide register title                                  |
| `--text-h3`      | 600 / 21px / 1.25 sans | `.f95-section-title`, `.f95-settings__title`, `.f95-mg-stage__title`                                |
| `--text-title`   | 600 / 18px / 1.25 sans | `.f95-empty__title`                                                                                 |
| `--text-body-r`  | 400 / 15px / 1.45 sans | `body`, `.f95-table`, `.f95-input`, `.f95-textarea`, `.f95-select__el`, `.f95-check`, `.f95-switch` |
| `--text-label`   | 500 / 13px / 1.25 sans | `.f95-field__label`, `.shell-user__name`, `.f95-qpi__plabel`, job tray                              |
| `--text-caption` | 500 / 12px / 1.25 sans | `.f95-page__count`, record/table meta, hints, `.f95-stat__sub`                                      |
| `--text-display` | 700 / 40px / 1.1 sans  | **zero consumers**                                                                                  |

> **The composite roles are the minority.** Of 120 `font:` declarations across the 15 stylesheets,
> **48 use a `--text-*` token and 71 re-compose the shorthand inline** from `--fw-*`/`--fs-*`
> primitives (69 of those hard-coding the line-height as a bare number). Matching the surrounding
> file matters more than reaching for a composite role.

### Role map

| Role               | Declaration                                               | Where                                                                                            |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Page title         | `--text-h1` + `--ls-snug`                                 | `.f95-page__title` (`ds-data.css:451`)                                                           |
| Section heading    | `--text-h3`                                               | `.f95-section-title` (`ds-data.css:645`)                                                         |
| Eyebrow / overline | `600 / 11px / 1`, `--ls-caps`, uppercase, `--reg-eyebrow` | **One rule** since I25, in `tokens/typography.css` (§10.8)                                       |
| Table header       | `600 / 12px / 1.2`, `--ls-snug`, `--text-secondary`       | `.f95-table thead th` (`ds-data.css:15-25`)                                                      |
| Table cell         | `--text-body-r`                                           | `.f95-table` (`ds-data.css:9-14`)                                                                |
| Stat value         | `600 / 21px / 1.1`, tabular                               | `.f95-stat__value` (`ds-data.css:516-520`)                                                       |
| Big number         | `800 (heavy)`, `--ls-tight`, tabular                      | `.f95-qpi__num` 64px · `.f95-foil__value` 32px · `.f95-prow__rank .n` / `.f95-prow__qpi .v` 26px |
| Serif moment       | 400 serif, `--ls-snug`                                    | `.f95-visit__ask` 40px · `.f95-visit__prompt` 32px · `.f95-visit__q` 28px                        |
| Monospace          | `500 / 11px` or `13px`                                    | `.f95-src`, `.f95-qpi__pscore`, `.f95-prov__from/__to`, `.f95-weight__max`                       |

**Monospace is 11px or 13px everywhere** — there is still no mono role at body or label size.
Mono + `text-transform: uppercase` had **no rule anywhere** until I17b, which added exactly two, both
at `--fs-micro` and both with `--ls-wide` rather than `--ls-caps`: `.f95-rulechip` and `.f95-monocap`
(§10.3). Mono is already wide; 0.08em on a monospaced face reads as spaced-out, not as a label.

**Numerals** — `body` sets `font-feature-settings: var(--num-tabular)` (`"tnum" 1, "lnum" 1`)
globally (`tokens/base.css:21`), so everything is tabular by default. 12 numeric classes in
`ds-data.css` re-assert `font-variant-numeric: tabular-nums`. Two mechanisms, split cleanly by
stylesheet generation — §8.3.

**Zero consumers:** `--text-display`, `--fs-base`, `--fs-score-lg`, `--ls-normal`, `--lh-relaxed`,
and the `.f95-overline` / `.f95-num` utilities. `--fs-5xl` (52px) and `--ls-wide` were on this list
until I17b bound them — the dominant metric step and the mono caption respectively (§10.3, §10.5).

---

## 4. Spacing, radius, elevation, borders

### Spacing — 13 steps declared, 5 carry the app

`--space-0 0` · `1 4` · `2 8` · `3 12` · `4 16` · `5 20` · `6 24` · `7 32` · `8 40` · `9 48` ·
`10 64` · `11 80` · `12 96` (px).

**`--space-2 / 3 / 4 / 5 / 7` account for 147 of 160 total references.** Use them first:

> Counting rule: these figures count bare `var(--token)` references. Two `var(--token, fallback)`
> forms in `feedback.css` (`:28`, `:57`) are excluded; include them and `--space-5` and
> `--radius-sm` each gain one.

| Step               | Typical job                                                |
| ------------------ | ---------------------------------------------------------- |
| `--space-2` (8px)  | Chip clusters, action groups, `.f95-cluster` gap           |
| `--space-3` (12px) | List gaps, filter-bar gap, `.f95-statgrid` gap             |
| `--space-4` (16px) | Default stack gap, `.f95-page` gap, tile grids             |
| `--space-5` (20px) | Card padding (`.f95-card__pad`), sidebar padding           |
| `--space-7` (32px) | Page gutter, topbar gutter, `--content-gutter`, `pad="lg"` |

Three conventions coexist: `ds.css` is 19 token vs **51 raw-px** spacing declarations, `ds-data.css`
is the inverse (64 token vs 19 raw), `shell.css` is even (17 vs 16), and `login.css` / `jobtray.css`
use **zero** spacing tokens. Follow the file you are editing.

**Layout sizing** `--container-max 1320px` · `--sidebar-w 264px` · `--rail-w 72px` _(0 refs)_ ·
`--content-gutter var(--space-7)` _(0 refs)_.
**Control heights** `--control-sm 32px` · `--control-md 40px` (default) · `--control-lg 48px` ·
`--touch-min 44px` _(0 refs)_.

### Radius — 8 declared, 4 carry the app (46 of 49 references)

`--radius-xs 4` · `sm 6` · `md 10` · `lg 14` · `xl 20` _(0)_ · `2xl 28` _(0)_ · `pill 999px` ·
`circle 50%` _(0)_.

| Radius | Applied to                                                                      |
| ------ | ------------------------------------------------------------------------------- |
| `xs`   | Checkbox, `.f95-src`, focus-ring rounding                                       |
| `sm`   | `--btn--sm`, tags, pagination buttons, progress/bar tracks, suggestion delta    |
| `md`   | Buttons, inputs, selects, textareas, nav rows, `.f95-prow`, topbar icon buttons |
| `lg`   | **Cards**, table wrap, empty state, modal, login card                           |
| `pill` | Badges, horizon tags, role chips, switch track, heartbeat, job tray             |

### Elevation — shallow in practice

| Token          | Value                                 | Reaches the screen via                                                |
| -------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `--shadow-xs`  | `0 1px 2px /0.05`                     | **dead**                                                              |
| `--shadow-sm`  | `0 1px 2px /0.06, 0 1px 1px /0.04`    | **every `<Card>` in app code** — the `elevation` prop is never passed |
| `--shadow-md`  | `0 2px 4px /0.05, 0 4px 12px /0.07`   | two `:hover` rules only                                               |
| `--shadow-lg`  | `0 4px 8px /0.06, 0 12px 28px /0.10`  | feedback dropdown                                                     |
| `--shadow-xl`  | `0 8px 16px /0.08, 0 24px 56px /0.14` | the modal                                                             |
| `--inset-sunk` | `inset 0 1px 2px /0.05`               | `.f95-card--sunk`                                                     |
| `--ring`       | `0 0 0 3px rgba(56,120,163,.35)`      | 9 rules — global `:focus-visible` + every control                     |
| `--ring-go`    | `0 0 0 3px rgba(200,134,42,.28)`      | 2 rules — go button focus, `.f95-card--go`                            |

A card's edge is **hairline + quiet lift**, not a heavy shadow. Hover raises `sm → md` with
`translateY(-1px)`.

### Borders

All three width tokens (`--border-w`, `--border-w-2`, `--border-w-emph`) have **zero references** —
every border writes its width literally. Default is `1px solid var(--border-*)`. Exceptions that
carry meaning: checkbox `1.5px`; partner role chip `1.5px dashed`; active tab `2px` underline; card
AI accent and `.f95-prow` tier rail `3px` left border.

**Dashed borders are semantic** — they mark the "unknown / worth researching" state
(`.f95-badge--unknown`, `.f95-src--unknown`, `.f95-empty`, `.page-placeholder__empty`) and the
Natural Partner chip. Exactly **one** dashed _divider_ exists (`.f95-qpi__foot`, `ds.css:856`).

### Motion

`--dur-instant 80ms` · `fast 140ms` (all control hovers) · `base 220ms` (cards, chevrons) ·
`slow 360ms` (login entrance) · `deliberate 520ms` _(0 refs)_. Easings `--ease-out`, `--ease-in-out`,
`--ease-emph` _(0 refs)_. `--beat-period 2600ms` drives the cadence pulse. Keyframes
`f95-heartbeat`, `f95-rise`, `f95-reveal`. Four `prefers-reduced-motion` blocks kill animation and
transition durations globally.

---

## 5. Component patterns

24 components exported from 23 files in `apps/web/src/components/ds/` (barrel: `index.ts`). Every one
is a thin `className` string-builder over `f95-*` classes — no runtime styling.

### 5.1 Page shell and navigation — `components/shell/`

`AppShell` (`AppShell.tsx:132-201`) is the only shell. Two route-group layouts render it —
`app/(host)/layout.tsx:12` and `app/95-forward/layout.tsx:12` — differing only by a `register` prop
stamped as `data-register` on `.shell`. Structure: flex row = **fixed 264px sticky sidebar**
(`.shell-sidebar`, white, hairline right border, own scroll, full height) + `.shell-main`. Renders a
skip link, brand block, nav, the account footer, and — in the `95-forward` register only — the
`JobTray`.

Nav is data-driven from one static array, `components/shell/nav.ts:62-193`: 4 sections, 4 item kinds
(`leaf` / `group` / `cta` / `eyebrow`). Active state is a prefix match (`AppShell.tsx:58-61`); a
group containing the current route is force-expanded. The 95 Forward group is `branded` — it renders
the `Mark` SVG instead of a lucide icon.

**`Topbar` takes `heading`** (I26). Default true, so it emits the page's `<h1>` — most screens build
their header from `.f95-page__header` markup with no heading of their own. A screen that renders its
own title passes `heading={false}` and the topbar renders a styled `<div>` instead, so the page's
title is the `h1`. Seven screens had been demoting their own heading to an `h2` to satisfy the
one-per-screen rule, which put the host's chrome above the page's content in the document outline.
Nothing moved visually: `base.css` already zeroes heading margins.

**`Topbar` is not rendered by the shell.** It is imported per-page by **12 of 80 `page.tsx`** files —
11 of 13 under `95-forward`, **1 of 64** under `(host)` (Settings). 14 call sites in total
(`search/loading.tsx` and `PagePlaceholder.tsx` are the other two). The remaining host pages build
their header from `.f95-page__header` markup instead. See §8.4.

```tsx
// apps/web/src/app/95-forward/board/page.tsx
<Topbar title="The Board" subtitle="95 Forward" />
<div className="f95-page f95-board" data-testid="board">
  <div className="f95-page__header">
    <div className="f95-page__heading">
      <div className="f95-page__eyebrow">95 Forward · SATURDAY 12 SEPTEMBER</div>
      <h1 className="f95-page__title">The Board</h1>
      <p className="f95-page__count">…</p>
```

**Layout primitives are bare CSS classes** in `ds-data.css`, with no React wrapper except `FormRow`:
`.f95-page` (69 files), `.f95-stack` (+`--sm`; 106 elements / 51 files), `.f95-cluster` (132),
`.f95-page__header` (32), `.f95-record-head` (10), `.f95-tilegrid` (+`--wide`), `.f95-statgrid`,
`.f95-deflist` (114 occurrences / 29 files), `.f95-inline-form` (22), `.f95-overview` (2).

### 5.2 Card — `ds/Card.tsx`, `ds.css:288-338` — 134 uses / 62 files

| Prop          | Values                                             | Notes                                                                                 |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tone`        | `default` · `ai` · `go` · `sunk`                   | `ai` = iris surface + border; `go` = gold border + `--ring-go`; `sunk` = inset well   |
| `pad`         | `sm 16` · **`md 20` (default)** · `lg 32` · `none` | `sm` and `none` have **0 uses**                                                       |
| `elevation`   | `sm` (default) · `md` · `none`                     | **0 uses** — every card renders `--shadow-sm`                                         |
| `accent`      | bool                                               | Draws the 3px left border **on any tone** since I17b; was an AI-only compound (§10.4) |
| `health`      | `moving` · `slowing` · `stuck`                     | **I17b.** Colours the accent from the health triad. Queue cards, stage chips          |
| `interactive` | bool                                               | Pointer + `shadow-md` + 1px lift. 1 use                                               |

```tsx
// apps/web/src/app/95-forward/prospects/page.tsx
<Card tone="go" accent pad="lg">
```

### 5.3 Table — `ds/DataTable.tsx`, `ds-data.css:1-80` — 16 uses / 14 files, all under `app/(host)`

Generic column config (`key`, `header`, `cell`, optional `sortKey`, `align`). Built in: sticky
`haze-50` header, `align:"right"` → `.f95-table__num` (right-align + tabular), zebra striping on even
rows (`color-mix` of haze-50 at 55%), `rowHref` turning the **first cell** into a
`.f95-table__cell-link` and the row into a hover-highlighted `.f95-table__row--link`, sortable
headers with `ArrowUp`/`ArrowDown`/`ChevronsUpDown` and `aria-sort`. **Sorting and paging are
URL-driven** (`buildHref`), never client state. Pair with `Pagination` (3 uses).

```tsx
// apps/web/src/app/(host)/constituents/page.tsx:76-82
{ key: "lifetime", header: "Lifetime giving", sortKey: "lifetimeGiving",
  align: "right", cell: (row) => formatCurrencyFromCents(row.lifetimeGivingCents) },
```

### 5.4 List rows — all class-only, none is a component

| Pattern                                                    | Where                 | Uses                                                                            |
| ---------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `.f95-itemrow` (+`__body`/`__title`/`__meta`/`__actions`)  | `ds-data.css:609-640` | 27 rows / 21 files                                                              |
| `.f95-stat` (+`__label`/`__value`/`__sub`)                 | `ds-data.css:506-524` | 25 / 11 files — 4 competing compositions (§8.4). **Settled by I25 — see below** |
| `.f95-deflist__item` (+`__term`/`__desc`)                  | `ds-data.css:563-590` | 18; the `DefItem` renderer is re-declared verbatim in 3 route files             |
| `.f95-prow` — ranked prospect row, 3px `--_tier` left rail | `ds.css:873-935`      | 2 screens, composed differently (§8.4)                                          |
| `.f95-mg-stage__head` — `count · total` stage summary      | `ds-data.css:742-757` | 1 screen                                                                        |

**The stat-block composition, settled (I25).** Four arrangements were live and none was canonical:
bare tiles in `.f95-statgrid`, `Card`-wrapped tiles in `.f95-tilegrid`, `Card`-wrapped in
`.f95-statgrid`, and `Card`-wrapped in no grid at all. The Board's metric block is the most
prominent stat composition in the product, so it picks one and it is the rule going forward:

> **One `Card` wraps the whole block; the tiles sit bare inside one `.f95-statgrid`.**
> Never wrap each tile in its own `Card` — a grid of cards reads as four unrelated facts rather than
> one figure and its supporting arithmetic. Never use `.f95-tilegrid` for stats: its 220px track is
> sized for content tiles, and stats want `.f95-statgrid`'s 150px.

The Board adds one dominant tile above the grid (I17b's `Metric dominant`, 52px) and the monospace
basis line below it. The 25 existing `.f95-stat` occurrences are **not** refactored — that is a
separate cleanup — but nothing new should add a fifth arrangement.

### 5.5 Buttons — `ds/Button.tsx`, `ds.css:1-120` — 209 uses / 78 files

All 209 call sites pass `variant` explicitly.

| Variant     | Treatment                                         | Uses   |
| ----------- | ------------------------------------------------- | ------ |
| `primary`   | Blue fill                                         | **71** |
| `ghost`     | Transparent, haze hover                           | **69** |
| `secondary` | White + border outline                            | **50** |
| `danger`    | Transparent, brick text, brick-100 border         | 9      |
| `go`        | Gold fill — "the next right move", used sparingly | 8      |

Sizes `sm` (32px/13px/radius-sm — **148 uses**, the norm), `md` (40px/15px/radius-md, default), `lg`
(48px/18px). `block` has 0 uses. **70 Buttons are wrapped in a `next/link` `<Link>`** — the dominant
link-as-button pattern (§8.2), and those 70 are unchanged.

Since I17b, `Button` takes an **`href`** and renders a single `<a>` through `next/link` instead —
one element, one tab stop, valid HTML. With `disabled` it renders the inert treatment `Pagination`
already uses, because an anchor cannot be disabled. New screens use this; the 70 are their own
cleanup (§10.4).

### 5.6 Badges, chips and pills — six distinct components, different jobs

| Component    | Class            | Shape                       | Variants                                                                                                                 | Uses                         |
| ------------ | ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `Badge`      | `.f95-badge`     | 22px pill, 11px semibold    | `neutral` `info` `success` `attention` `danger` `go` `ai` `unknown`; `dot`; `solid` _(0 uses)_                           | the status pill in tables    |
| `Tag`        | `.f95-tag`       | 26px, `radius-sm`, outlined | free-form `color` dot, `selected`, `onRemove` _(0 uses)_                                                                 | 6                            |
| `HorizonTag` | `.f95-horizon`   | 24px pill                   | `today`/`tomorrow`/`forever`, each with its own glyph; `solid`                                                           | 8 (5 outside the styleguide) |
| `RoleChip`   | `.f95-role`      | pill                        | `manager` (filled blue) vs `partner` (**dashed sage + door glyph**)                                                      | —                            |
| `SourceTag`  | `.f95-src`       | 11px mono chip              | `--grounded` (iris tint, doc icon) / `--unknown` (dashed, sans, "Unknown — worth researching")                           | 13                           |
| `Heartbeat`  | `.f95-heartbeat` | pill + animated dot         | `status`: `on-track` sage / `due-soon` gold / `overdue` brick, plus `label` for the text                                 | 3                            |
| `Avatar`     | `.f95-avatar`    | 28/36/48px circle           | `size` (always emitted), `kind="org"` → rounded square, `src` → `<img alt={name}>`, `ringColor` → double box-shadow halo | 6 (none pass `src`)          |

```tsx
// apps/web/src/app/(host)/constituents/page.tsx:71
<Badge tone={typeTone(row.type)}>{titleCaseFromSnake(row.type)}</Badge>
```

Domain-status → tone mapping is **not centralised**: one shared helper (`membershipStatusTone`)
against 14 screen-local re-implementations (§8.4).

### 5.7 Form controls

All share `--control-md` height, `--radius-md`, `--border-default`, hover `--border-strong`, focus
`blue-500` + `--ring`.

- **`Input`** — `.f95-field` wrapper gives `__label` (13px, `· optional` suffix), `__hint`, `__err`.
  Modifiers: `--has-icon` (36px left pad), `--invalid`, and **`--ai`** (iris surface/border/text) for
  copilot-proposed values.
- **`Textarea`** — `min-height: 84px`, vertical resize only.
- **`Select`** — `appearance:none` + lucide `ChevronDown` overlay; `selectSize="sm"` → 32px.
- **`Checkbox`** — 18px, 1.5px border, CSS `clip-path` tick, fills `--reg-accent`.
- **`Switch`** — 38×22 pill, 18px thumb, `:has(:checked)` fills `--reg-accent`.
- **Layout** — `FieldGroup` (uppercase `__legend`), `FormRow` (`--2`/`--3`, collapse below 720px),
  `.f95-filterbar` (26 occurrences / 6 components).

```tsx
// apps/web/src/app/(host)/constituents/ConstituentForm.tsx (pattern)
<FormRow columns={2}>
  <Input label="Display name" name="displayName" required />
  <Select label="Type" name="type" options={TYPE_OPTIONS} />
</FormRow>
```

Each control's invalid and disabled treatment differs, and sibling APIs diverge (§8.5).

### 5.8 Tabs — `ds/Tabs.tsx`, `ds-data.css:264-302`

Link-based tabs, 2px `--reg-accent` underline on the active item, horizontally scrollable. **4 call
sites.** Six hand-rolled `*Nav` components reuse the same classes with different ARIA and are the
dominant variant at 17 call sites (§8.2).

**`TabNav`** (I17b, `.f95-tabnav`) is the third, and the correct one: navigation links marked with
`aria-current="page"`, which a link may have, rather than the `aria-selected` the other two set —
plus a colour dot per item and a disabled state, which the Forecast Room's initiative tabs need and
`Tabs` has no notion of (§10.6). The existing ten call sites are untouched.

### 5.9 Modal — one instance, not a primitive

`.f95-modal__scrim` + `.f95-modal` live in `feedback.css:42-74` and are used only by
`components/feedback/FeedbackWidget.tsx`. Fixed scrim `rgba(22,32,43,0.32)`, top-aligned, 520px
max-width, `radius-lg` + `--shadow-xl`, `role="dialog"` `aria-modal`. Focus-on-open, Tab trapping,
Escape and scrim-click all live **inside the widget**, not in a reusable place. There is **no `Modal`
component**.

### 5.10 Empty and loading states

- **`EmptyState`** (`.f95-empty`) — dashed border, sunk background, 44px circular icon chip, title +
  line (max 420px) + optional action. **39 call sites** — the dominant whole-list empty.
- **Inline empties** — `.f95-table__muted` (table cells), `.f95-deflist__desc--empty` (**41
  occurrences / 27 files**, in every case standalone as a de facto muted-text utility, §8.4),
  `.f95-foil__value--empty`, `.f95-mg-likelihood__empty`.
- **Loading** — **no spinner and no skeleton exists anywhere.** One route-level `loading.tsx`
  (`95-forward/search`). In-flight forms use `disabled` + `aria-busy`. Background work surfaces
  through the **`JobTray`** — a fixed bottom-right iris pill with a pulsing dot, 95 Forward register
  only.
- **Toast / notification — does not exist.** The topbar bell is decorative and unwired.

### 5.11 Copilot surfaces

- **`ProvisionalSuggestion`** — the "copilot proposes, you decide" card: `ai` badge title, optional
  `N% confident`, body, optional `from → to` delta (mono, strike-through old value), `SourceTag`
  footnote, Approve / Edit / Dismiss. Resolved states collapse to one line.
- **`QpiScore` / `QpiBreakdown`** — 64px heavy tabular number in the band colour + `/100`, band dot
  and label, and a "See inside the score" / "Hide the math" disclosure revealing per-dimension bars,
  ratings, rationale and source tags. `compact` drops the number to 26px.

### 5.12 Screen conventions — the recipe for a new screen

These are house patterns, not components, but a new screen that skips them will not look or test like
the rest of the app.

**Page skeleton.** 72 of 80 `page.tsx` files export `const dynamic = "force-dynamic"`; 73 of 80 are
`export default async function` server components. In Next 15, `params` and `searchParams` arrive as
**Promises** (`params: Promise<{ id: string }>`, `searchParams: Promise<RawSearchParams>` — 22 pages
take searchParams). Every page opens with the same null-guard preamble:

```tsx
export const dynamic = "force-dynamic";

export default async function ThingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  …
```

**Forms.** `.f95-inline-form` (`ds-data.css:653` — column flex, `gap: var(--space-3)`) is the standard
vertical form layout: **22 uses across 19 files**. Forms bind DS field primitives to server actions
through `useActionState` (**35 files, 80 `<form action={formAction}>` sites**):

```tsx
const [state, formAction, isPending] = useActionState(someAction, initialState);
<form action={formAction} className="f95-inline-form">
  <input type="hidden" name="prospectId" value={id} />
  <Input label="Name" name="name" error={state.fieldErrors?.name} />
  <Button type="submit" disabled={isPending}>
    {isPending ? "Saving…" : "Save"}
  </Button>
</form>;
```

**Disclosure.** The standard way to add an inline create/log form to a detail screen (**19 files**):
`useState(false)` renders a collapsed trigger `Button` that swaps itself for an expanded
`<Card><form className="f95-inline-form">`, closing again on `state.ok`.

**Copilot actions.** `components/copilot/CopilotTrigger.tsx` is the canonical AI-invocation
affordance — a `<form action={formAction}>` wrapping `<Button type="submit" variant="secondary"
size="sm" disabled={isPending} iconLeft={…}>`, icon defaulting to `<Sparkle size={15}
strokeWidth={1.8} />`, `pendingLabel` defaulting to `"Working…"`, plus a hidden subject-id input.

**Icons.** `lucide-react` is the only icon source (104 files). **171 of 172 icon renders use
`strokeWidth={1.8}`.** Size is keyed to the slot, not chosen freely:

| Slot                          | Size                       |
| ----------------------------- | -------------------------- |
| `EmptyState` `icon`           | 20 (34 of 41 icon props)   |
| `Button` `iconLeft`           | 15 (28) · 16 (16) · 14 (7) |
| Sidebar nav row / group child | 18 / 17                    |
| Topbar bell, sign-out         | 18                         |
| `Select` chevron              | 16                         |
| `DataTable` sort arrow        | 13                         |

**Test IDs.** 92 `data-testid` attributes across 39 files, kebab-case. 11 sit on the `.f95-page` root
and name the screen (`<div className="f95-page" data-testid="today">`), with more on each meaningful
region and on every form. **The Playwright suite pins these** — a screen that omits them is
untestable in the house style.

**Truncation.** The app clips text in exactly **5 rules** (`text-overflow: ellipsis`:
`ds.css:462,:924,:932`, `jobtray.css:31`, `shell.css:213`) and has **zero `-webkit-line-clamp`**
anywhere. Everything else wraps. Long donor names and rationale copy will wrap, not clip, unless you
opt in.

**Accessibility posture.** There is **no `sr-only` / visually-hidden utility anywhere in the repo**
(0 hits). 52 `aria-label` attributes carry that load instead. `aria-hidden` appears on only 12 of the
170 icon renders — decorative icons are usually left exposed. See §8.5 for where the shared
components fall short.

---

## 6. Layout conventions

1. **Composition.** Every authenticated screen is `AppShell` → (optional `<Topbar/>`) → one
   `.f95-page` container. `.f95-page` (`ds-data.css:435-441`) = `padding: var(--space-7)`,
   `max-width: var(--container-max)` (1320px), **left-aligned, not centred**, flex column, `gap:
var(--space-4)`. Used in **69 files** (57 host, 12 95-forward).
2. **Narrower variants.** `.f95-settings` caps at 760px; Visit mode's reading column at 680px.
3. **Grid is rare.** Layout is overwhelmingly flexbox — only **9 selectors declare `display:grid`**
   and there are **11 `grid-template-columns` declarations** in the whole stylesheet set. Intrinsic
   grids use `repeat(auto-fit, minmax(…, 1fr))` at three track sizes: **150px** (`.f95-statgrid`),
   **220px** (`.f95-tilegrid`, `.f95-deflist`), **320px** (`.f95-tilegrid--wide`). The only
   fixed-column grids are `.f95-formrow--2` / `--3`.
4. **Detail screens** use `.f95-overview` — one column, becoming `1fr / 340px` main+rail at ≥960px
   with the rail `position: sticky`.
5. **Register.** `data-register="host" | "95-forward"` on the shell root swaps seven `--reg-*`
   variables (`register.css`): `--reg-accent`, `-accent-strong`, `-accent-surface` _(0 refs)_,
   `-nav-active-bg`, `-nav-active-fg`, `-nav-active-icon`, `-eyebrow`. Consumers: active tab, table
   sort icon, cell-link hover, checkbox, switch, fieldgroup legend, page eyebrow, nav active row.
6. **Breakpoints — there are exactly four layout media queries in the source tree:**
   `max-width: 640px` (the job tray collapses to an icon, `jobtray.css:96`), `max-width: 720px`
   (form rows → 1 column, `ds-data.css:349`), and `min-width: 960px` twice (`.f95-overview` grid and
   its sticky rail, `ds-data.css:1000,1017`). Plus 4 `prefers-reduced-motion` blocks.
7. **Mobile is barely handled.** `shell.css` contains **zero** media queries — the 264px sidebar
   never collapses at any width, and `.f95-page` keeps its 32px gutter. The app's only
   mobile-specific rule is the job tray's `max-width: 640px` block (`jobtray.css:96`), which
   collapses that one floating pill to an icon. There is no JS viewport handling anywhere, and
   Playwright runs Desktop Chrome only.
8. **Visit mode** is a `position: fixed; inset: 0; z-index: 60` overlay above the shell
   (`visit.css`), low chrome, large serif type.
9. **Z-index ladder** — six hard-coded literals, no token: sticky table header `1`, feedback menu
   `50`, job tray `50`, visit mode `60`, skip link `100`, modal scrim `100`.
10. **Horizontal scroll** exists in exactly two places: `.f95-table-wrap` and `.f95-tablist`.

---

## 7. Data-display formatting

`apps/web/src/lib/format.ts` (65 lines) is the **only** shared display-formatting module, and holds
the **only two `Intl.*` constructions in the entire repo** (`:4`, `:16`). Everything else is
hand-rolled. There is **no date or number library** in any `package.json`.

| Kind                         | Convention                                                                                                                                                                                                                                                                                                                                                                   | Where                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Currency**                 | Integer **cents** in, `Intl.NumberFormat("en-US", USD, min/max fraction 0)` out — whole dollars, **never cents**: `$250,000`. Null → `—`.                                                                                                                                                                                                                                    | `formatCurrencyFromCents` (`format.ts:1-10`)                                  |
| **Abbreviated money**        | `$1.86M` · `$945K` · `$0`. Millions and billions at 2 decimals, thousands at 0 — which is what keeps `$2.70M` holding its trailing zero beside `$1.86M`. Rounds on the integer cents, not through `toFixed`. **I17b.**                                                                                                                                                       | `formatCurrencyAbbreviatedFromCents` (`format.ts`)                            |
| **Coverage what-ifs**        | `coverageWithout(id)` answers "lose this one and coverage drops"; `coverageWith(id)` (**I26**) answers "qualify this and coverage rises". The second exists because the first returns a delta of exactly zero for an unqualified ask — it was never in the numerator — so the designed sentence is arithmetically false about the record Opportunity Detail is built around. | `packages/shared/src/forward-metrics.ts`                                      |
| **A set of related amounts** | Formats figures that will be read together at one precision, raising it only as far as it must so that two different amounts never render identically and the order survives. Falls back to exact dollars past two extra digits. **I17b.**                                                                                                                                   | `formatCurrencySeriesAbbreviatedFromCents` (`format.ts`)                      |
| **Dates**                    | `Intl.DateTimeFormat("en-US", {year:numeric, month:short, day:numeric, timeZone:"UTC"})` → `Sep 11, 2025`. UTC is pinned because the columns are Postgres `date` (calendar days, no zone). Null/invalid → `—`. **No time-of-day format exists anywhere.**                                                                                                                    | `formatDate` (`format.ts:12-22`)                                              |
| **Machine dates**            | `toISOString().slice(0,10)` for URL params and `<input type="date">` — re-implemented in 4 lib files, no shared helper.                                                                                                                                                                                                                                                      | `event-params.ts:53`, `marketing-format.ts:30`, `membership-renewals.ts:8,39` |
| **Relative time**            | **Four disagreeing implementations** — §8.4.                                                                                                                                                                                                                                                                                                                                 | —                                                                             |
| **Counts**                   | `.toLocaleString("en-US")` inline in **3 files / 7 sites**; **raw with no separator** in the 17 page-header `{n} records` ternaries and in table cells. No shared count formatter.                                                                                                                                                                                           | `(host)/page.tsx:43,50` vs `constituents/page.tsx:154`                        |
| **Percentages**              | Computed **server-side**, always `Math.round` to a whole integer — never `toFixed`, never a decimal. Rendered as bare `{n}%`. Some clamp 0–100 server-side.                                                                                                                                                                                                                  | `analysis-metrics.ts:41,72`, `green-sheet-metrics.ts:33,38`                   |
| **Hours**                    | Bare `.toFixed(2)` → `12.50`, at 6 display sites in 4 files. No helper. Unit normally carried by the column header.                                                                                                                                                                                                                                                          | `volunteers/roster/page.tsx:34`                                               |
| **Enum labels**              | `titleCaseFromSnake` — `corporate_grant` → `Corporate Grant`. Does **not** lower-case the rest. 9 local `Record<…,string>` label maps exist for enums whose form is not plain title-case.                                                                                                                                                                                    | `format.ts:60-65`                                                             |
| **Null / empty**             | Four conventions, all live: em dash `—` (default, usually in `.f95-table__muted`); a muted phrase ("No gifts yet", "No contact yet", "Unassigned"); a full sentence ("No tags yet — add what you know."); or `EmptyState` for a whole list.                                                                                                                                  | §8.4                                                                          |
| **Numeric alignment**        | Opt-in per column on `DataTable` (`align:"right"` → `.f95-table__num`), used 29 times / 14 files. Tabular figures are on globally regardless.                                                                                                                                                                                                                                | `DataTable.tsx:10,62,87`                                                      |
| **Pagination**               | `Showing {from}–{to} of {total}` with an **en dash** (not the em dash used for nulls) and raw unseparated numbers; `No records` at zero.                                                                                                                                                                                                                                     | `Pagination.tsx:22,35`                                                        |

**Inline formatting count:** 10 distinct files format numbers for display inline rather than through
a helper — 8 in `apps/web`, 2 in `packages/ai`. `packages/ai` carries **two private USD formatters**
(`retrieval.ts:34-40`, `tools/index.ts:15-21`) whose output differs from `formatCurrencyFromCents`.

---

## 8. Inconsistencies and open questions

Everything below is **reported, not resolved**. Counts are grep-verified; "dominant" means the
variant with more call sites, not the better one.

### 8.1 Token-layer defects

1. ~~**6 custom properties are referenced but never defined**~~ — **all resolved in I17b**, each to
   the token that already carried the meaning rather than by defining a second name for a colour
   that has one. `--ink-strong` → `--text-strong`; `--motion-fast` → `--dur-fast`; `--elevation-sm`
   → `--shadow-sm`; `--text-primary` → `--text-body` on the menu item and `--text-strong` on the
   modal title; `--text-lg` → `--fs-lg`; `--ai-iris` → `--ai-ink`.
2. ~~**5 `var()` fallbacks contradict the real token**~~ — **all resolved in I17b**, by dropping the
   fallback. On a defined token a fallback is unreachable, so it is pure opportunity for the two
   values to drift; the one visible change is the feedback menu item's radius moving 8px → the real
   6px. A `--_`-prefixed local is the opposite case and keeps its fallback: it is undefined by
   design until the markup sets it, and the fallback **is** its default.
   **`apps/web/src/styles/css-contract.test.ts` now fails the build on the twelfth of either.**
3. **~30 declared tokens have zero references**, including all three `--border-w*`, `--color-info`,
   `--focus-ring`, `--rail-w`, `--touch-min`, `--content-gutter`, `--radius-xl`/`2xl`/`circle`,
   `--fs-score-lg`, `--text-display`, `--reg-accent-surface` (defined twice, used zero times).
   I17b bound `--fs-5xl`, `--ls-wide` and three of the four `--color-*` status aliases.
4. **Two focus-ring tokens, and the dead one is the semantic one.** `--ring` (raw rgba of blue-500)
   is used in 9 rules; `--focus-ring: var(--blue-500)` in **0**. Two further focus rings are inlined
   as raw rgba (`ds.css:409,:418`) instead of tokenised.
5. **Semantic aliases collapse onto the same hex**, so roles the palette comments say "must never
   look alike" are identical: `--blue-600` backs 6 aliases, `--gold-600` backs 5, `--sage-600` backs
   4, `--ink-400` backs 3, `--iris-600` backs 2.

### 8.2 Competing implementations of the same thing

6. **Tabs — two implementations, and the invalid attribute is load-bearing.** The DS `Tabs` uses
   `role="tablist"`/`role="tab"` (4 sites). Six hand-rolled `*Nav` components use `role="navigation"`
   but still set `aria-selected` on plain links — **they must**, because `.f95-tab[aria-selected="true"]`
   is the only rule that styles an active tab and nothing targets `aria-current`.
   **`*Nav` is dominant: 17 call sites across 6 near-verbatim duplicate files** (Analysis 3,
   MajorGiving 4, Marketing 2, Memberships 4, Revenue 2, Volunteers 2), none shared.
   **Still true.** I17b added a third, correct implementation (`TabNav`, §10.6) for the new screens
   and deliberately did not touch the existing 21 sites — copying the broken pattern into a
   load-bearing new surface is how a mistake becomes the house style, and rewriting six files is a
   separate cleanup.
7. ~~**`Card accent` is a silent no-op outside AI cards**~~ — **fixed in I17b**. `.f95-card--accent`
   now draws on its own, taking its colour from `--_accent`, which each tone and each health sets.
   The 5 `tone="go"` sites that rendered nothing now render a gold left border.
8. **Link-as-button is nested interactive throughout.** `<Link><Button/></Link>` puts a `<button>`
   inside an `<a>` at **70 sites across 43 files** — dominant. Two competing treatments: raw
   `<a class="f95-btn …">` on the auth screens (2 sites), and `Pagination`'s `<Link>` +
   `aria-disabled` + `tabIndex={-1}`. **Still true of all 70.** `Button` gained an `href` in I17b
   (§5.5) so that new screens stop adding to the count; the existing 70 are their own cleanup.
9. **Tables — two implementations.** `DataTable` (sortable, `aria-sort`, right-align, row links) at
   16 sites, dominant; raw `<table class="f95-table">` markup with none of those at 2 sites
   (`green-sheet`, `RelationshipMapTab`).
10. **The AI marker disagrees by register.** `<Badge tone="ai">` appears 8 times, **none under
    `app/(host)`**; the host register labels the same AI-derived value `<Badge tone="neutral">AI</Badge>`
    at 3 sites.
11. **The "major-gift likelihood" foil is implemented four ways** — three hand-rolled `.f95-foil`
    blocks disagreeing on icon (Sparkles 20 vs Gauge 20), on how AI origin is marked, and on card
    padding, plus `LikelihoodFoil` using a different class family. Three distinct empty strings
    across the four.
12. **Five icon-button treatments exist beside `Button`**: `.shell-bell` (38px bordered, 2 sites),
    `.shell-signout` (32px borderless), `.f95-stepper__btn` (30px, borders with the raw `--ink-200`
    rather than `--border-default`), `.f95-pagination__btn`, `.f95-tag__x` (dead).
13. **Three progress/bar treatments with inconsistent clamping and a11y.** `.f95-bars` (4 sites, all
    with `role="img"`), `.f95-progress` (5 sites, **none with any role or aria**),
    `.f95-qpi__ptrack`. Of the 5 `.f95-progress` sites, 2 clamp, 2 feed raw unclamped `pct`, and 1 is
    driven by `barHeightPercent` — which sets a **width** at that site, contradicting its name.

### 8.3 Two stylesheet generations

14. `ds.css` was added in Initiative 0, `ds-data.css` in Initiative 2, and the split still shows:
    **`ds.css` consumes 0 `--reg-*` tokens** (hard-coding the blue ramp for the equivalent states in
    10 declarations) while `ds-data.css` consumes 9. Likewise tabular figures — `font-feature-settings`
    appears only in `ds.css`/`base.css` (9 rules), `font-variant-numeric` only in
    `ds-data.css`/`visit.css` (13 rules). **No file uses both mechanisms.**

### 8.4 Duplicated and drifting patterns

15. **Relative time has four disagreeing implementations**: `deriveCadence`
    (`prospect-cadence.ts`, "1d ago"), a screen-local `relativeDate` (`prospects/[id]/page.tsx:50-65`,
    "Yesterday" / "3 days ago"), `followUpLabel` (`follow-up.ts`, **rounds** where the others floor),
    and `formatTenure` (`wavemaker.ts`). The first two appear in the _same prospect flow_. None share
    a day-math constant. One staleness value is a hard-coded literal: `updatedAt="6h ago"`
    (`prospects/[id]/page.tsx:308`).
16. **Status-tone mappers are copy-pasted, not shared.** 14 screen-local implementations against one
    shared helper. Three list/record pairs are currently **byte-identical** and free to diverge;
    `cancelled` maps to `unknown` in two places and `neutral` elsewhere.
17. **Four competing stat-tile compositions** across 25 `.f95-stat` occurrences: Card-wrapped inside
    `.f95-tilegrid` (10), bare inside `.f95-statgrid` (12), Card-wrapped inside `.f95-statgrid` (1),
    and Card-wrapped in no grid at all (2). Counts inside `.f95-stat__value` also disagree — 6 sites
    apply `toLocaleString`, 4 render a raw integer.
18. **Three page-header treatments coexist** (`.f95-page__header` 33 uses, `.f95-record-head` 10,
    `Topbar` 14). ~~**12 pages render two `<h1>` elements**~~ — **fixed in I26** via `Topbar`'s
    `heading` prop (§5.1). An e2e sweep over fifteen routes plus the two record screens now asserts
    exactly one `h1` per screen, and that it is the page's own title. The three header treatments
    themselves are unchanged — that is a separate cleanup.
19. ~~**Five eyebrow treatments, two byte-identical**~~ — **consolidated in I25.** The treatment is
    declared once in `tokens/typography.css`; `.f95-page__eyebrow`, `.f95-fieldgroup__legend`,
    `.page-placeholder__eyebrow` and `.f95-visit__eyebrow` now declare **only** the margin or colour
    that was ever different between them, each in its own file. `.f95-eyebrow` — the sixth name,
    previously applied in TSX with no rule behind it — is the base, and carries no margin, which is
    what made `.f95-page__eyebrow` unusable inline. `.f95-overline` resolves to the same rule.
    `.f95-eyebrow--quiet` is the muted variant. See §10.8.
20. **The URL-param `update()` helper is re-implemented in 7 filter components and they disagree** —
    3 call `next.delete("page")` to reset pagination, 4 do not.
21. **The `.f95-prow` prospect row is hand-written on two screens with different composition** — MPL
    sets `--_tier`, roles and cadence; Search sets none of them, so its left border silently falls
    back to `--border-default`. There is no shared `ProspectRow`.
22. **The definition-list renderer is duplicated four times**; three copies render `—` for empty and
    the fourth renders "Unknown — worth researching".
23. **The QPI band→variable map is duplicated** (`tierVar()` and `BAND_META`), and the band
    _vocabulary_ disagrees across three places: `"Go — see them today"/"Strong"/"Building"/"Early"`
    vs `"90+"/"70–89"/"50–69"/"Under 50"` vs the token comments. The thresholds themselves come from
    one shared function.
24. **`titleCaseFromSnake` is re-inlined character-for-character** in `list-fields.ts:34-37` instead
    of imported.

### 8.5 Dead, orphaned and mis-wired

25. **5 classes are applied in TSX with no CSS rule anywhere**: `f95-eyebrow`, `f95-prov`,
    `f95-prov__title`, `f95-settings__intro`, and `f95-rise` — which is a **keyframes name applied
    as a class**. `f95-field__error` was the sixth: a one-character typo for `f95-field__err` at
    `CopilotTrigger.tsx`, the app's only copilot error site, where the message had been rendering in
    inherited colour rather than `--color-danger`. **Fixed in I17b.**
26. **7 classes are defined in CSS and never used**: `.f95-num`, `.f95-overline`, `.f95-recordbar`,
    `.f95-mpl__pillgroup`, `.f95-mpl__pillgroup-label`, `.f95-visit__amount`, `.f95-visit__phasenav`.
27. **BEM elements outliving their block.** `.f95-recordbar` has 0 uses but `.f95-recordbar__spacer`
    has 20 — and 5 of those sit inside a **column** flex container where `flex: 1` does nothing.
    `.f95-deflist__desc--empty` was used **41 times across 27 files, every one standalone** with no
    `.f95-deflist` parent — it had become the generic muted-text utility because there was not one.
    **I25 created `.f95-muted`** and resolved both names to the same rule, so those 41 sites
    converge without editing 27 files and new screens have something honest to reach for (§10.8).
    The 41 call sites themselves are not renamed — that is a separate cleanup.
    `.f95-table__cell-link` has **79 occurrences, only 1 inside `DataTable`** — 39 pair it with
    `.f95-cluster` as an undocumented breadcrumb back-link.
28. **Dead component API**: `QpiBreakdown` is exported but has no call sites outside `QpiScore`;
    `Badge.solid`, `Tag.onRemove`, `SourceTag.onClick`, `Card.elevation`, `Card.pad="sm"|"none"`,
    `DataTable.caption` and `Button.block` all have **0 call sites**, leaving their CSS dead.
    `PagePlaceholder` is exported from the shell barrel and **rendered nowhere**.
29. **`/styleguide` has drifted from the DS surface** — it demos 11 of 24 exported components.
    Checkbox, Switch, Select, Textarea, DataTable, Pagination, Tabs, EmptyState, FieldGroup, FormRow,
    QpiScore, QpiBreakdown and Mark are absent.
30. **`resolveRegister`/`isForwardRoute` in `packages/shared` do not drive the running app** — the
    shell receives `register` as a layout prop, and the only app call site passes the literal
    `"/styleguide"`.
31. **The topbar's "Add" button and "Search Keystone" input are unwired** — no `onClick`, no `href`,
    no form, no handler.
32. **Sibling field APIs diverge**: `Input`/`Textarea` accept `optional`, `Select` does not; `Select`
    names its size prop `selectSize` while everything else uses `size`; and **14 call sites bypass
    `label` entirely and pass `aria-label`**, producing visually unlabelled controls. The auto-id
    expression is re-implemented character-identically in all three, and guarantees no uniqueness.
33. **Accessibility inconsistencies in shared components**: `SourceTag` renders `role="button"` on a
    `<span>` with no `tabIndex` and no keyboard handler (and no call site passes `onClick`, so it
    announces as a button that does nothing); `Tag`'s remove affordance is likewise unreachable by
    keyboard; `DataTable` sets `aria-sort` only on the active column and no `<th scope>` exists
    anywhere in the app; of 21 `f95-field__err` sites only 1 adds `role="alert"`.
34. **Documented-but-unimplemented**: `data-density="b"` is set on two Visit-mode elements and
    described in comments, but **no CSS selector anywhere targets `[data-density]`**.
    `--touch-min: 44px` and `--rail-w: 72px` imply touch targets and a collapsed rail that do not
    exist.
35. **Token comments contradict the code**: `--radius-md` is annotated "default card / control" but
    cards use `--radius-lg`; the typography header cites `--fs-display`, which does not exist; the
    Iris comment says "never used for human-entered data" but `--horizon-forever` paints iris on a
    DB-sourced value at 5 call sites; the Unknown palette is documented as "NOT an error" but is the
    mapping for `cancelled` in two helpers.
36. **Two hard-coded transitions** (`240ms ease`) sit beside a full motion-token set
    (`ds-data.css:697,:788`).
37. **Hover affordances are inconsistent across list rows**: `.f95-card--interactive` and
    `.f95-prow--interactive` duplicate the same two declarations in separate rules, while
    `.f95-table__row--link` changes background only, with no lift.

38. **The word "register" means two incompatible things in live code.** `data-register`
    (`register.css`, `AppShell.tsx:135`) means _which product's chrome is showing_ — `host` vs
    `95-forward`. But the token-file comments (`tokens/spacing.css:2-5`,
    `tokens/typography.css:8-10`) use "Register A / Register B" for _density_ — portfolio vs
    in-the-moment — which is the stale export's sense and is not implemented (§8.5.34). Both senses
    appear in the codebase unreconciled.

### 8.6 Drift from the stale export

39. The token layer **barely drifted** — `apps/web/src/styles/tokens/*.css` is the export's
    `project/tokens/*.css` run through Prettier: the same 176 token names, with only the three font
    families (now `next/font` variables) and a cosmetic `0.10`→`0.1` differing. The real drift is
    structural: the export's runtime self-injecting `<style>` convention was replaced by static
    stylesheets; `AISuggestion`/`.f95-ai` became `ProvisionalSuggestion`/`.f95-prov` (**which has no
    base rule — it rides on `Card`**); `QPIScore` split into `QpiScore` + `QpiBreakdown`;
    `ProspectRow` was demoted to page-local markup; the kit grew from 12 to 24 exports; and
    "register" was **redefined** from density A/B to chrome owner (host | 95-forward).
    **Nothing in the export is imported by the app.** Three repo files still (wrongly) describe the
    export as authoritative. **Where they disagree, the code wins.**

### 8.7 Not a design-system issue, but blocking

40. `pnpm lint` currently fails with **101 errors**, all from the untracked Claude Design export at
    `docs/design/Major gift war room redesign/{support.js,_ds/…/_ds_bundle.js}`.
    `eslint.config.mjs:21` ignores the _old_ export (`95-forward-design-system-handoff/**`) but
    nothing ignores the new one. `npx eslint apps packages` is clean: **0 errors, 1 warning** (the
    known `Avatar.tsx` `<img>` warning). If `docs/design/` is committed, CI lint fails.

---

## 9. Gaps for the war-room redesign

Assessed against `docs/design/SCREENS.md` (The Board · The Forecast Room · Opportunity Detail).
**Gaps are reported, not filled** — adding tokens is the decision of the initiative that builds the
screens.

> **I17b closed these.** The table below is left as the record of what was found and why, because
> the reasoning is what a later reader needs. What each gap became is in **§10**; the short version
> is that six of the seven were extensions of something that existed, one (badges) was new, and the
> two "Further gaps" that were absent entirely — charting and abbreviated currency — were added.
> Still open from the second table, for I25–I27: the breadcrumb, the six-column stage board, the
> legend, timeline rows, the labelled column divider, the six-stage vocabulary in the data layer,
> and nav entries for the three screens.

### The seven named items

| #   | Needed                                                                 | Verdict                               | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Moving / Slowing / Stuck status palette** on chips, borders and dots | **Adaptable, mis-keyed**              | The green/amber/red triad exists as `--color-success`/`-attention`/`-danger` (3 of the 4 aliases unreferenced) and as `Badge`'s `success`/`attention`/`danger` tints. `Heartbeat` is the only component wiring a 3-state triad to one enum (`on-track`/`due-soon`/`overdue`), setting background, border, dot and label together — the closest working model. But **the words Moving/Slowing/Stuck appear nowhere** in app, styles, shared or DB (0 grep hits), and the one enum-to-colour ramp actually applied as a border is the **ordinal** QPI tier set, not a health triad. |
| 2   | **Monospace rule chips, consequence lines, inline arithmetic**         | **Adaptable, wrong size and case**    | `SourceTag` (`.f95-src`) is an 11px mono provenance pill with a doc icon — the nearest analogue, and the existing "no-black-box" citation chip. But **every mono treatment in the system is 11px or 13px**; there is no mono role at body/label size. And **no rule anywhere combines `--font-mono` with `text-transform: uppercase`** — all 16 uppercase/letter-spaced label treatments are sans. `.f95-mono` is used exactly once.                                                                                                                                              |
| 3   | **Tabular / lining numerals for money in columns**                     | **Exists**                            | Global on `body` via `--num-tabular` (`base.css:21`); `DataTable`'s `align:"right"` → `.f95-table__num` adds `text-align:right` + `tabular-nums`; 12 further numeric classes re-assert it. The `.f95-num` opt-in utility has 0 uses.                                                                                                                                                                                                                                                                                                                                              |
| 4   | **A dominant-metric type step** above any current heading              | **Adaptable, bound elsewhere**        | `--fs-score` (64px) exists but has **one declaration in one component** — the QPI number. Above it, `--fs-score-lg` (88px), `--fs-5xl` (52px) and `--text-display` are declared with **zero consumers**. The largest type actually rendered is 40px serif (Visit mode); the largest money figure is 32px (`.f95-foil__value`); stat blocks top out at 21px. `.f95-statgrid` + `.f95-stat` gives a metric block but has **no notion of one dominant metric plus subordinates**.                                                                                                    |
| 5   | **`THEY SAID` / `WE SAID` / `BLOCKING` / `NOT ASKED` badges**          | **Missing entirely**                  | 0 grep hits across apps + packages (the only 2 matches are prose in an e2e test). No milestone model exists to key them to. `Badge` has 8 tones, none semantically close.                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6   | **Initiative colour dots** — a small categorical palette               | **Missing entirely**                  | `funding_initiatives` has **no colour column** (`packages/db/src/schema/funding.ts:6-23`); 0 hits for any `initiativeColor`-style identifier. Initiatives are currently colour-coded only by their 3-value `frame` via `HorizonTag` — and that encoding carries a distinct glyph per value, so it is not colour-only. Three named categorical maps exist in code, **all keyed to QPI**. `Tag` accepts an arbitrary `color` string with no palette behind it. **Seven different dot primitives exist, none shared and none status-keyed.**                                         |
| 7   | **Left-border accent on cards** for health state                       | **Adaptable, currently screen-local** | The whole stylesheet set contains **exactly two `border-left` declarations**: `.f95-card--ai.f95-card--accent` (§8.2 — inert on other tones) and `.f95-prow` (`ds.css:880`), which takes its 3px rail from an inline `--_tier` custom property set from the QPI band. That second one is the working pattern — but it is page-local markup, not a component, and its second consumer never sets `--_tier`.                                                                                                                                                                        |

### Further gaps SCREENS.md implies

| Needed                                                                                         | Verdict                               | Evidence                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Charting** for the BMW cumulative curve with band, axes, in-chart labels and a today divider | **Missing entirely**                  | **No charting library is installed** (0 hits for recharts/d3/victory/nivo/chart.js/visx/echarts) and no chart is drawn in SVG — `<svg>` appears only in 5 icon components. All existing "charts" are CSS div bars with no axes, no time dimension, no band and no in-chart labels.            |
| **Abbreviated currency** (`$1.86M`, `$845K`) — used throughout SCREENS.md                      | **Missing entirely**                  | §7. `formatCurrencyFromCents` always emits full `Intl` currency.                                                                                                                                                                                                                              |
| **Breadcrumb** (`The Board · #1 of 7 · Opportunity`)                                           | **Missing** (de facto pattern exists) | 0 hits for breadcrumb/crumb; `Topbar` accepts only `title`/`subtitle`. But 39 sites already pair `.f95-table__cell-link` with `.f95-cluster` as an ad-hoc back-link (§8.5).                                                                                                                   |
| **Six-column stage board** (kanban)                                                            | **Missing entirely**                  | The only "pipeline" is `.f95-mg-pipeline`, which is `flex-direction: column` (stacked sections) on a host route. No grid supports six columns; only two horizontal-scroll containers exist. Per-stage `count · total` summaries **do** exist, as screen-local markup (`.f95-mg-stage__head`). |
| **Legend** (`Moving`/`Slowing`/`Stuck`, `Actual`/`Most likely`/`Best–Worst`/`Goal`)            | **Missing entirely**                  | No legend component or class; every `legend` hit is `FieldGroup`'s fieldset legend.                                                                                                                                                                                                           |
| **Timeline rows** (date · health dot · change · actor)                                         | **Adaptable**                         | No timeline primitive. The de facto row is `.f95-itemrow` — no date gutter, no health-dot column, no actor line.                                                                                                                                                                              |
| **Labelled divider inside a column set** (`COUNTS AS QUALIFIED ASKS` ∕ `OUTSIDE THE HEADLINE`) | **Missing**                           | Exactly one dashed divider exists in the system; no vertical rule, no labelled break.                                                                                                                                                                                                         |
| **Progress bars** (qualification counter, initiative share)                                    | **Exists**                            | `.f95-progress` (8px track, `--progress--lg` 12px) + `.f95-goalmeta__pct`; a 5px variant inside `QpiBreakdown`.                                                                                                                                                                               |
| **Numbered rank markers** (`#1`, `01`)                                                         | **Exists as markup, not a component** | `.f95-prow__rank` — 44px column, 12px muted `#`, 26px heavy tabular number. Hand-written in 2 files.                                                                                                                                                                                          |
| **Tabs carrying a colour dot** (initiative tabs)                                               | **Missing**                           | `TabItem` is `{id,label,href}`; the component renders a bare label. No icon, no dot, no disabled state — and SCREENS.md needs the Team/All-reps toggle _disabled_.                                                                                                                            |
| **Main + sticky rail** for Opportunity Detail side panels                                      | **Exists**                            | `.f95-overview` — `1fr / 340px` above 960px with a sticky rail.                                                                                                                                                                                                                               |
| **`Open in Keystone →` cross-boundary link**                                                   | **Adaptable**                         | `.f95-analysis-link` — 12px semibold ink-600 inline-flex with a 4px gap, plus a `--muted` modifier.                                                                                                                                                                                           |
| **Six-stage vocabulary** (`Get the visit` … `Repeat`)                                          | **Missing in the data layer**         | `opportunityStageEnum` has 4 values (identification, cultivation, solicitation, stewardship) — `packages/db/src/schema/enums.ts:24-29`.                                                                                                                                                       |
| **Nav entries for the three screens**                                                          | **Missing**                           | The 95 Forward nav group is Today / Prospects / Candidates / Green Sheet / Initiatives + the "Enter visit mode" CTA. No Board, Opportunities or Forecast (`nav.ts:118-163`).                                                                                                                  |

**Two structural notes for whoever builds these.** (a) The system's only precedent for distinguishing
states by **shape rather than colour alone** is `RoleChip` (filled vs dashed + glyph) and
`HorizonTag` (a distinct glyph per value) — worth preserving for a health triad. (b) No `--reg-*`
token carries any status, health or stage meaning, so a war-room health palette has **no existing
register hook** to attach to.

---

## 10. War-room additions (I17b)

What §9 asked for, and what it became. Everything here is in `warroom.css`, `tokens/colors.css` and
`components/ds/`, and every value is a semantic alias — there is no colour literal in any of it.

### 10.1 Charting — `recharts`

The only UI runtime dependency beside `lucide-react`, added deliberately for one chart. §9 found no
charting library, no SVG chart, and every existing "chart" a CSS div bar with no axes, no time
dimension and no band; the BMW cumulative curve had nothing to build on.

**`ForecastChart`** (`components/forecast/`) is the only file in the app that imports it. One
`ComposedChart` covers the whole spec: `Area` for the shaded Best–Worst band, `Line` for Most likely
and Actual, `ReferenceLine` for the dashed goal and the today divider, `ReferenceDot` + `Label` for
the three in-chart end labels. It is one shape on purpose — "one graph to rule them all" is a
stakeholder position, and `SCREENS.md` defers alternative chart types, so a general charting
abstraction would be building for a chart that is explicitly not coming.

The x axis is **numeric time**, not categorical, so the today divider lands on the actual day rather
than snapping to the nearest month.

**Tokens are read in JS.** Recharts styles inline, so a custom property never reaches it.
`readChartTokens()` (`components/forecast/chart-tokens.ts`) reads every colour off
`document.documentElement` — `getComputedStyle().getPropertyValue()` returns a custom property's
_computed_ value, so `--ai-ink → --iris-600 → #4a4f94` arrives resolved — and passes them as props.
Until they arrive the frame renders at full height without the plot: a forecast in browser defaults
is worse than one that is a frame late, and reserving the height means nothing shifts.

**Bundle**, from `next build`: shared First Load JS is **unchanged at ~102–103 kB**. Recharts lands
only on routes that render the chart, where it costs about **+165 kB First Load** (`/design-check`:
268 kB against a 103 kB shared baseline). Every other route moved by less than 0.03 kB. That
containment is what the `"use client"` wrapper buys, and it is the argument for keeping the import
in exactly one file.

### 10.2 The health triad — Moving / Slowing / Stuck

Twelve tokens, four roles each: `--health-{moving,slowing,stuck}` plus `-text`, `-surface`,
`-border`. The solid value of each **is** `--color-success` / `-attention` / `-danger`, which gives
three dead aliases their first consumers — so there is now one status palette rather than a token
layer and a stylesheet that happened to agree.

The values are exactly what `Heartbeat` rendered, which is why `.f95-heartbeat--*` could be re-keyed
onto them without moving a pixel. **Heartbeat keeps its own enum**: `on-track`/`due-soon`/`overdue`
is a follow-up cadence, not deal health, and its three call sites mean the cadence.

- **`StatusLabel`** (`.f95-status`) renders one of the seven queue labels. The wording comes from
  `STATUS_LABEL_TEXT` and the colour from `STATUS_HEALTH`, both in `@95forward/shared`. Neither is
  written on a screen — two sources for one value is how they come to disagree, and the colour
  vocabulary is only learnable while every surface agrees.
- **`HealthDot`** (`.f95-healthdot`) is the bare dot. Colour is its only visible channel, so it
  always carries an accessible name. On the chip the word carries the meaning instead.

### 10.3 Monospace evidence

**`RuleChip`** (`.f95-rulechip`) — `RULE · live-ask-silence`, linking to `/rules/:ruleId`, the
contract I22 fixed for it. All seven ranking rules resolve. The rule id comes from the Rules of Robb
layer; a chip whose text was typed into a screen would go stale the first time an org edited the
rule, which is the failure the chip exists to prevent. `kind` takes `CHECK` for the data-integrity
findings, and `href={null}` renders inert for an id the catalogue cannot resolve.

**`MonoCaption`** (`.f95-monocap`) — consequence lines, column subtitles and inline arithmetic, in
four tones. Mono here means what it means on `SourceTag`: this is evidence, not prose.

Both are the system's first mono + uppercase rules. Both sit at `--fs-micro` (11px), level with
`SourceTag`, and both use `--ls-wide` (0.04em) rather than `--ls-caps` (0.08em).

### 10.4 Cards, accents and links

- **`Card accent`** draws on every tone (§8.2.7). `--_accent` follows `.f95-prow`'s `--_tier`
  precedent: a local the modifier sets, with the fallback as its default.
- **`Card health`** colours that accent from the triad — queue cards and stage chips.
- **`Button href`** renders one `<a>` through `next/link` (§5.5).

### 10.5 Badges, dots and the metric step

- **`MilestoneBadge`** — `THEY SAID` · `WE SAID` · `BLOCKING` · `NOT ASKED`. The they-said/we-said
  asymmetry is the most novel idea in the product, so it is carried by **shape before colour**: what
  the prospect said is solid, filled, with a filled glyph; what we said is an empty dashed outline
  with a hollow one. Print it in greyscale and the distinction survives. `RoleChip`'s filled-versus-
  dashed treatment is the precedent, and §9's structural note asked for it.
  `BLOCKING` is independent of source — `Permission to share publicly` is they-said and non-blocking.
- **`ScenarioBadge`** — `IN ALL THREE` · `MOST LIKELY +` · `BEST ONLY` · `OUTSIDE BEST`.
  **A deliberate deviation from `SCREENS.md`, per the hard rule that the design system wins when the
  change is documented in the same PR.** The design assigns green / **red** / **amber**, which puts
  red in the middle of the ramp. The ladder is ordered — closes even in Worst, then needs Most
  likely, then needs Best, then in no scenario at all — so the palette descends with it: green,
  amber, red, then the dashed Unknown treatment for the fourth. A ladder whose colours are not
  monotonic makes the second-safest band louder than the least safe one and teaches a reader that
  the colours carry no meaning, which costs the health vocabulary everywhere else. The copy is
  exactly as specified; only the palette assignment differs.
- **Initiative dots** — `--initiative-1…5` plus `--initiative-none`, drawn from the identity ramps.
  Brick is excluded: the token comments reserve it for destructive/danger, and an initiative is
  neither. I18 stores a **key** on the initiative and `InitiativeDot` maps it to a token, so renaming
  an initiative cannot change its colour and no screen writes a hue. An unrecognised key falls back
  to neutral rather than guessing — a wrong colour here would silently re-attribute money on the
  stage board. `InitiativeChip` is the dot plus the name.
- **`Metric`** (`.f95-metric`) — one dominant figure, three subordinate, with `sub` for the basis in
  words and `basis` for it in arithmetic. `dominant` binds **`--fs-5xl` (52px)**, which had zero
  consumers: above every heading (h1 is 32px) and deliberately **below** the QPI number's 64px,
  whose binding is untouched. The other orphan, 88px, is the wrong answer for The Board — it is
  already ~66px over its vertical budget at 1280×800, and a headline that costs the queue its first
  card has defeated the screen it leads.
- **`ProgressBar`** rides the existing `.f95-progress`. What is new is the two things none of its
  five existing call sites do: it clamps (two feed raw unclamped percentages straight into a width)
  and it carries a role and an accessible name (none carry either). The five are untouched.

### 10.6 `TabNav`

Navigation tabs marked with `aria-current="page"` — valid on a link, unlike the `aria-selected` the
DS `Tabs` and the six `*Nav` copies set — plus a colour dot per item and a disabled state, for the
Forecast Room's initiative tabs and the undesigned Team / All-reps toggles. The existing 21 sites
are deliberately untouched (§8.2.6).

### 10.7 The verification gallery

**`/design-check`** — unlinked, `notFound()` in production, and rendered **inside the real Keystone
shell**, which is the point of it. `/styleguide` renders bare, and the questions a gallery has to
answer are about context: does the amber read as amber against a card on this background, is an 11px
uppercase mono chip legible, does a 52px headline still read as dominant beside a 264px sidebar. The
forecast chart there runs the **real simulation over the real seed**, because feeding it invented
data would verify the chart against itself rather than against the shape I21 emits.

### 10.8 Three consolidations (I25)

I17b escalated these into I25 because each is one rule, and each would otherwise have been
multiplied by three new screens.

**The stat block.** Settled — see §5.4. One `Card` wraps the block; tiles sit bare inside one
`.f95-statgrid`. The Board runs it horizontally: the dominant figure on the left, the three
subordinate ones stacked beside it, which is what the design shows and what the vertical budget can
afford.

**The eyebrow.** One rule, in `tokens/typography.css`, listing every consumer:

```css
.f95-eyebrow, .f95-overline, .f95-page__eyebrow,
.f95-fieldgroup__legend, .page-placeholder__eyebrow, .f95-visit__eyebrow { … }
```

`.f95-eyebrow` is the base and carries **no margin**, so it works inline — the margin on
`.f95-page__eyebrow` was the whole reason a sixth name got invented. The block contexts keep their
own `margin-bottom` and nothing else; `.f95-eyebrow--quiet` (and Visit mode) step back to
`--text-muted`.

**Muted text.** `.f95-muted` — colour only, so it composes with whatever type the line already has.
`.f95-deflist__desc--empty` resolves to the same rule, which converges its 41 standalone uses
without touching 27 files.

### 10.9 Opportunity Detail (I26)

The screen is composition over I18–I23, plus four additions to the service layer that the design
implied and the model did not have.

- **`coverageWith(opportunityId)`** — the forward-looking inverse of `coverageWithout`. States its
  hypothesis in MILESTONES rather than by patching a status, because qualification is derived from
  the blocking set and has no field to patch; a test asserts it agrees with really qualifying the
  record.
- **`initiativeShare().largestOtherCents`** — the largest qualified ask in the initiative other than
  this one. Without it an unqualified record cannot honestly claim it "would be the largest single
  qualified ask in it", which is the designed copy for exactly that case: `isLargest` is false for
  anything not already counted, and the total says nothing about the biggest part of it.
- **`rankOne(opportunityId)`** — `dayWork`'s per-opportunity scoring, EXTRACTED into a function both
  call rather than reimplemented. The queue shows the top few of the records that fire something;
  this screen must work for any record at all, and a second implementation would eventually disagree
  with the board about the same record in front of the person being coached.
- **`stageNextAction(stage)`** — the fallback for a record no rule speaks for, and two new
  `NextActionKind` members (`get-the-visit`, `steward-the-gift`) that no rule produces. The enum is
  closed to GENERATION, not to growth: an empty NEXT ACTION panel on a screen that opens with a
  verdict would undercut its own argument.
- **`stageCadenceDays(resolved, stage)`** — reads the per-stage cadence off `live-ask-silence`, so
  "CADENCE FOR THIS STAGE · EVERY 14 DAYS" stays true after an org edits its doctrine.

**The one layout constraint worth recording.** `--initiative-1` resolves to blue-600, which also
backs `--role-manager` (§8.1.5). `THE FACTS` puts `Initiative` and `Relationship mgr` three rows
apart, so the initiative there is rendered **without its dot** — the chip with the dot lives in the
page header, far from any role chip. The same blue meaning two things a centimetre apart is the
failure this avoids.
