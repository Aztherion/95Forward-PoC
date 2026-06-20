# 95 Forward — PoC Content & Screen Specification

**For:** Claude Design (wireframes, mock screens, and static resources for the proof-of-concept)
**Companion files:** the *95 Forward Design System "Altitude"* PDF (authoritative for tokens/components) and three early draft screenshots (illustrative of look-and-feel only — **not** final layout or content).

---

## 1. About this document

This is the **content and information-architecture spec** for the PoC. It defines every menu item, every screen, and the content / filters / actions on each — enough that Claude Design can produce believable wireframes and high-fidelity mocks without inventing structure, and enough that we can demo a *complete* product to stakeholders instead of narrating "and then, imagine that…".

**Two layers, on purpose:**

- **The host CRM (the container).** A thin, mostly-static stand-in for a real platform like Raiser's Edge NXT. It exists to give 95 Forward a realistic home. Most of it is placeholder.
- **95 Forward (the product).** The real thing — an opinionated major-gifts operating layer that, in production, is a *plugin* inside the host CRM. In the PoC it's hardwired in, and it appears as an **expandable menu item** in the host's main menu.

**How to read the fidelity callouts.** Each screen is tagged **[Full]**, **[Medium]**, or **[Stub]** (see the fidelity map in §5). Spend the real craft on **[Full]** screens; **[Stub]** screens just need to look credible and clickable.

**A note on the screenshots.** They show the design system's components working in a real scenario (the QPI signature, the copilot card, the MPL row, role chips, the "what we know" panel). Reuse those *components and that feel*. Don't treat their exact layout, the single-scroll prospect page, or the sidebar-without-host-items as settled — this spec supersedes them on structure.

---

## 2. The core idea the PoC must land

A presenter should be able to say four sentences and have the screen do the rest:

1. "This is a nonprofit CRM — constituents, gifts, the usual." *(host CRM, deliberately ordinary)*
2. "Every modern CRM now bolts on an AI that scores your prospects — here's one, a number with no 'why'." *(host Major Giving, black-box likelihood score)*
3. "This menu item is our plugin, 95 Forward." *(click — it expands)*
4. "It turns that black box into a method your team can actually run — and it shows its work." *(the QPI signature, the copilot that proposes-you-dispose, the visit/ask/24h-follow-up loop)*

So the design has to make **the contrast visible**: the host is calm, grey, and competent; 95 Forward is warm, alive, and transparent.

**One design system, two emphasis registers.** Use the Altitude tokens everywhere for cohesion (same type, spacing, components), but pull two different *energies* from the palette:

- **Host register** — neutral and quiet: Haze backgrounds, Ink text, hairline rules, minimal brand color, denser tables, flatter surfaces. It should read as "the data lives here, and that's fine."
- **95 Forward register** — the full Altitude expression: Horizon Blue, Dawn Gold, Sage, Iris, Teal-slate, the QPI signature, the cadence heartbeat, Newsreader for human quotes, soft "go" elevation. Color enters the grey room.

*(If Claude Design wants a stronger contrast, the host may lean cooler/greyer than Altitude's warm neutrals — optional, only if it doesn't double the work.)*

**Two scenarios (we're building the first one now).**
- **Scenario A — plugin (current default):** 95 Forward is an add-on inside a host CRM. This is the "color entering a grey room" approach above — grey host register, full-color 95 Forward register. **Build this.**
- **Scenario B — build-from-scratch (a possible re-take):** if stakeholders decide to build the whole product natively rather than as a plugin, we drop the grey host register and render the **entire** PoC in the full Altitude system. Every page becomes "95 Forward register," 95 Forward stops being an "Add-on," and the host modules become first-class native sections. The content and IA in this spec carry over almost unchanged; what changes is mostly the visual register (the host pages warm up) and the menu framing (no "Add-ons" group). Designing Scenario A cleanly is what keeps that pivot cheap — so build A now, with B in the back of your mind.

---

## 3. Design system quick-reference (from the Altitude PDF)

So this spec is self-contained. The PDF wins on any detail.

**Color roles.** Horizon Blue `#235C86` = primary + Relationship Manager · Dawn Gold `#C8862A` = go/momentum + Today · Sage `#3B7458` = Natural Partner + success · Iris `#4A4F94` = **AI/copilot, reserved — never used for non-AI UI** · Teal-slate `#2F7E8C` = QPI/Philanthropy. Ink is warm slate (never pure black), 900→100. Neutrals: Haze 50 (app bg), Haze 100 (sunken), Haze 200 (fill), White (cards).

**QPI five parts (each its own hue), weighted per the methodology:** Capacity (max 35), Relationship (30), Timing (15), Gift History (10), Philanthropy (10). Each part's points are a **1–5 rating × the dimension's weight** (7 / 6 / 3 / 2 / 2), so they sum to 100. **Funding horizons** Today → Tomorrow → Forever read as a near→far gradient (gold→blue).

**Type.** Hanken Grotesk = all UI/body (Display 40 / H1 32 / H2 26 / Title 18 / Body 15 / Overline 11). Newsreader (serif) = **human moments only** (donor quotes, the words of an ask). IBM Plex Mono = **evidence/provenance only** (source tags like `IRS 990-PF · 2024`, `LinkedIn`, mono score fragments `CAP 24/25`). The score figure (`92/100`) is tabular, heavy, display.

**Shape & motion.** 4px spacing grid (8/12/16/24/32/48/64); radii 6/10/14/pill; soft ink-tinted elevation (sm/md/lg/go). Motion is calm ease-out (6px rise + fade); the **signature motion is the cadence heartbeat** — a ~2.6s pulse on follow-up indicators that makes the 24-hour clock *felt*. Respect reduced-motion.

**Signature components.** QPIScore (the headline number + "GO — SEE THEM TODAY" state + expandable "hide the math" breakdown with per-part bars, evidence tags, and "the copilot proposes this score. You decide. / Adjust the score"); the Copilot suggestion card (iris-bordered, "COPILOT SUGGESTS", source tag, before→after, Approve / Edit / Dismiss); RM chip (blue, filled avatar) vs Natural Partner chip (sage, outline); horizon pills; the cadence heartbeat badge ("Follow up by tomorrow · 18h left"); the "Go today / 90+" gold-bordered card; source/provenance tags in mono; **"Unknown — worth researching"** as a calm, inviting state, never a red error. **No emoji, ever.** Icons: Lucide, 1.8px line, 15–20px.

---

## 4. Global shell (every screen)

### 4.1 Left sidebar — the main menu

Host brand at the very top (a neutral, generic CRM wordmark — see §11 for the placeholder name). Menu order, grouped:

| Group | Item | Expands to | Register | Fidelity |
| --- | --- | --- | --- | --- |
| *(host core)* | **Home** | — | Host | [Full] |
| | **Constituents** | — | Host | [Full] |
| | **Revenue** | — | Host | [Full] |
| | **Major Giving** | Opportunities · Proposals · Portfolio | Host | [Full] (the foil) |
| | **Lists** | — | Host | [Medium] |
| **ADD-ONS** | **▾ 95 Forward** | Today · Prospects · Green Sheet · Initiatives | 95 Forward | [Full] |
| | *(within 95F)* **Enter visit mode** | launches full-screen visit mode | 95 Forward | [Full] |
| *(host more)* | **Marketing** | — | Host | [Stub] |
| | **Events** | — | Host | [Stub] |
| | **Volunteers** | — | Host | [Stub] |
| | **Memberships** | — | Host | [Stub] |
| | **Analysis** | — | Host | [Medium] |
| *(bottom)* | **Settings** | incl. a 95 Forward settings sub-page | both | [Stub] / [Medium] |
| | **User chip** — Dana Reese · Riverside Children's Fund | account menu | — | [Full] |

**The "ADD-ONS / 95 Forward" framing is doing real work** — it tells the plugin story at a glance. 95 Forward carries its own mark (the rising chevron + gold dot) and a subtle accent so it's the obvious focal point even in a grey menu. Host items are muted Ink; the active 95 Forward item and its children get the brand treatment.

**Expand behavior.** Collapsed, 95 Forward is one branded row. Activating it expands the four children inline (this is the behavior the founders described). "Enter visit mode" sits at the foot of the 95 Forward group as a distinct call-to-action, not a normal nav row — it launches a focused full-screen mode (§7.5).

### 4.2 Top bar

Global search ("Search prospects" inside 95 Forward; "Search constituents, gifts…" in host context), an **Add** action (contextual: "Add prospect" in 95F, "Add constituent" in host), and on 95 Forward screens a small **page descriptor** under the title (e.g. "The whole picture — and the next right move"). Keep a notifications/bell affordance for realism (static).

---

## 5. Fidelity map

- **[Full] — design these properly, make them feel alive:** the global shell + menu; Host Home, Constituents (list + record), Revenue (list), Major Giving (the black-box foil); and **all** 95 Forward screens (Today, MPL, Prospect detail + tabs, Green Sheet, Visit mode, Initiatives, 95 Forward settings page). *Initiatives is in, but keep it lean — a list + a simple detail page (see §7.6); the value is in how it threads through the rest, not in its own complexity.*
- **[Medium] — a styled static page with representative content:** Lists, Analysis.
- **[Stub] — header + one representative panel + a quiet "Static in this PoC" note:** Marketing, Events, Volunteers, Memberships, Settings (host portions).

---

## 6. Host CRM pages (the container — mostly placeholder)

Keep these in the **host register**: calm, grey, competent, a little dense. They prove context; they don't compete.

### 6.1 Home  [Full]
A dashboard of tiles (static): **Recent gifts** (constituent · amount · type · date), **Year-over-year fundraising** (a simple bar/line), **Active donor growth** (a stat with trend), **Tasks/Actions due** (a short list), and — important — a **"Major gift likelihood"** insight tile showing a blunt black-box number ("12 donors trending toward a major gift") with a generic "AI" mark and no explanation. Add one quiet **"95 Forward"** promo tile ("Your major-gifts workspace → Open") that deep-links into 95F. This screen seeds the contrast before the click.

### 6.2 Constituents  [Full]
The records backbone. Stakeholders expect this to look real.

- **List columns:** Name · Type (Individual/Organization/Foundation) · Lifetime giving · Last gift (amount + date) · Last contact · Prospect status · City/Region · Assigned to.
- **Filters:** Constituent type · Gift amount/date ranges · Last contact recency · Prospect status · Assigned fundraiser · Tags (e.g. "Lapsed", "Upcoming birthday", "Board member") · Location. *(AND logic, like RE NXT.)*
- **Sort / search / saved lists;** row action = open record; bulk = add to list / assign.
- **Constituent record (placeholder):** header (name, type, photo/initials, prospect status, lifetime giving, "Open in 95 Forward" link if they're a prospect) + tabbed sections **Profile · Giving history · Relationships · Actions · Tags · Volunteer**. Populate Giving history with a few real-looking rows. This is static but should feel complete.

### 6.3 Revenue  [Full]
- **List columns:** Constituent · Amount · Date · Fund · Campaign · Appeal · Gift type (cash/pledge/recurring/in-kind) · Receipt status.
- **Filters:** Date range · Amount range · Fund · Campaign · Appeal · Gift type. Summary strip up top (total raised, # gifts, average gift) — static.

### 6.4 Major Giving (host's generic version — **the foil**)  [Full]
This is the deliberate contrast to 95 Forward. Sub-tabs:

- **Opportunities** — pipeline rows: Constituent · Stage (Identification → Cultivation → Solicitation → Stewardship) · Ask amount · Expected amount · Expected close · **Likelihood** (a flat black-box "72%" with a generic AI glyph and *no* breakdown) · Owner.
- **Proposals** — Constituent · Purpose · Amount · Status · Deadline.
- **Portfolio** — the fundraiser's assigned constituents as a plain grid.

Keep it competent but opaque — an "Insights" side panel that asserts conclusions without showing why. The presenter points here and says "a score with no story," then opens 95 Forward.

### 6.5 Lists  [Medium]
Four list categories — **Actions · Constituents · Gifts · Opportunities** — with a filter-builder UI (AND logic) and customizable columns (first gift, last gift, greatest gift, lifetime giving). One representative built list shown statically.

### 6.6 Analysis  [Medium]
A reports/dashboards gallery (tiles: Fundraising performance, Donor retention, Campaign progress, Appeal analysis) opening one static dashboard with charts. Generic, credible.

### 6.7 Marketing · Events · Volunteers · Memberships  [Stub]
Each: a titled page with one representative static panel and a quiet "Static in this PoC" note. (Marketing → an email/appeals list; Events → an events table; Volunteers → a volunteer roster; Memberships → membership tiers.) Just enough that the menu isn't hollow.

### 6.8 Settings  [Stub] (+ a [Medium] 95 Forward sub-page)
Host settings as stubs (Users, Fundraising config: Campaigns/Funds/Appeals, Integrations). **One sub-page matters:** *Settings → 95 Forward*, where the **QPI weights** are shown and editable (the five dimensions and their point allocations), seeded with our defaults — this is where we demonstrate "the score is configurable and explainable, not a black box." [Medium]

---

## 7. 95 Forward (the product — full detail)

Everything here is **[Full]** and in the **95 Forward register**. Sample cast and data in §10 — use it consistently across all screens.

### 7.1 Today — the daily focus screen
**Purpose:** the first thing Dana opens each morning: "where do I point my attention today?" Action over archive.

**Regions (top to bottom):**
- **Your next right moves** — 2–4 cards for the highest-priority unactioned prospects (90+ first), each: QPI badge, name, descriptor, the one move ("Go see them today", "Tom can open the door this week"), and a primary action (**Plan the visit** / **Log a touch**).
- **Follow-ups due** — the 24-hour SLA queue, each row carrying the **cadence heartbeat** ("Follow up by tomorrow · 18h left", pulsing). Overdue items use the Attention state, not alarm-red. Action: open the drafted follow-up (copilot-written, see §8).
- **Today's visits** — anything scheduled, with time, prospect, the priority to discuss, and **Enter visit mode**.
- **From your copilot** — a compact roll-up of pending copilot suggestions across the portfolio ("6 suggestions to review"), linking into the prospects.
- **Coverage nudge** (quiet) — e.g. "4 of your Top 33 have no active strategy" → links to those prospects.

**Filters/controls:** scope toggle (Me / Team) for leadership; date is "today" by default.

### 7.2 Prospects → Master Prospect List (MPL)
**Purpose:** the spine of the product — *one* ranked list of people, companies, and foundations, ordered by QPI. Ranking is sacred; #1 genuinely outranks #40.

**Prospects holds two views:** the **Master Prospect List** (default — the ranked, confirmed prospects, below) and a secondary **Candidates** view (§7.8 — the off-list staging area for AI-discovered people, never mixed into the ranked list).

**Header:** title "Master Prospect List", descriptor "One ranked list — people, companies, and foundations together", **Search prospects**, **Add prospect**, and a meta line "N on the list · ranked by QPI".

**"Your next right move" banner** (top of list): the single highest-priority unactioned prospect as a hero card — large QPI, name, "QPI 90+ — go see them today. Follow up in 18h.", **Plan the visit**. (Matches the screenshots.)

**Filters (as pills + a filter menu):**
- **Funding horizon:** All · Today · Tomorrow · Forever (primary pills, as shown).
- **Relationship Manager:** Mine · by person (Dana / Priya / …).
- **QPI band:** 90+ ("Go today") · 70–89 · 50–69 · under 50.
- **Entity type:** Individual · Company · Foundation.
- **Stage / cadence:** Follow-up due · Visit planned · Research stage · No contact yet.
- **Focus:** Top 33 toggle · Unvisited 90+ · Has open copilot suggestion.
- **Initiative / priority:** by funding initiative (§7.6).
- **Interest / sector:** youth, education, ESG, etc.

**Default sort:** QPI descending (the rank). Allow re-sort but always show the rank number.

**Row content (the MPL row component):** rank `#1` · avatar/initials · **Name** · descriptor ("Private foundation · Capital campaign") · **RM chip** (blue, avatar) · **Natural Partner chip** (sage, outline; absent if none) · **horizon pill** · **cadence indicator** ("Follow up in 18h" / "Last contact 6d" / "Visit planned Thu" / "Research stage" / "No contact yet") · **QPI score**.

**Row actions:** open prospect (whole row) · **Plan the visit** · **Log a touch** · quick-set horizon · quick-assign RM/Natural Partner (inline). **Bulk:** assign RM · set horizon · add to initiative.

**States:** a prospect with QPI unknown shows a calm "Not yet scored — add what you know" rather than a blank or zero.

### 7.3 Prospect detail
**Purpose:** "the whole picture — and the next right move." A rich **Overview** plus deeper tabs. (The screenshots show the Overview as a two-column scroll; keep that richness, add tabs for depth.)

**Header (all tabs):** Back to the list · **Name** · entity-type tag (Foundation/Individual/Company) · "#1 on the list" · descriptor · **RM chip** · **Natural Partner chip** · **horizon pill**.

**Right rail (persistent on Overview): "The next move"** — the cadence headline ("Follow up by tomorrow"), one humane line of why ("Tom can open the door this week. Fast and good beats slow and perfect."), and actions **Plan the visit** + **Log a touch**.

**Tabs:**

**(a) Overview** *(default)*
- **QPI signature** — the headline `92/100`, the **GO — SEE THEM TODAY** state, "Updated 6h ago", and the expandable **Hide the math**. **Score the five parts by the methodology weights — not arbitrary maxes.** Each part is a **1–5 rating × its weight**, so the maxes are **Capacity /35, Relationship /30, Timing /15, Gift History /10, Philanthropy /10** (summing to 100), and a part's points are always a multiple of its weight (Capacity ∈ 7/14/21/28/35 · Relationship ∈ 6/12/18/24/30 · Timing ∈ 3/6/9/12/15 · Gift History & Philanthropy ∈ 2/4/6/8/10). Each part shows its points out of its own max, a bar filled proportionally, a one-line human rationale, and either a mono provenance tag or an **"Unknown — worth researching"** chip. Hartwell's breakdown:
  - Capacity 35/35 *(rating 5)* — "Foundation assets ≈ $40M; granted $1.2M to peer orgs last cycle — can give at the top level." `IRS 990-PF · 2024`
  - Relationship 24/30 *(rating 4)* — "Board chair Eleanor Hartwell is a personal friend of our ED, Ruth; the institutional relationship is still being built." `Logged · Dana R.`
  - Timing 15/15 *(rating 5)* — "Their giving committee meets in Q3 — the campaign window is open now." `Logged · Dana R.`
  - Gift History 8/10 *(rating 4)* — "Three gifts over five years ($25K → $40K → $60K), trending up." `Gift records`
  - Philanthropy 10/10 *(rating 5)* — "Actively funds peer youth organizations — $1M+ to peers last year." `IRS 990-PF · 2024`
  - Footer: "The copilot proposes this score. You decide." · **Adjust the score**.
  - **Where "unknown" shows up:** Hartwell is the best-understood prospect, so all five parts are known. Demonstrate the **"Unknown — worth researching"** state in the QPI on a *research-stage* prospect instead (Beaumont Trust, Cardinal, Aisha Bello), where Capacity — and often Relationship — genuinely aren't known yet, take the minimum rating, and *that's why* the QPI is lower. The model stays self-consistent: unknowns pull the score down rather than being hidden.
- **What we know** (Knowledge Base summary) — a compact key/value list with provenance, headed by "Gaps are invitations, not errors": Estimated capacity `$250,000` `copilot` `IRS 990-PF · 2024` · Giving focus "Youth & education" `990-PF Schedule` · Last gift "$60,000 · Mar 2024" `Gift records` · Wealth screen "+ Unknown — worth researching" · Spouse/connections "Eleanor Hartwell (chair)" `Board minutes`.
- **From your copilot · N to review** — stacked copilot suggestion cards (Approve / Edit / Dismiss), e.g.:
  - "Capacity looks higher than recorded — the foundation gave $1M+ to peer orgs last year." `$50K → $250K` `IRS 990-PF · 2024`
  - "Tom Bradley (board) sits on the Hartwell giving committee. Strong Natural Partner to open the door." `LinkedIn · Board roster`
- **Recent activity** — reverse-chronological touches: "Coffee with Tom Bradley — he'll make the intro · 6 days ago · Dana R." / "Sent youth-program impact brief · 3 weeks ago · Dana R." / "$60,000 annual gift received · 2 months ago · Gift records".

**(b) Knowledge Base** — the full research worksheet behind the summary: capacity & its source, relationship to cause/case, connectors, gift history (last/largest/total), other philanthropy, timing, and an explicit **Research gaps** section (each gap a calm "worth researching" item with an "ask the copilot to research" affordance). **For Foundation/Company prospects only:** a **Relationship map** — the org/board structure and key decision-makers (program officer, board chair, giving-committee members), each with role, decision power, and any warm path. (For individuals this tab is lighter — the donor is usually the decision-maker.)

**(c) Strategy** — from the method's Prospect Strategy: relationship goals, hooks / areas of interest, likely objections, predisposition plan (how to warm the path — connector intro, campus/experience invite), presentation design (the priority to lead with), and the action plan / next steps. Copilot can draft any of these as suggestions.

**(d) Visits & Asks** — the execution history and plan:
- **Visits:** planned + completed, each with goal, who was present, the priority discussed, the debrief/call-memo, outcome, next step, and the follow-up it triggered. **Plan a visit** action → can hand off to Visit mode.
- **Asks:** ask records with **amount or range**, the **initiative/priority it funds** (links to §7.6), its **funding frame** (Today/Tomorrow/Forever, inherited from the initiative), ask type, a "numbers on the table" indicator, and **outcome = Commitment / Decline / Roadmap** (with commitment detail or roadmap next-steps). **Log an ask** action.
- **Referrals:** captured from visits — referred person, "may we use your name?", "will you send a note?", relationship to referrer; each can spawn a new prospect.

### 7.4 Green Sheet — the team scoreboard
**Purpose:** momentum made visible. Method-native activity/productivity, not vanity revenue. Motivating, calm, scannable.

**Controls:** time range (This week / This month / Quarter) · scope (Me / each RM / Team).

**Tiles & panels:**
- **Visits this week** (count + tiny trend) · **Asks this month** (count) · **Follow-ups within 24h** (a compliance %, the SLA we care about).
- **Top 33 coverage** — % of Top 33 with an assigned RM, and % with an active strategy (the coverage nudge, quantified).
- **Asks by outcome** — Commitment / Decline / Roadmap split (a simple stacked bar). "Roadmap" is a *good* outcome, styled as Info, not failure.
- **Referrals per visit** — the relationship-compounding metric.
- **Pipeline by horizon** — Today / Tomorrow / Forever distribution (the near→far gradient), counts and totals.
- **By Relationship Manager** — a small table: RM · Top-33 coverage · visits · asks · 24h follow-up % (leadership view).

### 7.5 Visit mode — the in-the-moment companion (Register B)
**Purpose:** a calm, focused, full-screen mode the fundraiser uses *during* (and right after) a visit. This is the methodology's "engagement tool" — present at your side, never dominating the human conversation. Quiet, large readable type, low chrome; works down to tablet/phone. Newsreader serif for the words of the ask.

**Three phases:**
- **Before** — the visit goal (one line), the **priority** to lead with, 4–6 **discovery / power questions** (large, one at a time or as a short list), the **planned ask** (amount + frame), the **Natural Partner/connector** opening the door, and a tight "what we know" (3–4 facts). One **Start the visit** action.
- **During** — minimal: the current question/prompt big and centered; quick-capture chips along the bottom (**Note**, **Capture a referral**, **Log an objection**); and a calm **Make the ask** affordance that surfaces the ask wording (serif) and the amount.
- **After (debrief)** — capture the outcome (**Commitment / Decline / Roadmap**), the "numbers on the table", the next step, and a **copilot-drafted 24-hour follow-up** ready to approve/edit. Capturing the debrief **starts the 24h follow-up heartbeat** and writes the visit + any referrals back to the prospect. End → return to Today with the follow-up now live in the queue.

### 7.6 Initiatives (funding priorities) — [Full], but lean
**Purpose:** the Today/Tomorrow/Forever framing as real objects, so every ask attaches to something concrete instead of floating. This is what stops the product from quietly re-creating the annual-fund / campaign / endowment silos the method rejects — there's one set of *initiatives*, each tagged with a frame, and asks point at them. Keep the build small: a **list** + a **simple detail page**. The value is in how it threads through, not its own complexity.

**Initiatives list:** each row = name · **funding frame** pill (Today/Tomorrow/Forever) · goal amount · raised-to-date (a slim progress bar) · open asks (count) · timeline. Filter by frame. **Add initiative** action.

**Initiative detail:**
- **Header** — name · frame pill · goal · progress (raised / committed / in roadmap toward goal) · timeline.
- **The story** — a short narrative of why this matters (the method's "design your story"); the one-line case can render in **Newsreader** as a human moment. The copilot can draft a **funding rationale** here (gap / project / "widget" — e.g. "$2,500 funds one child for a year").
- **Prospects & asks on this initiative** — a compact table of the prospects working toward it: name · QPI · RM · ask amount/frame · outcome (Commitment/Decline/Roadmap). Rows link back to the prospect.

**Where it threads through (the actual payoff):** the MPL "Initiative / priority" filter (§7.2); the Ask record's "initiative it funds" link (§7.3d); the prospect's funding frame (inherited from the initiatives they're attached to); and the Green Sheet's "Pipeline by horizon" panel (§7.4), which is really pipeline-by-initiative rolled up to Today/Tomorrow/Forever.

**Sample initiatives (use these — they tie the cast together):**
- **Riverside Youth Center — Capital Campaign** · *Tomorrow* · goal $5M · multi-year. *(This is the "Capital campaign" in Hartwell's descriptor; Hartwell's ask attaches here.)*
- **After-School Program — 2026 Operating** · *Today* · goal $400K · this fiscal year. *(Current-year program capacity; a natural home for Sandra Kim's first ask.)*
- **Legacy & Endowment Fund** · *Forever* · goal $10M · open-ended. *(James & Eleanor Okoro's "legacy interest" attaches here.)*

### 7.7 95 Forward settings — [Medium]
The QPI weights page — the five dimensions with their methodology weights (**Capacity 7 · Relationship 6 · Timing 3 · Gift History 2 · Philanthropy 2**, i.e. maxes of 35 / 30 / 15 / 10 / 10), editable and seeded with these defaults — plus toggles for copilot behavior (e.g. "let the copilot research public sources") and the privacy/data note. This is where we *show* that the score is ours to tune.

### 7.8 Connector-based discovery (candidates) — [Full], but lean
**Purpose:** the *front* of the referral funnel. Given a **known contact (a connector)** and an **initiative**, the copilot runs a long-running research task to surface candidate people that connector could plausibly introduce — matched to that initiative — each with the public evidence behind it. The point is to turn the ask for referrals from "can you think of three names?" into "here are ten our research surfaced — pick the three you'd actually introduce us to." Keep the build lean: an entry action, a task state, a grouped candidates view, and the candidate card.

**Entry points:** a **Find introductions** action on a person's record (demo it on Sandra Kim's prospect record — she's both a prospect we're cultivating *and* a connector with a network), plus a **New introduction search** action inside the Candidates view, and optionally from an Initiative page. Either way you pick (or create) the **connector** and the **initiative**, then run.

**The long-running task (a new pattern — see §8).** Unlike inline suggestions, this runs for minutes and returns a *batch* asynchronously: **Requested → Researching… → N candidates ready to review.** Show the "researching" state and a "ready to review" notification on **Today** / the copilot tray. (In the mock it's never run live — show a finished batch, and one batch mid-"researching" for the pattern.)

**The Candidates view — grouped, and firmly off the MPL.** Candidates live under **Prospects** as a secondary view (§7.2), never on the ranked list. They are **grouped by task**, and a task is keyed on **connector × initiative**. So the view is a list of batches, each headed:

> **Introductions via Sandra Kim · for the After-School Program · 12 candidates · ready**

Expand a batch to the candidate cards. Filter by connector, initiative, and status. A connector's own record also shows "Introductions sourced via this person," so the relationship reads both directions and one connector can source for several initiatives (grouped under them, sub-grouped by initiative).

**Candidate card (hypothesis-grade, evidence-backed):** name · confidence · **evidence for the connection** (public receipts for the plausible link to the connector — co-board seat, co-investment, co-signed letter) · **evidence for the affinity** (why they'd care about *this* initiative) · status. Framed explicitly as a *hypothesis for the connector to react to*, not a verified prospect. "No public connection found" is a valid, first-class outcome — the "unknown is fine" rule applied to relationships; the agent never asserts a private relationship it can't evidence.

**Validation flow → into the existing pipeline.** AI proposes → the fundraiser curates → the **connector validates** (in the call, picks who they'll introduce) → endorsed candidates become **intro requested** → on a successful intro they're **promoted to a prospect on the MPL**, and the connector is **automatically set as that prospect's Natural Partner** (the warm path is already known). This is the front end of the same Referral → Prospect funnel the spec already models at the back (§7.3d): *connector* and *Natural Partner* are the same concept at two stages.

**Data shape:**
- **Discovery task** = connector (person reference) + initiative (reference) + status (researching / ready / reviewed) + timestamp.
- **Candidate** = belongs to a task (inherits its connector + initiative) + name + evidence-for-connection + evidence-for-affinity + confidence + status (suggested → endorsed → intro requested → promoted / dismissed).
- The **connector is a first-class person reference** (an existing constituent/prospect *or* a lightweight new contact — the known contact often isn't a prospect themselves), so grouping/filtering is reliable and never a free-text "wild list."

**Sample batch (fictional — do not use real public figures):** *Introductions via Sandra Kim · for the After-School Program — ready, 12 candidates.* Show three cards, e.g.:
- **Lena Petrov** — confidence: medium. Connection: `co-director, Bay Area STEM-Access Fund`. Affinity: `funded two youth-coding nonprofits, 2023–24`.
- **David Osei** — confidence: high. Connection: `co-signed the 2024 youth-education open letter`. Affinity: `family foundation focuses on under-12 literacy`.
- **Priscilla Vance** — confidence: low. Connection: `both spoke at the 2025 EdTech for Good summit`. Affinity: `Unknown — worth researching`.

**Handle with care (a note for us, not a design instruction):** this runs OSINT on private individuals who haven't opted in. The design choices above (evidence shown, hypothesis-grade framing, off the MPL, "no connection found" allowed) are what keep it on-brand and defensible — but the broader privacy/ethics posture (data-protection regimes, donor norms) is a founder call to confirm before this graduates from a demo to a shipped feature. See §11.

---

## 8. Cross-cutting patterns (apply everywhere in 95 Forward)

- **Copilot = proposes, you dispose.** Every AI output is a provisional **iris-bordered** surface with **Approve / Edit / Dismiss**, a source/provenance tag, and (for value changes) a before→after. Nothing is ever applied silently. Never use iris for non-AI UI.
- **Human vs AI is always legible.** Facts "entered by you" (neutral, with `Logged · Dana R.`) look distinct from "Copilot suggests" (iris). A viewer can always tell which is which at a glance.
- **Provenance in mono.** Grounded facts carry a small `IBM Plex Mono` source tag (`IRS 990-PF · 2024`, `LinkedIn · Board roster`, `Gift records`). A **missing** source reads as **"Unknown — worth researching"** — a calm invitation, never a red error.
- **The cadence heartbeat** pulses (~2.6s) on follow-up indicators wherever the 24h SLA is in play (Today, MPL rows, prospect rail, visit debrief). It's the product's pulse; use it sparingly and only there.
- **Empty/unknown states are invitations.** "Not yet scored — add what you know", "No research yet — the copilot can help", "No referrals captured yet". Direction, not apology.
- **Long-running agent tasks** (distinct from inline suggestions). Some copilot work runs for minutes and returns a *batch* asynchronously (§7.8). Pattern: kick it off → a calm **Researching…** state → a **"N ready to review"** notification on Today / the copilot tray → reviewed as a batch. Not the one-second Approve/Edit/Dismiss of inline suggestions.
- **Hypothesis-grade, off-list candidates.** AI-*discovered* people (vs. AI suggestions about people already in your data) are explicitly provisional and **evidence-backed**, live **off the ranked MPL** until a human and the connector validate them, and carry a confidence level. "Couldn't verify" / "no connection found" is a valid output, not a gap to paper over.
- **Motion** is calm ease-out (6px rise + fade) on entrances; the heartbeat is the only persistent motion. Respect reduced-motion.

---

## 9. Suggested demo click-path (for the presenter, and to guide which transitions matter)

1. **Home** — ordinary CRM; pause on the black-box "major gift likelihood" tile.
2. **Major Giving → Opportunities** — "a score with no story." Linger on the opaque 72%.
3. Click **95 Forward** in the menu — it **expands**. Open **Today**.
4. **Today** — "here's where my attention goes," point at a 90+ next-right-move and the pulsing follow-up.
5. **Prospects (MPL)** — the one ranked list; the "your next right move" banner.
6. Open **Hartwell Family Foundation** → **Overview**.
7. **QPI → "Hide the math"** — *the* moment: the black box, opened. Five parts, each with a reason and a source, "you decide."
8. **From your copilot** — **Approve** the capacity suggestion ($50K → $250K) and the Tom-Bradley Natural-Partner suggestion. Watch "what we know" update.
9. **Plan the visit → Enter visit mode** — the calm companion; the discovery questions; the ask in serif.
10. **Debrief** — log a **Roadmap** outcome; the **24h follow-up** drafts itself and the heartbeat starts.
11. **Green Sheet** — "and here's how the whole team's momentum looks." Land on 24h-follow-up % and Top-33 coverage.

**Optional showcase (the "wow" aside):** from **Sandra Kim's** record, hit **Find introductions** for the **After-School Program** → open the **Candidates** view and the batch *"Introductions via Sandra Kim · 12 candidates."* Walk two or three cards and their evidence — "this is the AI-sourced warm-intro list she'd react to on a call." Use it where it lands best (often right after the MPL, or as a closer); keep it clearly *hypothesis-grade*.

Each numbered transition should be smooth and obvious in the mocks; steps 7–10 are the heart of the pitch.

---

## 10. Sample cast & data (use consistently across all mocks)

- **Org:** Riverside Children's Fund. **Host CRM brand (placeholder):** see §11.
- **Logged-in user:** **Dana Reese** — frontline major-gifts fundraiser / Relationship Manager.
- **Other staff:** **Priya Nair** (RM); **Ruth Castellanos** (Executive Director, "our ED Ruth").
- **Natural Partners / connectors:** Tom Bradley (Hartwell board), Sofia Lin, Marcus Webb.
- **The Master Prospect List (8 rows, ranked):**

| # | Name | Descriptor | RM | Natural Partner | Horizon | Cadence | QPI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Hartwell Family Foundation | Private foundation · Capital campaign | Dana Reese | Tom Bradley | Today | Follow up in 18h | 92 |
| 2 | Maria Alvarez | Retired CEO, Alvarez Foods · In district | Dana Reese | Sofia Lin | Tomorrow | Last contact 6d | 84 |
| 3 | Okoro Logistics | Regional employer · ESG budget | Priya Nair | — | Tomorrow | Visit planned Thu | 78 |
| 4 | James & Eleanor Okoro | Longtime donors · Legacy interest | Dana Reese | Tom Bradley | Forever | Last contact 12d | 71 |
| 5 | The Beaumont Trust | Community trust · Youth programs | Priya Nair | Marcus Webb | Tomorrow | Research stage | 66 |
| 6 | Sandra Kim | Tech founder · New to the org | Dana Reese | — | Today | Follow up in 3d | 58 |
| 7 | Cardinal Manufacturing | Family business · Matching program | Priya Nair | — | Tomorrow | Research stage | 49 |
| 8 | Dr. Aisha Bello | Board member's colleague | Dana Reese | Tom Bradley | Forever | No contact yet | 41 |

- **Hartwell QPI breakdown (methodology-weighted):** Capacity 35/35 *(rating 5)* · Relationship 24/30 *(4)* · Timing 15/15 *(5)* · Gift History 8/10 *(4)* · Philanthropy 10/10 *(5)* → **92/100** (rationales and sources in §7.3a).
- **Hartwell facts:** assets ≈ $40M; gifts $25K→$40K→$60K over five years; last gift $60,000 (Mar 2024); board chair Eleanor Hartwell (friend of ED Ruth); giving committee meets Q3.
- **Sample initiatives:** Riverside Youth Center — Capital Campaign *(Tomorrow)* · After-School Program — 2026 Operating *(Today)* · Legacy & Endowment Fund *(Forever)*. Details and which prospects attach to each are in §7.6.
- **Sample discovery batch:** *Introductions via Sandra Kim · for the After-School Program · 12 candidates · ready* — three illustrative cards (Lena Petrov, David Osei, Priscilla Vance) with fictional evidence, detailed in §7.8. Candidates live off the MPL. **No real public figures anywhere in the mock.**

---

## 11. Open items to reconcile (flagging, not blocking)

- **QPI weights — decided, do this.** Split the 100 points by the methodology: **Capacity 35 / Relationship 30 / Timing 15 / Gift History 10 / Philanthropy 10**, where each part is a 1–5 rating × its weight (7 / 6 / 3 / 2 / 2). The draft screenshots' 25/25/20/15/15 split is superseded — **every mock uses these weights** (see §3, §7.3a, §7.7), and the §7.7 settings page seeds them as the editable defaults.
- **Host CRM brand name.** I've left it as a neutral placeholder — suggest **"Keystone CRM"** (clearly fictional, nonprofit-flavored) as a stand-in for "a platform like Raiser's Edge NXT." Swap freely; just keep it understated so 95 Forward stands out.
- **Initiatives — decided, in.** §7.6 ships in the first mock set (Full, but lean — list + detail). It carries the Today/Tomorrow/Forever story and is what asks attach to.
- **Connector-based discovery — decided, in.** §7.8 ships (Full, but lean). The candidates area lives under Prospects, off the ranked MPL, grouped by connector × initiative.
- **OSINT privacy/ethics posture — open, before it ships (not before it's mocked).** Connector-based discovery researches private individuals who haven't opted in. The mock is fine with the on-brand framing in §7.8; but settle the broader posture (data-protection regimes for any EU subjects, donor-privacy norms, internal comfort) before this becomes a live feature.
- **Whole-list discipline.** The MPL must stay *one* list. Resist any stakeholder pull toward separate tabs per entity type or per campaign — that's the exact silo the method rejects. (Filters, yes; separate lists, no.)
