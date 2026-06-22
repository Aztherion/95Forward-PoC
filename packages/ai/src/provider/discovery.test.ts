import { describe, expect, it, vi } from "vitest";
import { LiveDiscoveryProvider, SeededDiscoveryProvider } from "./discovery";
import { ADVERSARIAL_INJECTION_SNIPPET } from "./research";

const createMessage = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMessage };
  },
}));

describe("SeededDiscoveryProvider", () => {
  const provider = new SeededDiscoveryProvider();

  it("reports demo kind", () => {
    expect(provider.kind).toBe("demo");
  });

  it("returns fictional candidate suggestions for a known connector", async () => {
    const result = await provider.discover({
      connectorName: "Sandra Kim",
      initiativeContext: "Bolivia Scale-Up",
    });
    expect(result.suggestions.length).toBeGreaterThan(0);
    const names = result.suggestions.map((s) => s.name);
    expect(names).toContain("Lena Petrov");
    expect(names).toContain("David Osei");
  });

  it("is deterministic — same connector yields the same suggestions", async () => {
    const a = await provider.discover({ connectorName: "Sandra Kim", initiativeContext: "x" });
    const b = await provider.discover({ connectorName: "Sandra Kim", initiativeContext: "x" });
    expect(a).toEqual(b);
  });

  it("carries the adversarial snippet as affinity evidence DATA, not an instruction", async () => {
    const result = await provider.discover({
      connectorName: "Sandra Kim",
      initiativeContext: "Bolivia Scale-Up",
    });
    const affinities = result.suggestions.map((s) => s.evidenceAffinity);
    expect(affinities).toContain(ADVERSARIAL_INJECTION_SNIPPET);
  });

  it("treats missing affinity as a first-class unknown (null), not fabricated", async () => {
    const result = await provider.discover({
      connectorName: "Tom Bradley",
      initiativeContext: "The Forever Promise",
    });
    expect(result.suggestions.some((s) => s.evidenceAffinity === null)).toBe(true);
  });

  it("returns no suggestions for an unknown connector rather than inventing people", async () => {
    const result = await provider.discover({
      connectorName: "Nobody In Particular",
      initiativeContext: "x",
    });
    expect(result.suggestions).toEqual([]);
  });
});

describe("LiveDiscoveryProvider", () => {
  it("reports live kind", () => {
    const provider = new LiveDiscoveryProvider({ apiKey: "sk-test" });
    expect(provider.kind).toBe("live");
  });

  it("maps web_search_tool_result blocks into hypothesis-grade suggestions", async () => {
    createMessage.mockResolvedValueOnce({
      content: [
        { type: "text", text: "Here is what I found." },
        {
          type: "web_search_tool_result",
          content: [
            { title: "Jordan Reyes", url: "https://example.org/jordan-reyes" },
            { title: "No url here" },
          ],
        },
      ],
    });
    const provider = new LiveDiscoveryProvider({ apiKey: "sk-test" });
    const result = await provider.discover({ connectorName: "X", initiativeContext: "Y" });
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]?.name).toBe("Jordan Reyes");
    expect(result.suggestions[0]?.confidence).toBe("low");
  });
});
