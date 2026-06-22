import { resolveEmbeddingMode, type Env } from "@95forward/shared";
import type { Providers } from "../types";
import { LiveEmbeddingProvider, MockEmbeddingProvider } from "./embedding";
import { LiveModelProvider, MockModelProvider, MOCK_SCRIPTS } from "./model";
import { LiveResearchProvider, SeededResearchProvider } from "./research";

export * from "./model";
export * from "./embedding";
export * from "./research";

type ProviderEnv = Pick<
  Env,
  | "AI_MODE"
  | "EMBEDDING_MODE"
  | "RESEARCH_MODE"
  | "ANTHROPIC_API_KEY"
  | "OPENAI_API_KEY"
  | "EMBEDDINGS_MODEL"
>;

export function createProviders(env: ProviderEnv): Providers {
  return {
    model: createModelProvider(env),
    embedding: createEmbeddingProvider(env),
    research: createResearchProvider(env),
  };
}

function createModelProvider(env: ProviderEnv): Providers["model"] {
  if (env.AI_MODE === "live") {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("createProviders: ANTHROPIC_API_KEY is required when AI_MODE=live");
    }
    return new LiveModelProvider({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return MockModelProvider.scripted(MOCK_SCRIPTS);
}

function createEmbeddingProvider(env: ProviderEnv): Providers["embedding"] {
  if (resolveEmbeddingMode(env) === "live") {
    if (!env.OPENAI_API_KEY) {
      throw new Error("createProviders: OPENAI_API_KEY is required when embeddings run live");
    }
    return new LiveEmbeddingProvider({ apiKey: env.OPENAI_API_KEY, model: env.EMBEDDINGS_MODEL });
  }
  return new MockEmbeddingProvider();
}

function createResearchProvider(env: ProviderEnv): Providers["research"] {
  if (env.RESEARCH_MODE === "live") {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("createProviders: ANTHROPIC_API_KEY is required when RESEARCH_MODE=live");
    }
    return new LiveResearchProvider({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return new SeededResearchProvider();
}
