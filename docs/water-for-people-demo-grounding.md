# Water For People — PoC Demo Grounding & Seed Basis

Re-bases the demo on the **real** organization Water For People (waterforpeople.org). Replaces the fictional "Riverside Children's Fund" cast in content-spec §10. Feeds the seed scripts and the implementation plan.

## 0. What's real vs. illustrative vs. fictional (read first)

- **Real (researched, use accurately):** the organization, its mission, the _Everyone Forever_ model, geography, scale, real giving programs, thematic lenses, address/EIN.
- **Illustrative (constructed for the demo, grounded in real programs):** the **initiatives** and their goal amounts — Water For People's actual internal campaign list isn't public, so these are realistic constructs in the shape of their real work. Flag them as illustrative.
- **Fictional (must stay fictional):** all **individuals** — staff/users, prospects, donors, connectors, and discovery candidates. Same reasoning we locked earlier (the Eric-Schmidt point): you can't attach fabricated QPI scores, capacities, gift histories, or AI-_inferred_ connections to real people. Real org, fictional people.

## 1. Organization profile (real)

- **Name / host setup:** the customer org is **Water For People**; the host CRM product remains the fictional **Keystone CRM** (our Raiser's Edge NXT stand-in). Sidebar: "Keystone CRM" with sub-label "Water For People."
- **Mission:** promote high-quality drinking water and sanitation services, accessible to all, sustained by strong communities, businesses, and governments. **Vision:** a world where every person has reliable, safe water and sanitation — **#EveryoneForever**. Water is a human right.
- **Founded** 1991 in Denver by the American Water Works Association (founders Ken Miller, Wayne Weiss, Jack Mannion). **HQ:** Greenwood Village, CO (Denver metro), "Global Hub." 501(c)(3), EIN 84-1166148. **Revenue** ≈ $36M (2024).
- **Where they work (nine countries):** Bolivia, Guatemala, Honduras, Nicaragua, Peru (Latin America); Malawi, Rwanda, Tanzania, Uganda (Africa); India (e.g., Birbhum). District-level, scaling nationally.
- **Real giving programs (use these to make the host CRM authentic):** one-time **Donate**; monthly giving — **Wavemaker**; **Legacy Giving** (planned giving); **Corporate Partnerships**; peer-to-peer **Fundraise**; **Events**; **Volunteer**; Giving in Canada.
- **Thematic lenses (great prospect "hooks"/affinities):** Climate, Health, Women, Education, Livelihoods.
- **Real major funder _archetypes_ (mirror these with fictional names):** large WASH/global-dev foundations, beverage/consumer-goods corporates with water-stewardship mandates, faith-based charities, Denver/Colorado family foundations, peer water orgs, and HNW individuals.

## 2. Everyone Forever → Today / Tomorrow / Forever (the product fit)

Their model maps cleanly onto the funding horizons — lean into it:

- **Today** = reaching **Everyone** in an active district _now_ (current-year service delivery, hitting the 90/95/95% coverage milestones).
- **Tomorrow** = the multi-year **district/country scale-up** to full Everyone Forever coverage (infrastructure + institutions over several years).
- **Forever** = **sustainability + Legacy Giving** — endowment-style support and planned gifts that keep services running after Water For People exits. (Their real "Forever" milestone + real Legacy Giving program — authentic, not a stretch.)

## 3. Initiatives (illustrative, grounded)

Three to seed (frame · goal · note):

- **Everyone in Kamuli — Uganda 2026** · _Today_ · ≈ $450K · current-year push to reach the Everyone milestones in an active district (swap in an exact current district from WfP materials).
- **Everyone Forever: Bolivia Scale-Up (3-Year)** · _Tomorrow_ · ≈ $3.2M · multi-year commitment to bring a region to full, self-sustaining coverage — the "capital campaign"-equivalent and the natural home for the hero prospect.
- **The Forever Promise — Sustainability & Legacy** · _Forever_ · open-ended (target ≈ $8M) · endowment + planned giving so services last after exit; the home for legacy donors.

## 4. Staff / users (fictional; single tenant)

Keep continuity with the design mock's personas:

- **Dana Reese** — Major Gifts Officer (the logged-in user / a Relationship Manager).
- **Priya Nair** — Gift Officer / Relationship Manager.
- **Ruth Castellanos** — Chief Development Officer (leadership; sees the Green Sheet team view + Me/Team scope).
  Roles gate leadership views only; otherwise as in content-spec §2.

## 5. Host CRM authenticity + scope change

**Scope change (your call, confirmed):** the thin CRM is **usable, not read-only.** That raises host scope — flag for the implementation plan.

- **Interactive (real CRUD, worth the tokens):** **Constituents** (add/edit/view record), **Revenue/Gifts** (record a gift), **Lists** (build/save), and **Home** reads live data. **Major Giving** stays the deliberate black-box foil but on real data.
- **Stub (static, styled):** Marketing, Events, Volunteers, Memberships, Analysis, host Settings (except the 95 Forward settings page).
- **Make the data feel like WfP:** constituent types (foundation, corporate, individual, **Wavemaker** monthly donor, **legacy** donor); gift types (one-time, recurring/monthly, pledge, **planned gift**, corporate grant); funds/designations tied to countries and the Everyone Forever program; campaigns/appeals like "Wavemaker," "World Water Day," "Everyone Forever Fund."

## 6. Prospects (fictional, mirroring WfP funder archetypes)

Eight, across entity types, mapped to initiatives/horizons (rank by QPI):

| #   | Name                                | Type · context                                      | RM         | Natural Partner | Horizon  | QPI |
| --- | ----------------------------------- | --------------------------------------------------- | ---------- | --------------- | -------- | --- |
| 1   | **The Hallworth Family Foundation** | Foundation · Denver family fdn, global water/health | Dana Reese | Tom Bradley     | Tomorrow | 92  |
| 2   | **Cordova Beverage Company**        | Company · global beverages, water-stewardship/ESG   | Dana Reese | Sofia Lin       | Today    | 83  |
| 3   | **The Osgood Foundation**           | Foundation · WASH-focused grantmaker                | Priya Nair | —               | Tomorrow | 77  |
| 4   | **Marisol Vega**                    | Individual · fintech founder, Women & Water lens    | Dana Reese | —               | Tomorrow | 70  |
| 5   | **Cornerstone Charitable Trust**    | Foundation · faith-based giving                     | Priya Nair | Marcus Webb     | Today    | 64  |
| 6   | **James & Eleanor Whitfield**       | Individuals · longtime donors, legacy interest      | Dana Reese | Tom Bradley     | Forever  | 58  |
| 7   | **Northwater Capital**              | Company · impact investment, water sector           | Priya Nair | —               | Tomorrow | 48  |
| 8   | **Dr. Aisha Bello**                 | Individual · physician, board member's colleague    | Dana Reese | Tom Bradley     | Forever  | 40  |

**Hero prospect — The Hallworth Family Foundation — QPI 92/100 (methodology-weighted):**

- Capacity 35/35 _(5)_ — "Foundation assets ≈ $180M; makes $1M+ global-development grants." `IRS 990-PF · 2024`
- Relationship 24/30 _(4)_ — "Trustee David Hallworth serves with our CDO Ruth on a water-sector board; institutional relationship still building." `Logged · Dana R.`
- Timing 15/15 _(5)_ — "Board reviews multi-year commitments this quarter — the window is open." `Logged · Dana R.`
- Gift History 8/10 _(4)_ — "Three grants over four years, trending up ($50K → $120K → $200K)." `Gift records`
- Philanthropy 10/10 _(5)_ — "Funds WASH and global health broadly." `IRS 990-PF · 2024`
- Hallworth's ask attaches to **Everyone Forever: Bolivia Scale-Up** (Tomorrow). Wealth screen / spouse data → "Unknown — worth researching" in the Knowledge Base.

## 7. Connector discovery batch (fictional)

Keeps the mock's components, re-grounded to WASH affinities:

- Batch: **Introductions via Sandra Kim · for Everyone Forever: Bolivia Scale-Up · 12 candidates · ready.** (Sandra Kim = fictional tech founder, a connector.)
- Sample cards (hypothesis-grade, evidence-backed): **Lena Petrov** — medium — connection `co-director, Global Water Access Fund`, affinity `funded two clean-water nonprofits, 2023–24`. **David Osei** — high — `co-signed the 2024 WASH-financing letter`, `family foundation funds rural sanitation`. **Priscilla Vance** — low — `both spoke at the 2025 Water & Climate summit`, affinity `Unknown — worth researching`.
- Plus one batch mid-run: **Introductions via Tom Bradley · for The Forever Promise · Researching… (requested 20 min ago).**

## 8. Demo vs. live (OSINT) mode — answering your question

Yes, an env var — but put the switch behind a provider seam so the job logic is identical in both modes:

- **`RESEARCH_MODE = demo | live`**, read by the worker at startup.
- Define a **`ResearchProvider`** interface with two implementations: **`SeededResearchProvider`** (demo — returns curated candidate sets for the known fictional connectors) and **`WebSearchResearchProvider`** (live — calls Anthropic's server-side web search). The env var selects which one is injected.
- The queue, worker, checkpointed state machine, polling, and UI are **identical** in both modes — only the provider swaps. So the demo faithfully exercises the real long-running pipeline while staying deterministic and safe.
- Optional finer control if you ever want both in one environment: a per-connector flag (fictional connectors → always seeded; a designated real "test" connector → live).
- In `live`, the OSINT privacy posture (content-spec §11) applies — that's the gate before real-subject research.

## 9. Multi-tenancy (your answer)

Every table carries a **`tenant_id`** (FK to a `tenants` row); seed one tenant (Water For People). All queries are tenant-scoped (a Drizzle query helper, or Postgres RLS if you want it enforced at the DB). Auth0 maps the signed-in user to a `tenant_id` (single tenant for the PoC). Cheap now, enables real multi-tenancy later. Flag for the schema/impl plan.

## 10. What this updates

- **Replaces** content-spec §10's cast with the above. Everything else in the content spec stands.
- **Feeds** the seed script (org, users, prospects + Hallworth detail, 3 initiatives, host constituents/gifts in WfP shapes, one ready + one researching discovery batch).
- **Two items for the implementation plan:** the host-CRM scope increase (§5, real CRUD) and the `tenant_id`-everywhere schema decision (§9).
