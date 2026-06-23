# Initiative 14 — NL Structured-Query Layer (plan)

Goal: `/95-forward/search` gains an LLM-extracted, Zod-whitelist-constrained structured-filter
layer that composes with the existing semantic retrieval. In-stack (Postgres + `packages/ai`); no
external search service; the LLM never writes SQL; anti-silo (horizon via cultivation join, no frame
column on prospects); the just-fixed semantic path is not regressed.

Architecture confirmed by Oracle (ses_10b95aec2ffeIONTr7EAy5vfWw).

## Phase A — Whitelist schema (single source of truth) [packages/shared]

- `packages/shared/src/search-filters.ts`: a strict Zod **discriminated union** on `field`:
  - `type` eq individual|organization|foundation
  - `status` eq research|cultivation|solicitation|stewardship|active
  - `qpi_total` gt|gte|lt|lte, int 0–100
  - dimension (`capacity|relationship|timing|gift_history|philanthropy`) gte|lte|eq, int 1–5
  - `last_contact_days` gt|lt, int >=1
  - `horizon` eq today|tomorrow|forever
  - `band` eq go|strong|build|early
  - `rm` eq (value: a userId or the literal "me")
  - `ExtractionToolInputSchema = { filters: SearchFilter[], semanticTerms: string|null }`
- Export `SearchFilter`, `ExtractionToolInput`, the schemas, and a `filterChipLabel(f)` helper for the UI.
- Fuzzy→threshold mappings (documented + in the extraction system prompt): high/strong → `>=4`;
  low/weak → `<=2`. Applied by the model, bounded by the schema (1–5).
- Unit: schema accepts valid filters; REJECTS off-whitelist field/op/value (rating 6, bad field, bad enum).

## Phase B — Extraction (packages/ai) [model-router, mock/live]

- `ModelRequest.toolChoice?` passthrough in `LiveModelProvider.createMessage` (mock ignores it).
- `packages/ai/src/extraction.ts`: `extractSearchFilters(model, query) → { filters, semanticTerms, mode, fellBack }`:
  - one `createMessage` (Haiku tier) with a single tool `extract_search_filters` whose `input_schema`
    = `zodToJsonSchema(ExtractionToolInputSchema)`, `toolChoice` forced, temperature 0,
    `buildSystemPrompt(EXTRACTION_SYSTEM)` (injection policy + dimension-adjective rules); query
    wrapped/delimited as data.
  - read the `tool_use` block input, Zod-parse against `ExtractionToolInputSchema`.
  - fallback (no tool_use / parse fail / throw) → `{ filters: [], semanticTerms: query, mode: "semantic", fellBack: true }`.
  - mode = filters.length>0 && semanticTerms ? "hybrid" : filters.length>0 ? "structured" : "semantic".
- Mock: register `extract_filters` deterministic scripts keyed by the 4 acceptance-query substrings +
  a pure-semantic + an unparseable case, in `buildMockScripts` (or a dedicated extraction mock map).
- Export from `packages/ai/src/index.ts`.
- Unit: each acceptance query → expected filter object; unparseable → fallback; mock deterministic.

## Phase C — Filter → SQL/in-memory translation (apps/web data layer)

- Extend `getProspectsList` to keep an internal `EnrichedProspectListRow` (adds `lastContactAt`,
  `rmUserId`, `horizons: Set<frame>`) — strip to `ProspectListRow` for existing callers.
- `loadProspectHorizons(tx, prospectIds) → Map<prospectId, Set<frame>>` via
  prospect_funding_initiatives → funding_initiatives.frame (DISTINCT; empty-guarded; in withTenant).
- `applyStructuredFilters(rows, filters, callerId) → rows` — deterministic `matchFilter` switch per
  field (qpi_total/dimension on computed qpi; last_contact_days incl. never=Infinity; horizon OR-any;
  type/status/band on columns; rm "me"→callerId). AND across filters. LLM never emits SQL;
  parameterized Drizzle only for the horizon/recency loads.
- Unit: each field/op predicate; empty-guards; tenant-scoping; "me"→caller; horizon OR; recency never-contacted.

## Phase D — Composition (rewrite searchProspects, 3 modes)

- `searchProspects(tenantId, caller, query)`:
  1. `extractSearchFilters(model, query)`.
  2. **semantic** (filters:[]): EXISTING path unchanged (hybridRetrieve + resolve + keyword union).
  3. **structured**: `applyStructuredFilters(getProspectsList(...))`, rank qpi.total desc; synthesize a
     structured summary fact w/ provenance; `unknown:false`; empty set → friendly note.
  4. **hybrid**: structured candidate set; if empty → friendly note (skip embed). Else hybridRetrieve
     (semanticTerms) → resolve → intersect with candidates = semantic-matched (vector order) FIRST,
     then remaining structured-only (qpi.total). Merge facts (semantic citations + structured summary).
- `ProspectSearchResult` gains `interpretation: { filters, semanticTerms, mode, fellBack }`.
- Preserve provenance + "unknown — worth researching" for genuine gaps. Semantic path: 0 changes.
- Unit: 3 modes; pure-semantic preserved; hybrid ranking; empty-structured note; tenancy.

## Phase E — UI (full-color register) + loading

- `apps/web/src/app/95-forward/search/loading.tsx` (Suspense skeleton during the model+retrieval render).
- Results: interpreted-query chips above matches (ds `Tag`; semantic term + fallback indicator);
  pure-structured shows the matches + structured summary fact; "fell back to semantic" stated.
- Design skill: iris for AI-extracted, mono for provenance, sentence case, no emoji, reduced-motion.
- Playwright (mock, MOCK_LATENCY_MS): the 4 acceptance queries (results + interpretation), a
  pure-semantic still works, an unparseable falls back gracefully, loading state present.

## Phase F — Seed (idempotent, only the recency gap)

- Add recent (<60d) interactions to ~2-3 prospects so "not contacted in 60 days" returns a meaningful
  SUBSET (currently 0 interactions <60d → all 8 match). Idempotent (stableId), deterministic.
- Confirmed already covered: QPI>80 = Hallworth(92)+Cordova(83); foundations cap>=4 = Hallworth/Osgood/
  Cornerstone; horizon today=2/tomorrow=4/forever=2.

## Phase G — Live-extraction verification + smoke

- With real Anthropic: confirm the 4 acceptance queries extract the correct filter objects. Document.
- Fold into the live-mode smoke (runbook): real extraction + a structured search returning expected prospects.

## Phase H — Gate

- typecheck/lint/format; unit (shared+ai+web) + Playwright (mock, MOCK_LATENCY_MS) green; fresh
  down -v → migrate → seed → embed → search works; no semantic regression; injection-safe; no frame
  column; no external service. "QPI>80"-style now WORKS (was the flagged gap).

## Out of scope

External search service / datastore; free-form NL→SQL; frame column on prospects; faceted-filter
sidebar; rebuilding QPI/AI substrate. Structured numeric search beyond the whitelist.
