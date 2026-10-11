import { buildScoringJsonSchema, parseScoringResponse } from "@95forward/shared";
import type { ModelContentBlock, ModelId, ModelProvider, ModelRequest } from "../types";
import { classifySystemPrompt, meetingUserMessage, SCORECARD_PROMPT_VERSION, scoreSystemPrompt } from "./prompts";
import {
  ScoringValidationError,
  type ClassifyMeetingInput,
  type ClassifyMeetingResult,
  type MeetingDecider,
  type ScoreMeetingInput,
  type ScoreMeetingResult,
} from "./types";

// 95 Forward — the model-backed MeetingDecider (Initiative 31).
//
// Structured output through ONE FORCED TOOL per call, exactly as the I14 extractor does it: the
// tool's input_schema IS the contract, `tool_choice` names the tool, and the returned input is
// validated server-side before anything is written. For the scoring call the schema is generated
// from the snapshot at call time, so an organisation can add a criterion without anyone touching
// this file.
//
// THIS IS AN INTERIM STAND-IN. A dedicated decision-model wrapper replaces this implementation
// later; it will arrive as another MeetingDecider and nothing above the seam changes. Which is
// why the model id is config below and an opaque string in the result.

/**
 * The models behind the seam.
 *
 * Haiku 4.5 is the cheapest current Anthropic model, and it is the same tier the I14 extractor
 * uses for its structured single-shot call. Both calls here are constrained classification over a
 * supplied rubric, which is exactly what that tier is for — this is not drafting.
 *
 * Config, not a literal at the call site, so swapping it is one edit in one place.
 */
export const MEETING_DECIDER_MODELS: { readonly classify: ModelId; readonly score: ModelId } = {
  classify: "claude-haiku-4-5",
  score: "claude-haiku-4-5",
};

const CLASSIFY_TOOL = "classify_meeting";
const SCORE_TOOL = "emit_scorecard";

export interface ModelMeetingDeciderOptions {
  readonly model: ModelProvider;
  readonly classifyModel?: ModelId;
  readonly scoreModel?: ModelId;
  readonly maxTokens?: number;
}

export class ModelMeetingDecider implements MeetingDecider {
  readonly kind: "mock" | "live";
  private readonly model: ModelProvider;
  private readonly classifyModel: ModelId;
  private readonly scoreModel: ModelId;
  private readonly maxTokens: number;

  constructor(options: ModelMeetingDeciderOptions) {
    this.model = options.model;
    this.kind = options.model.kind;
    this.classifyModel = options.classifyModel ?? MEETING_DECIDER_MODELS.classify;
    this.scoreModel = options.scoreModel ?? MEETING_DECIDER_MODELS.score;
    // Generous: a 12-criterion scorecard with a rationale and a quote each is a few thousand
    // tokens of output, and a truncated answer fails validation rather than degrading quietly.
    this.maxTokens = options.maxTokens ?? 8192;
  }

  async classifyMeetingType(input: ClassifyMeetingInput): Promise<ClassifyMeetingResult> {
    const ids = input.meetingTypes.map((type) => type.id);
    const request: ModelRequest = {
      model: this.classifyModel,
      maxTokens: 1024,
      temperature: 0,
      system: classifySystemPrompt(input.meetingTypes),
      tools: [
        {
          name: CLASSIFY_TOOL,
          description: "Record which meeting type this is, and why. Call exactly once.",
          input_schema: {
            type: "object",
            // Rationale first, for the same reason as the scoring schema: reason, then commit.
            properties: {
              rationale: {
                type: "string",
                description: "One or two sentences on what in the record decided it.",
              },
              meeting_type_id: {
                type: "string",
                // The enum is the guard rail: an id outside the tenant's own types cannot be
                // returned, so the classifier can never point a Scorecard at someone else's row.
                enum: [...ids, "none"],
                description: "The id of the type that fits, or \"none\" if none of them does.",
              },
            },
            required: ["rationale", "meeting_type_id"],
            additionalProperties: false,
          },
        },
      ],
      toolChoice: { type: "tool", name: CLASSIFY_TOOL },
      // The ONLY place the untrusted content enters: a user-role message.
      messages: [{ role: "user", content: meetingUserMessage(input.content, input.sourceType) }],
    };

    const started = Date.now();
    const response = await this.model.createMessage(request);
    const latencyMs = Date.now() - started;

    const block = response.content.find((item) => item.type === "tool_use");
    if (block === undefined || block.type !== "tool_use") {
      throw new ScoringValidationError("classifier returned no structured answer");
    }
    const chosen = block.input.meeting_type_id;
    const rationale = block.input.rationale;
    if (typeof chosen !== "string" || (chosen !== "none" && !ids.includes(chosen))) {
      throw new ScoringValidationError(
        `classifier returned an unknown meeting type id: ${String(chosen)}`,
      );
    }

    return {
      meetingTypeId: chosen,
      rationale: typeof rationale === "string" ? rationale.trim() : "",
      audit: {
        model: this.classifyModel,
        promptVersion: SCORECARD_PROMPT_VERSION,
        latencyMs,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
    };
  }

  /**
   * Score, validate, and retry ONCE on invalid output.
   *
   * One retry, not a loop. A model that produces an off-schema answer twice in a row is not
   * having a bad moment, and a Scorecard that fails loudly with the validation error attached is
   * far more useful to whoever has to fix it than one that was retried into existence.
   */
  async scoreMeeting(input: ScoreMeetingInput): Promise<ScoreMeetingResult> {
    const schema = buildScoringJsonSchema(input.snapshot);
    const request: ModelRequest = {
      model: this.scoreModel,
      maxTokens: this.maxTokens,
      temperature: 0,
      system: scoreSystemPrompt(input.snapshot, input.sourceType),
      tools: [
        {
          name: SCORE_TOOL,
          description:
            "Record the judgement for every criterion on the scorecard. Call exactly once.",
          input_schema: schema,
        },
      ],
      toolChoice: { type: "tool", name: SCORE_TOOL },
      messages: [{ role: "user", content: meetingUserMessage(input.content, input.sourceType) }],
    };

    let lastError = "the model returned no structured answer";
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const started = Date.now();
      const response = await this.model.createMessage(request);
      latencyMs += Date.now() - started;
      inputTokens += response.usage.inputTokens;
      outputTokens += response.usage.outputTokens;

      const merged = mergeToolUse(response.content, SCORE_TOOL);
      if (merged === null) continue;

      const parsed = parseScoringResponse(input.snapshot, merged);
      if (parsed.ok) {
        return {
          results: parsed.results,
          audit: {
            model: this.scoreModel,
            promptVersion: SCORECARD_PROMPT_VERSION,
            latencyMs,
            inputTokens,
            outputTokens,
          },
        };
      }
      lastError = parsed.error;
    }

    throw new ScoringValidationError(lastError);
  }
}

/**
 * Merge every `tool_use` block for one tool into a single object.
 *
 * THIS IS NOT DEFENSIVE PROGRAMMING, it is what the model actually does. Parallel tool use is on
 * by default, and asked for a judgement on eight criteria a small model will often make eight
 * separate calls to the same tool — one per criterion — rather than one call carrying eight keys.
 * Both are valid answers to the same forced-tool request.
 *
 * Reading only the first block looked correct under the mock, which returns one block because it
 * is a fixture. Live Haiku split the first real scorecard eight ways and seven criteria vanished,
 * which is exactly the class of failure a green mock suite cannot show you.
 *
 * Later keys win, so a model that answers the same criterion twice gets its last word.
 */
function mergeToolUse(
  content: readonly ModelContentBlock[],
  toolName: string,
): Record<string, unknown> | null {
  const merged: Record<string, unknown> = {};
  let found = false;
  for (const block of content) {
    if (block.type !== "tool_use" || block.name !== toolName) continue;
    found = true;
    Object.assign(merged, block.input);
  }
  return found ? merged : null;
}
