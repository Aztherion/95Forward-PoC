import { describe, expect, it } from "vitest";
import { parseEnv, parseWorkerEnv, resolveEmbeddingMode } from "./env";

const VALID = {
  DATABASE_URL: "postgres://app:secret@localhost:5432/forward",
  AUTH0_DOMAIN: "tenant.us.auth0.com",
  AUTH0_CLIENT_ID: "client-id",
  AUTH0_CLIENT_SECRET: "client-secret",
  AUTH0_SECRET: "0".repeat(64),
  APP_BASE_URL: "http://localhost:3000",
};

const VALID_WORKER = {
  DATABASE_URL: "postgres://forward:secret@localhost:5432/forward",
  APP_DATABASE_URL: "postgres://app_user:secret@localhost:5432/forward",
};

describe("parseEnv", () => {
  it("accepts a valid environment and applies defaults", () => {
    const env = parseEnv(VALID);
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_ENV).toBe("local");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.WORKER_PORT).toBe(3001);
    expect(env.E2E_TEST_MODE).toBe(false);
    expect(env.AUTH0_DOMAIN).toBe(VALID.AUTH0_DOMAIN);
  });

  it("requires DATABASE_URL", () => {
    const { DATABASE_URL: _omitted, ...rest } = VALID;
    expect(() => parseEnv(rest)).toThrowError(/DATABASE_URL/);
  });

  it("requires the Auth0 variables", () => {
    const { AUTH0_DOMAIN: _omitted, ...rest } = VALID;
    expect(() => parseEnv(rest)).toThrowError(/AUTH0_DOMAIN/);
  });

  it("rejects a malformed DATABASE_URL", () => {
    expect(() => parseEnv({ ...VALID, DATABASE_URL: "not-a-url" })).toThrowError(/DATABASE_URL/);
  });

  it("rejects a malformed APP_BASE_URL", () => {
    expect(() => parseEnv({ ...VALID, APP_BASE_URL: "nope" })).toThrowError(/APP_BASE_URL/);
  });

  it("coerces WORKER_PORT from a string", () => {
    expect(parseEnv({ ...VALID, WORKER_PORT: "4010" }).WORKER_PORT).toBe(4010);
  });

  it("parses E2E_TEST_MODE into a boolean", () => {
    expect(parseEnv({ ...VALID, E2E_TEST_MODE: "true" }).E2E_TEST_MODE).toBe(true);
    expect(parseEnv({ ...VALID, E2E_TEST_MODE: "false" }).E2E_TEST_MODE).toBe(false);
  });

  it("rejects an out-of-range WORKER_PORT", () => {
    expect(() => parseEnv({ ...VALID, WORKER_PORT: "70000" })).toThrowError(/WORKER_PORT/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseEnv({ ...VALID, NODE_ENV: "staging" })).toThrowError(/NODE_ENV/);
  });

  it("defaults AI to mock mode and does not require API keys", () => {
    const env = parseEnv(VALID);
    expect(env.AI_MODE).toBe("mock");
    expect(env.RESEARCH_MODE).toBe("demo");
    expect(env.EMBEDDINGS_MODEL).toBe("text-embedding-3-small");
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("requires ANTHROPIC_API_KEY when RESEARCH_MODE=live even if AI_MODE=mock", () => {
    expect(() => parseEnv({ ...VALID, AI_MODE: "mock", RESEARCH_MODE: "live" })).toThrowError(
      /ANTHROPIC_API_KEY/,
    );
    const env = parseEnv({ ...VALID, RESEARCH_MODE: "live", ANTHROPIC_API_KEY: "sk-x" });
    expect(env.RESEARCH_MODE).toBe("live");
  });

  it("requires ANTHROPIC_API_KEY only when AI_MODE=live", () => {
    expect(() => parseEnv({ ...VALID, AI_MODE: "live" })).toThrowError(/ANTHROPIC_API_KEY/);
    const env = parseEnv({
      ...VALID,
      AI_MODE: "live",
      ANTHROPIC_API_KEY: "sk-x",
      OPENAI_API_KEY: "sk-y",
    });
    expect(env.AI_MODE).toBe("live");
  });

  it("requires OPENAI_API_KEY when embeddings run live (via AI_MODE or EMBEDDING_MODE)", () => {
    expect(() => parseEnv({ ...VALID, AI_MODE: "mock", EMBEDDING_MODE: "live" })).toThrowError(
      /OPENAI_API_KEY/,
    );
    const env = parseEnv({ ...VALID, EMBEDDING_MODE: "live", OPENAI_API_KEY: "sk-y" });
    expect(resolveEmbeddingMode(env)).toBe("live");
  });

  it("resolves embedding mode from AI_MODE when EMBEDDING_MODE is unset", () => {
    expect(resolveEmbeddingMode({ AI_MODE: "mock", EMBEDDING_MODE: undefined })).toBe("mock");
    expect(resolveEmbeddingMode({ AI_MODE: "live", EMBEDDING_MODE: undefined })).toBe("live");
    expect(resolveEmbeddingMode({ AI_MODE: "live", EMBEDDING_MODE: "mock" })).toBe("mock");
  });
});

describe("parseWorkerEnv", () => {
  it("accepts a worker environment without any Auth0 variables", () => {
    const env = parseWorkerEnv(VALID_WORKER);
    expect(env.DATABASE_URL).toBe(VALID_WORKER.DATABASE_URL);
    expect(env.APP_DATABASE_URL).toBe(VALID_WORKER.APP_DATABASE_URL);
    expect(env.AI_MODE).toBe("mock");
    expect(env.RESEARCH_MODE).toBe("demo");
    expect(env.JOBS_CONCURRENCY).toBe(3);
    expect(env.JOBS_SCHEMA).toBe("graphile_worker");
  });

  it("requires APP_DATABASE_URL", () => {
    const { APP_DATABASE_URL: _omitted, ...rest } = VALID_WORKER;
    expect(() => parseWorkerEnv(rest)).toThrowError(/APP_DATABASE_URL/);
  });

  it("coerces JOBS_CONCURRENCY from a string", () => {
    expect(parseWorkerEnv({ ...VALID_WORKER, JOBS_CONCURRENCY: "8" }).JOBS_CONCURRENCY).toBe(8);
  });

  it("still enforces the live AI key refinement", () => {
    expect(() => parseWorkerEnv({ ...VALID_WORKER, AI_MODE: "live" })).toThrowError(
      /ANTHROPIC_API_KEY/,
    );
  });

  it("does not require Auth0 vars that the web schema requires", () => {
    expect(() => parseEnv(VALID_WORKER)).toThrowError(/AUTH0_DOMAIN/);
    expect(() => parseWorkerEnv(VALID_WORKER)).not.toThrow();
  });
});
