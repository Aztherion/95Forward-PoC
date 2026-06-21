import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, MockEmbeddingProvider } from "./embedding";

function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
}

describe("MockEmbeddingProvider", () => {
  const provider = new MockEmbeddingProvider();

  it("reports mock kind and 1536 dimensions", () => {
    expect(provider.kind).toBe("mock");
    expect(provider.dimensions).toBe(EMBEDDING_DIMENSIONS);
  });

  it("is deterministic: the same text yields the same 1536-length unit vector", async () => {
    const a = await provider.embed("Morgan Ellsworth gave a major gift");
    const b = await provider.embed("Morgan Ellsworth gave a major gift");
    expect(a).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(a).toEqual(b);
    expect(magnitude(a)).toBeCloseTo(1, 6);
  });

  it("produces distinct vectors for distinct text", async () => {
    const a = await provider.embed("clean water access");
    const b = await provider.embed("board governance");
    expect(a).not.toEqual(b);
  });

  it("embeds batches positionally and matches single embeds", async () => {
    const texts = ["alpha", "beta", "gamma"];
    const batch = await provider.embedBatch(texts);
    expect(batch).toHaveLength(3);
    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i]!;
      expect(batch[i]).toEqual(await provider.embed(text));
    }
  });
});
