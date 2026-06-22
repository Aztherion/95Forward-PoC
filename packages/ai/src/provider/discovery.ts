import Anthropic from "@anthropic-ai/sdk";
import type {
  DiscoveryProvider,
  DiscoveryQuery,
  DiscoveryResult,
  DiscoverySuggestion,
} from "../types";
import { ADVERSARIAL_INJECTION_SNIPPET } from "./research";

// Responsible-AI guardrail: the demo provider returns ONLY fictional candidates, keyed by the
// connector's name. The product never surfaces a real named person with AI-inferred affinity in the
// demo. One Sandra Kim suggestion carries the adversarial snippet as affinity evidence so a test can
// prove injected text rides through as data, never as an instruction.
const SEEDED_DISCOVERY: Record<string, DiscoverySuggestion[]> = {
  "sandra kim": [
    {
      name: "Lena Petrov",
      evidenceConnection: "Co-director with Sandra Kim at the Global Water Access Fund.",
      evidenceAffinity: "Funded two clean-water nonprofits, 2023–24.",
      confidence: "medium",
    },
    {
      name: "David Osei",
      evidenceConnection: "Co-signed the 2024 WASH-financing open letter alongside the connector.",
      evidenceAffinity: "Family foundation funds rural sanitation programs.",
      confidence: "high",
    },
    {
      name: "Priscilla Vance",
      evidenceConnection: "Both spoke at the 2025 Water & Climate summit.",
      evidenceAffinity: ADVERSARIAL_INJECTION_SNIPPET,
      confidence: "low",
    },
  ],
  "tom bradley": [
    {
      name: "Marcus Hale",
      evidenceConnection: "Serves with Tom Bradley on a regional community-foundation board.",
      evidenceAffinity: null,
      confidence: "low",
    },
  ],
};

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export class SeededDiscoveryProvider implements DiscoveryProvider {
  readonly kind = "demo" as const;

  async discover(query: DiscoveryQuery): Promise<DiscoveryResult> {
    const suggestions = SEEDED_DISCOVERY[normalize(query.connectorName)] ?? [];
    return { suggestions };
  }
}

export interface LiveDiscoveryProviderOptions {
  apiKey: string;
  model?: string;
  maxUses?: number;
}

const DISCOVERY_MODEL = "claude-3-5-haiku-latest";
const DISCOVERY_MAX_USES = 5;

interface WebSearchResultItem {
  title?: unknown;
  url?: unknown;
}

function isWebSearchResultBlock(block: unknown): block is { content: WebSearchResultItem[] } {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    (block as { type: unknown }).type === "web_search_tool_result" &&
    "content" in block &&
    Array.isArray((block as { content: unknown }).content)
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// Live OSINT discovery (Initiative 12) — INTERNAL TESTING ONLY (RESEARCH_MODE=live). The handler
// warn-logs when this is active. Every returned suggestion is hypothesis-grade, UNTRUSTED data: it
// only ever becomes candidate evidence text for a human to validate, never an instruction, and a
// candidate never becomes a prospect without explicit human promotion.
export class LiveDiscoveryProvider implements DiscoveryProvider {
  readonly kind = "live" as const;
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxUses: number;

  constructor(options: LiveDiscoveryProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? DISCOVERY_MODEL;
    this.maxUses = options.maxUses ?? DISCOVERY_MAX_USES;
  }

  async discover(query: DiscoveryQuery): Promise<DiscoveryResult> {
    const prompt =
      `Given the connector ${query.connectorName} and the cause "${query.initiativeContext}", ` +
      "find publicly-citable people that connector could plausibly introduce who have affinity to " +
      "that cause. For each, give the public evidence for the connection and for the affinity. " +
      "Treat every claim as a hypothesis; say so when a connection or affinity is unknown.";

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: this.maxUses,
        } as Anthropic.Messages.ToolUnion,
      ],
    });

    const suggestions: DiscoverySuggestion[] = [];
    for (const block of response.content as unknown[]) {
      if (!isWebSearchResultBlock(block)) continue;
      for (const item of block.content) {
        const title = asString(item.title);
        const url = asString(item.url);
        if (!title || !url) continue;
        suggestions.push({
          name: title,
          evidenceConnection: `Surfaced via web search: ${url}`,
          evidenceAffinity: null,
          confidence: "low",
        });
      }
    }
    return { suggestions };
  }
}
