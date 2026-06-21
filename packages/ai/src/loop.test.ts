import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runAgentLoop } from "./loop";
import { MockModelProvider, textResponse, toolUseResponse } from "./provider/model";
import { MockEmbeddingProvider } from "./provider/embedding";
import { SeededResearchProvider } from "./provider/research";
import type { AnyTool, CallerContext, Providers, TaskConfig } from "./types";
import type { Database } from "@95forward/db";

const caller: CallerContext = { id: "u1", tenantId: "t1", role: "gift_officer" };
const db = {} as Database;

function providersWith(model: MockModelProvider): Providers {
  return {
    model,
    embedding: new MockEmbeddingProvider(),
    research: new SeededResearchProvider(),
  };
}

function makeTool(
  name: string,
  handler: AnyTool["handler"],
  schema: z.ZodType<unknown> = z.object({ query: z.string() }),
): AnyTool {
  return { name, description: `fake ${name}`, inputSchema: schema, handler };
}

function task(overrides: Partial<TaskConfig> = {}): TaskConfig {
  return {
    model: "claude-haiku-4-5",
    maxTokens: 1024,
    temperature: 0.2,
    system: "Test task.",
    allowedTools: ["retrieve"],
    budget: { maxIterations: 6, maxTokens: 30000 },
    ...overrides,
  };
}

describe("runAgentLoop tool guards", () => {
  it("returns an end_turn text answer with collected tool calls", async () => {
    const model = new MockModelProvider()
      .queueToolUse("retrieve", { query: "gifts" })
      .queueText("Here is the grounded summary.");
    const retrieve = makeTool("retrieve", async () => "FACT: gave $10k [src]");

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task(),
      tools: [retrieve],
      caller,
      db,
      userContent: "summarize",
    });

    expect(result.text).toBe("Here is the grounded summary.");
    expect(result.toolCalls).toEqual([{ name: "retrieve", ok: true }]);
    expect(result.iterations).toBe(2);
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it("blocks a disallowed tool with is_error and never dispatches it", async () => {
    const handler = vi.fn(async () => "should not run");
    const draft = makeTool("draft_text", handler);
    const model = new MockModelProvider()
      .queueToolUse("draft_text", { query: "x" })
      .queueText("done");

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task({ allowedTools: ["retrieve"] }),
      tools: [draft],
      caller,
      db,
      userContent: "go",
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.toolCalls).toEqual([{ name: "draft_text", ok: false }]);
  });

  it("rejects invalid tool input via Zod and never calls the handler", async () => {
    const handler = vi.fn(async () => "ran");
    const retrieve = makeTool("retrieve", handler, z.object({ query: z.string() }));
    const model = new MockModelProvider()
      .queueToolUse("retrieve", { query: 123 })
      .queueText("done");

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task(),
      tools: [retrieve],
      caller,
      db,
      userContent: "go",
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.toolCalls).toEqual([{ name: "retrieve", ok: false }]);
  });

  it("marks a handler throw as a failed tool call without throwing the loop", async () => {
    const retrieve = makeTool("retrieve", async () => {
      throw new Error("boom");
    });
    const model = new MockModelProvider()
      .queueToolUse("retrieve", { query: "x" })
      .queueText("recovered");

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task(),
      tools: [retrieve],
      caller,
      db,
      userContent: "go",
    });

    expect(result.text).toBe("recovered");
    expect(result.toolCalls).toEqual([{ name: "retrieve", ok: false }]);
  });

  it("treats an unknown tool name as is_error", async () => {
    const model = new MockModelProvider()
      .queueToolUse("retrieve", { query: "x" })
      .queueText("done");
    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task({ allowedTools: ["retrieve"] }),
      tools: [],
      caller,
      db,
      userContent: "go",
    });
    expect(result.toolCalls).toEqual([{ name: "retrieve", ok: false }]);
  });
});

describe("runAgentLoop budget caps", () => {
  it("stops at the iteration cap and returns gracefully without throwing", async () => {
    const model = new MockModelProvider();
    const handler = vi.fn(async () => "fact");
    const retrieve = makeTool("retrieve", handler);
    const spy = vi
      .spyOn(model, "createMessage")
      .mockResolvedValue(toolUseResponse("retrieve", { query: "loop" }));

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task({ budget: { maxIterations: 3, maxTokens: 1_000_000 } }),
      tools: [retrieve],
      caller,
      db,
      userContent: "go",
    });

    expect(result.iterations).toBe(3);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(result.text).toMatch(/budget/i);
  });

  it("stops at the token-budget cap", async () => {
    const model = new MockModelProvider();
    vi.spyOn(model, "createMessage").mockResolvedValue({
      ...toolUseResponse("retrieve", { query: "loop" }),
      usage: { inputTokens: 400, outputTokens: 400 },
    });
    const retrieve = makeTool("retrieve", async () => "fact");

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task({ budget: { maxIterations: 100, maxTokens: 1000 } }),
      tools: [retrieve],
      caller,
      db,
      userContent: "go",
    });

    expect(result.tokensUsed).toBeGreaterThanOrEqual(1000);
    expect(result.iterations).toBeLessThan(100);
    expect(result.text).toMatch(/budget/i);
  });

  it("reports max_tokens truncation as a graceful stop", async () => {
    const model = new MockModelProvider().queueResponse({
      ...textResponse("partial"),
      stopReason: "max_tokens",
    });
    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task(),
      tools: [],
      caller,
      db,
      userContent: "go",
    });
    expect(result.text).toMatch(/max_tokens/);
  });
});

describe("runAgentLoop end-to-end scripted run", () => {
  it("runs a multi-tool script to a grounded text answer", async () => {
    const model = new MockModelProvider()
      .queueToolUse("read_prospect", { id: "p1" })
      .queueToolUse("retrieve", { query: "gifts" })
      .queueText("Drafted a summary grounded in the records.");
    const read = makeTool(
      "read_prospect",
      async () => "PROSPECT: Morgan Ellsworth",
      z.object({ id: z.string() }),
    );
    const retrieve = makeTool("retrieve", async () => "FACT: gave $10k [gift:1]");

    const result = await runAgentLoop({
      providers: providersWith(model),
      task: task({ allowedTools: ["read_prospect", "retrieve"] }),
      tools: [read, retrieve],
      caller,
      db,
      userContent: "summarize the prospect",
    });

    expect(result.text).toContain("grounded in the records");
    expect(result.toolCalls).toEqual([
      { name: "read_prospect", ok: true },
      { name: "retrieve", ok: true },
    ]);
  });

  it("truncates oversized tool output to keep the context bounded", async () => {
    const huge = "x".repeat(20000);
    let seenLength = -1;
    const model = new MockModelProvider();
    vi.spyOn(model, "createMessage").mockImplementation(async (req) => {
      const lastUser = req.messages[req.messages.length - 1];
      if (Array.isArray(lastUser?.content)) {
        const toolResult = lastUser.content.find((b) => b.type === "tool_result");
        if (toolResult && toolResult.type === "tool_result") {
          seenLength = toolResult.content.length;
        }
        return textResponse("done");
      }
      return toolUseResponse("retrieve", { query: "x" });
    });
    const retrieve = makeTool("retrieve", async () => huge);

    await runAgentLoop({
      providers: providersWith(model),
      task: task(),
      tools: [retrieve],
      caller,
      db,
      userContent: "go",
    });

    expect(seenLength).toBeGreaterThan(0);
    expect(seenLength).toBeLessThan(9000);
  });
});
