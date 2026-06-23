import { zodToJsonSchema as zodToJsonSchemaRaw } from "zod-to-json-schema";
import type { ZodSchema } from "zod";
import {
  ExtractionToolInputSchema,
  type QueryInterpretation,
  type SearchMode,
} from "@95forward/shared";
import type { ModelProvider } from "./types";
import { buildSystemPrompt } from "./prompt";

const zodToJsonSchema = zodToJsonSchemaRaw as unknown as (
  schema: ZodSchema,
  options?: { target?: "openApi3" },
) => Record<string, unknown>;

const TOOL_NAME = "emit_search_filters";

// The extraction system prompt. The fuzzy-adjective→threshold mappings live here (they're how a
// plain-language "high capacity" becomes a bounded structured filter); the whitelist Zod schema is
// the hard boundary that rejects anything off-contract. The query is DATA to parse, never
// instructions — buildSystemPrompt() prepends the standing injection policy.
const EXTRACTION_SYSTEM = [
  "You translate a fundraiser's plain-language prospect-search query into structured filters by",
  "calling the emit_search_filters tool exactly once. Only use the whitelisted fields/operators.",
  "Map fuzzy adjectives to thresholds: high/strong/top → >= 4; low/weak → <= 2; for qpi_total use the",
  "number stated (e.g. 'QPI higher than 80' → qpi_total gt 80). A QPI-dimension adjective plus a topic",
  "is a HYBRID query: extract the dimension as a filter AND put the topic in semanticTerms (e.g.",
  "'strong relationship to clean water' → relationship gte 4, semanticTerms 'clean water').",
  "'foundations'→type eq foundation; 'not contacted in N days'→last_contact_days gt N; 'today/tomorrow/",
  "forever prospects'→horizon eq <frame>; 'my/mine'→rm eq me. If the query is purely topical with no",
  "structured criterion, return filters: [] and put the whole query in semanticTerms. Never invent a",
  "field outside the whitelist; if unsure, prefer semanticTerms over guessing a filter.",
].join(" ");

function fallback(query: string): QueryInterpretation {
  return { filters: [], semanticTerms: query, mode: "semantic", fellBack: true };
}

function modeOf(filters: unknown[], semanticTerms: string | null): SearchMode {
  if (filters.length > 0 && semanticTerms && semanticTerms.trim().length > 0) return "hybrid";
  if (filters.length > 0) return "structured";
  return "semantic";
}

// Single-call structured extraction: one forced tool whose input_schema IS the whitelist, then the
// returned tool_use input is Zod-validated. Any failure (no tool_use, malformed args, thrown call)
// degrades to a pure-semantic search — the extractor can never break the existing path.
export async function extractSearchFilters(
  model: ModelProvider,
  query: string,
): Promise<QueryInterpretation> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return fallback(query);

  try {
    const response = await model.createMessage({
      model: "claude-haiku-4-5",
      maxTokens: 1024,
      temperature: 0,
      system: buildSystemPrompt(EXTRACTION_SYSTEM),
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Emit the structured filters and optional semantic term parsed from the query. " +
            "Call this exactly once.",
          input_schema: zodToJsonSchema(ExtractionToolInputSchema, { target: "openApi3" }),
        },
      ],
      toolChoice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: `<query>\n${trimmed}\n</query>` }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (toolUse === undefined || toolUse.type !== "tool_use") return fallback(query);

    const parsed = ExtractionToolInputSchema.safeParse(toolUse.input);
    if (!parsed.success) return fallback(query);

    const semanticTerms =
      parsed.data.semanticTerms && parsed.data.semanticTerms.trim().length > 0
        ? parsed.data.semanticTerms.trim()
        : null;

    return {
      filters: parsed.data.filters,
      semanticTerms,
      mode: modeOf(parsed.data.filters, semanticTerms),
      fellBack: false,
    };
  } catch {
    return fallback(query);
  }
}
