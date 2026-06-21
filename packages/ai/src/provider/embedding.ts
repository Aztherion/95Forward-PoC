import OpenAI from "openai";
import type { EmbeddingProvider } from "../types";

export const EMBEDDING_DIMENSIONS = 1536;

export interface LiveEmbeddingProviderOptions {
  apiKey: string;
  model?: string;
}

export class LiveEmbeddingProvider implements EmbeddingProvider {
  readonly kind = "live" as const;
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: LiveEmbeddingProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? "text-embedding-3-small";
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    if (vector === undefined) {
      throw new Error("LiveEmbeddingProvider: embedding response was empty");
    }
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      encoding_format: "float",
    });
    return response.data.map((item) => item.embedding);
  }
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Char-frequency features blended with a hashed per-dimension perturbation, then unit-normalized:
// same text -> same vector, distinct text -> distinct vector, without any network call.
function embedDeterministic(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const seed = hashString(text);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const index = (code + i * 131 + seed) % EMBEDDING_DIMENSIONS;
    vector[index] = (vector[index] ?? 0) + 1 + ((code ^ seed) % 7);
  }
  for (let d = 0; d < EMBEDDING_DIMENSIONS; d += 1) {
    const mixed = hashString(`${text}:${d}`) / 0xffffffff;
    vector[d] = (vector[d] ?? 0) + mixed * 0.5;
  }
  const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (norm === 0) {
    const fallback = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    fallback[0] = 1;
    return fallback;
  }
  return vector.map((value) => value / norm);
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly kind = "mock" as const;
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embed(text: string): Promise<number[]> {
    return embedDeterministic(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((text) => embedDeterministic(text));
  }
}
