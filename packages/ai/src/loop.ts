import { zodToJsonSchema as zodToJsonSchemaRaw } from "zod-to-json-schema";
import type { ZodSchema } from "zod";

const zodToJsonSchema = zodToJsonSchemaRaw as unknown as (
  schema: ZodSchema,
  options?: { target?: "openApi3" },
) => Record<string, unknown>;
import type {
  AgentRunResult,
  AnyTool,
  CallerContext,
  ModelMessage,
  ModelOutgoingBlock,
  ModelToolDef,
  ModelToolResultBlock,
  ModelToolUseBlock,
  Providers,
  TaskConfig,
  TaskType,
} from "./types";
import type { Database } from "@95forward/db";
import { buildSystemPrompt } from "./prompt";
import { resolveTask } from "./router";

const TOOL_RESULT_MAX_CHARS = 8000;

export interface RunAgentLoopArgs {
  providers: Providers;
  task: TaskConfig;
  tools: AnyTool[];
  caller: CallerContext;
  db: Database;
  userContent: string;
}

function toModelToolDefs(tools: AnyTool[]): ModelToolDef[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.inputSchema as ZodSchema, { target: "openApi3" }),
  }));
}

// P1-D: bound tool output so a hostile or runaway handler cannot flood the context window.
function truncate(content: string): string {
  if (content.length <= TOOL_RESULT_MAX_CHARS) return content;
  return `${content.slice(0, TOOL_RESULT_MAX_CHARS)}\n…[truncated]`;
}

function errorResult(toolUseId: string, content: string): ModelToolResultBlock {
  return { type: "tool_result", tool_use_id: toolUseId, content, is_error: true };
}

async function dispatchToolUse(
  block: ModelToolUseBlock,
  args: RunAgentLoopArgs,
  toolsByName: Map<string, AnyTool>,
): Promise<{ result: ModelToolResultBlock; ok: boolean }> {
  // P1-C: enforce the task's allowlist before anything else — a denied tool is never dispatched.
  if (!args.task.allowedTools.includes(block.name)) {
    return { result: errorResult(block.id, "Tool not permitted for this task"), ok: false };
  }
  const tool = toolsByName.get(block.name);
  if (tool === undefined) {
    return { result: errorResult(block.id, `Tool not found: ${block.name}`), ok: false };
  }
  // Zod gate: an invalid payload short-circuits to an error so the handler is never reached.
  const parsed = tool.inputSchema.safeParse(block.input);
  if (!parsed.success) {
    return {
      result: errorResult(block.id, `Invalid tool input: ${parsed.error.message}`),
      ok: false,
    };
  }
  try {
    const output = await tool.handler(parsed.data, {
      caller: args.caller,
      db: args.db,
      providers: args.providers,
    });
    return {
      result: { type: "tool_result", tool_use_id: block.id, content: truncate(output) },
      ok: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: errorResult(block.id, `Tool error: ${truncate(message)}`), ok: false };
  }
}

function joinText(content: { type: string; text?: string }[]): string {
  return content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function runAgentLoop(args: RunAgentLoopArgs): Promise<AgentRunResult> {
  const { providers, task, tools, userContent } = args;
  const system = buildSystemPrompt(task.system);
  const toolDefs = toModelToolDefs(tools);
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const messages: ModelMessage[] = [{ role: "user", content: userContent }];
  const toolCalls: AgentRunResult["toolCalls"] = [];

  let tokensUsed = 0;
  let iterations = 0;

  while (iterations < task.budget.maxIterations && tokensUsed < task.budget.maxTokens) {
    const response = await providers.model.createMessage({
      model: task.model,
      maxTokens: task.maxTokens,
      system,
      messages,
      ...(toolDefs.length > 0 ? { tools: toolDefs } : {}),
      temperature: task.temperature,
    });
    tokensUsed += response.usage.inputTokens + response.usage.outputTokens;
    iterations += 1;

    if (response.stopReason === "end_turn") {
      return { text: joinText(response.content), tokensUsed, iterations, toolCalls };
    }

    if (response.stopReason === "max_tokens") {
      const text = joinText(response.content);
      return {
        text:
          text.length > 0
            ? `${text}\n[stopped: model hit max_tokens]`
            : "[stopped: model hit max_tokens]",
        tokensUsed,
        iterations,
        toolCalls,
      };
    }

    if (response.stopReason === "tool_use") {
      messages.push({
        role: "assistant",
        content: response.content as ModelOutgoingBlock[],
      });
      const toolResults: ModelToolResultBlock[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const { result, ok } = await dispatchToolUse(block, args, toolsByName);
        toolResults.push(result);
        toolCalls.push({ name: block.name, ok });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    if (response.stopReason === "pause_turn") {
      messages.push({
        role: "assistant",
        content: response.content as ModelOutgoingBlock[],
      });
      continue;
    }

    throw new Error(`runAgentLoop: unexpected stop reason "${response.stopReason}"`);
  }

  return {
    text: "[stopped: reached the iteration or token budget before finishing]",
    tokensUsed,
    iterations,
    toolCalls,
  };
}

export interface RunTaskArgs {
  providers: Providers;
  taskType: TaskType;
  tools: AnyTool[];
  caller: CallerContext;
  db: Database;
  userContent: string;
}

export function runTask(args: RunTaskArgs): Promise<AgentRunResult> {
  const { taskType, ...rest } = args;
  return runAgentLoop({ ...rest, task: resolveTask(taskType) });
}
