import { describe, expect, it } from "vitest";
import {
  buildMockScripts,
  MOCK_SCRIPTS,
  MockModelProvider,
  textResponse,
  toolUseResponse,
} from "./model";
import { buildToolset } from "../tools";
import type { AnyTool, ModelRequest, ModelToolUseBlock } from "../types";

function request(userText: string): ModelRequest {
  return {
    model: "claude-haiku-4-5",
    maxTokens: 1024,
    system: "system",
    messages: [{ role: "user", content: userText }],
  };
}

describe("MockModelProvider", () => {
  it("replays a queued sequence in order", async () => {
    const provider = new MockModelProvider()
      .queueToolUse("retrieve", { query: "x" })
      .queueText("done");
    const first = await provider.createMessage(request("anything"));
    expect(first.stopReason).toBe("tool_use");
    const second = await provider.createMessage(request("anything"));
    expect(second.stopReason).toBe("end_turn");
    expect(second.content).toEqual([{ type: "text", text: "done" }]);
  });

  it("is deterministic: the same script tag replays identically", async () => {
    const script = [toolUseResponse("retrieve", { query: "x" }), textResponse("ok")];
    const a = MockModelProvider.scripted({ propose_qpi: script });
    const b = MockModelProvider.scripted({ propose_qpi: script });
    const ra = await a.createMessage(request("please propose_qpi now"));
    const rb = await b.createMessage(request("please propose_qpi now"));
    expect(ra).toEqual(rb);
  });

  it("selects a script by a tag found in the first user message", async () => {
    const provider = MockModelProvider.scripted(MOCK_SCRIPTS);
    const step1 = await provider.createMessage(request("run propose_qpi for the prospect"));
    expect(step1.stopReason).toBe("tool_use");
    expect(step1.content[0]).toMatchObject({ type: "tool_use", name: "retrieve" });
  });

  it("throws when no queued response and no script tag matches", async () => {
    const provider = MockModelProvider.scripted(MOCK_SCRIPTS);
    await expect(provider.createMessage(request("unmatched content"))).rejects.toThrow(
      /no queued response and no script tag matched/,
    );
  });

  it("exposes a ready propose_qpi script ending in an end_turn confirmation", () => {
    const script = MOCK_SCRIPTS.propose_qpi!;
    expect(script).toHaveLength(3);
    expect(script[0]).toMatchObject({ stopReason: "tool_use" });
    expect(script[1]?.content[0]).toMatchObject({ type: "tool_use", name: "propose_qpi" });
    const last = script[2]!;
    expect(last.stopReason).toBe("end_turn");
    expect(last.content[0]).toMatchObject({ type: "text" });
  });
});

describe("buildMockScripts emits inputs valid against the real tool schemas", () => {
  const PROSPECT_ID = "11111111-1111-4111-8111-111111111111";
  const CONSTITUENT_ID = "22222222-2222-4222-8222-222222222222";
  const scripts = buildMockScripts({
    prospectId: PROSPECT_ID,
    constituentId: CONSTITUENT_ID,
  });
  const toolsByName = new Map(buildToolset().map((tool) => [tool.name, tool] as const));

  function toolUseBlocks(script: (typeof scripts)[string]): ModelToolUseBlock[] {
    return script
      .flatMap((response) => response.content)
      .filter((block): block is ModelToolUseBlock => block.type === "tool_use");
  }

  function expectValidAgainstRealSchema(name: string, input: Record<string, unknown>): void {
    const tool = toolsByName.get(name) as AnyTool | undefined;
    expect(tool, `tool ${name} exists in the real toolset`).toBeDefined();
    const parsed = tool!.inputSchema.safeParse(input);
    expect(parsed.success, `${name} input rejected: ${JSON.stringify(parsed)}`).toBe(true);
  }

  it("propose_qpi script: retrieve and propose_qpi inputs satisfy the real schemas", () => {
    const blocks = toolUseBlocks(scripts.propose_qpi!);
    const names = blocks.map((block) => block.name);
    expect(names).toEqual(["retrieve", "propose_qpi"]);
    for (const block of blocks) {
      expectValidAgainstRealSchema(block.name, block.input);
    }
    const qpi = blocks.find((block) => block.name === "propose_qpi")!;
    expect(qpi.input.prospectId).toBe(PROSPECT_ID);
  });

  it("draft_outreach script: retrieve and draft_text inputs satisfy the real schemas", () => {
    const blocks = toolUseBlocks(scripts.draft_outreach!);
    const names = blocks.map((block) => block.name);
    expect(names).toEqual(["retrieve", "draft_text"]);
    for (const block of blocks) {
      expectValidAgainstRealSchema(block.name, block.input);
    }
    const draft = blocks.find((block) => block.name === "draft_text")!;
    expect(draft.input.constituentId).toBe(CONSTITUENT_ID);
  });

  it("honors a custom dimension", () => {
    const custom = buildMockScripts({
      prospectId: PROSPECT_ID,
      constituentId: CONSTITUENT_ID,
      dimension: "relationship",
    });
    const qpi = toolUseBlocks(custom.propose_qpi!).find((block) => block.name === "propose_qpi")!;
    expect(qpi.input.dimension).toBe("relationship");
    expectValidAgainstRealSchema("propose_qpi", qpi.input);
  });
});
