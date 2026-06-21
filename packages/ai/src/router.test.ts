import { describe, expect, it } from "vitest";
import { TASK_REGISTRY, resolveTask } from "./router";
import type { TaskType } from "./types";

describe("resolveTask", () => {
  it("routes summarize_prospect to haiku with the read+retrieve allowlist", () => {
    const task = resolveTask("summarize_prospect");
    expect(task.model).toBe("claude-haiku-4-5");
    expect(task.allowedTools).toEqual([
      "read_prospect",
      "read_constituent",
      "read_knowledge_base",
      "retrieve",
    ]);
  });

  it("routes draft_outreach to sonnet with the draft allowlist", () => {
    const task = resolveTask("draft_outreach");
    expect(task.model).toBe("claude-sonnet-4-6");
    expect(task.allowedTools).toEqual(["read_constituent", "retrieve", "draft_text"]);
  });

  it("routes propose_qpi to sonnet with the qpi allowlist", () => {
    const task = resolveTask("propose_qpi");
    expect(task.model).toBe("claude-sonnet-4-6");
    expect(task.allowedTools).toEqual([
      "read_prospect",
      "read_knowledge_base",
      "retrieve",
      "propose_qpi",
    ]);
  });

  it("routes research_prospect to opus with the research allowlist", () => {
    const task = resolveTask("research_prospect");
    expect(task.model).toBe("claude-opus-4-8");
    expect(task.allowedTools).toEqual([
      "read_constituent",
      "retrieve",
      "propose_knowledge_base_update",
    ]);
  });

  it("keeps every task within the documented token/temperature/budget bounds", () => {
    for (const config of Object.values(TASK_REGISTRY)) {
      expect(config.maxTokens).toBeGreaterThanOrEqual(1024);
      expect(config.maxTokens).toBeLessThanOrEqual(2048);
      expect(config.temperature).toBeGreaterThanOrEqual(0.2);
      expect(config.temperature).toBeLessThanOrEqual(0.4);
      expect(config.budget.maxIterations).toBeGreaterThanOrEqual(6);
      expect(config.budget.maxIterations).toBeLessThanOrEqual(8);
      expect(config.budget.maxTokens).toBeGreaterThan(0);
    }
  });

  it("throws on an unknown task type", () => {
    expect(() => resolveTask("not_a_task" as TaskType)).toThrow(/unknown task type/i);
  });
});
