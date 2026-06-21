import Anthropic from "@anthropic-ai/sdk";
import type {
  ModelContentBlock,
  ModelMessage,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelStopReason,
  ModelUsage,
} from "../types";

export interface LiveModelProviderOptions {
  apiKey: string;
}

function toSdkContent(content: ModelMessage["content"]): Anthropic.MessageParam["content"] {
  if (typeof content === "string") return content;
  return content.map((block) => {
    switch (block.type) {
      case "text":
        return { type: "text", text: block.text };
      case "tool_use":
        return { type: "tool_use", id: block.id, name: block.name, input: block.input };
      case "tool_result":
        return {
          type: "tool_result",
          tool_use_id: block.tool_use_id,
          content: block.content,
          ...(block.is_error === undefined ? {} : { is_error: block.is_error }),
        };
    }
  });
}

function fromSdkContent(content: Anthropic.ContentBlock[]): ModelContentBlock[] {
  const blocks: ModelContentBlock[] = [];
  for (const block of content) {
    if (block.type === "text") {
      blocks.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      blocks.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      });
    }
  }
  return blocks;
}

export class LiveModelProvider implements ModelProvider {
  readonly kind = "live" as const;
  private readonly client: Anthropic;

  constructor(options: LiveModelProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
  }

  async createMessage(req: ModelRequest): Promise<ModelResponse> {
    const response = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages.map((message) => ({
        role: message.role,
        content: toSdkContent(message.content),
      })),
      ...(req.tools === undefined
        ? {}
        : {
            tools: req.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.input_schema as Anthropic.Tool.InputSchema,
            })),
          }),
      ...(req.temperature === undefined ? {} : { temperature: req.temperature }),
    });
    return {
      content: fromSdkContent(response.content),
      stopReason: (response.stop_reason ?? "end_turn") as ModelStopReason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

const DEFAULT_USAGE: ModelUsage = { inputTokens: 10, outputTokens: 10 };

export function textResponse(text: string, usage: ModelUsage = DEFAULT_USAGE): ModelResponse {
  return { content: [{ type: "text", text }], stopReason: "end_turn", usage };
}

let mockToolUseCounter = 0;

export function toolUseResponse(
  name: string,
  input: Record<string, unknown>,
  usage: ModelUsage = DEFAULT_USAGE,
): ModelResponse {
  mockToolUseCounter += 1;
  return {
    content: [{ type: "tool_use", id: `mock-tool-${mockToolUseCounter}`, name, input }],
    stopReason: "tool_use",
    usage,
  };
}

// Deterministic model used across CI: replays a fixed queue of responses, or selects a scripted
// sequence keyed by a tag found in the first user message. Never touches the network.
export class MockModelProvider implements ModelProvider {
  readonly kind = "mock" as const;
  private queue: ModelResponse[] = [];
  private readonly scripts: Record<string, ModelResponse[]>;
  private activeScript: ModelResponse[] | null = null;
  private cursor = 0;

  constructor(scripts: Record<string, ModelResponse[]> = {}) {
    this.scripts = scripts;
  }

  static scripted(scriptByTag: Record<string, ModelResponse[]>): MockModelProvider {
    return new MockModelProvider(scriptByTag);
  }

  queueResponse(response: ModelResponse): this {
    this.queue.push(response);
    return this;
  }

  queueText(text: string, usage?: ModelUsage): this {
    return this.queueResponse(textResponse(text, usage));
  }

  queueToolUse(name: string, input: Record<string, unknown>, usage?: ModelUsage): this {
    return this.queueResponse(toolUseResponse(name, input, usage));
  }

  async createMessage(req: ModelRequest): Promise<ModelResponse> {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next === undefined) throw new Error("MockModelProvider: queue underflow");
      return next;
    }
    if (this.activeScript === null) {
      this.activeScript = this.selectScript(req);
      this.cursor = 0;
    }
    const step = this.activeScript[this.cursor];
    if (step === undefined) {
      throw new Error("MockModelProvider: script exhausted with no response to return");
    }
    this.cursor += 1;
    return step;
  }

  private selectScript(req: ModelRequest): ModelResponse[] {
    const firstUser = req.messages.find((message) => message.role === "user");
    const text =
      firstUser === undefined
        ? ""
        : typeof firstUser.content === "string"
          ? firstUser.content
          : firstUser.content.map((block) => (block.type === "text" ? block.text : "")).join(" ");
    for (const tag of Object.keys(this.scripts)) {
      if (text.includes(tag)) {
        const script = this.scripts[tag];
        if (script !== undefined) return script;
      }
    }
    throw new Error(
      "MockModelProvider: no queued response and no script tag matched the user content",
    );
  }
}

export type MockScript = ModelResponse[];

export interface BuildMockScriptsParams {
  prospectId: string;
  constituentId: string;
  dimension?: string;
}

// Emitted tool inputs must stay in lockstep with the real schemas in src/tools/index.ts.
export function buildMockScripts(params: BuildMockScriptsParams): Record<string, MockScript> {
  const dimension = params.dimension ?? "capacity";
  return {
    propose_qpi: [
      toolUseResponse("retrieve", { query: "recent major gifts and relationship history" }),
      toolUseResponse("propose_qpi", {
        prospectId: params.prospectId,
        dimension,
        rating: 78,
        rationale: "Two five-figure gifts in the last 24 months and a board seat at a peer funder.",
        source: "IRS 990-PF · 2024",
      }),
      textResponse("Proposed a QPI assessment for your review, grounded in the gift records."),
    ],
    draft_outreach: [
      toolUseResponse("retrieve", { query: "constituent giving history and interests" }),
      toolUseResponse("draft_text", {
        kind: "outreach_email",
        constituentId: params.constituentId,
        points: [
          "Thank them for their sustained support of clean-water programs.",
          "Reference their most recent gift and its impact.",
          "Invite a brief call to discuss a deepened partnership.",
        ],
      }),
      textResponse("Drafted an outreach email for your review, grounded in the giving record."),
    ],
  };
}

// Static example for callers that import MOCK_SCRIPTS by name. The ids are valid-but-fake UUID
// placeholders: real end-to-end use requires buildMockScripts({ prospectId, constituentId }) with
// real, FK-satisfying ids so the staged proposals resolve.
export const MOCK_SCRIPTS: Record<string, MockScript> = buildMockScripts({
  prospectId: "00000000-0000-4000-8000-000000000000",
  constituentId: "00000000-0000-4000-8000-000000000001",
});
