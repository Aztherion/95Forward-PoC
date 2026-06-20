import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const VALID_DB = "postgres://app:secret@localhost:5432/forward";

describe("parseEnv", () => {
  it("accepts a minimal valid environment and applies defaults", () => {
    const env = parseEnv({ DATABASE_URL: VALID_DB });
    expect(env.DATABASE_URL).toBe(VALID_DB);
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_ENV).toBe("local");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.WORKER_PORT).toBe(3001);
  });

  it("requires DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
  });

  it("rejects a malformed DATABASE_URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "not-a-url" })).toThrowError(/DATABASE_URL/);
  });

  it("coerces WORKER_PORT from a string", () => {
    const env = parseEnv({ DATABASE_URL: VALID_DB, WORKER_PORT: "4010" });
    expect(env.WORKER_PORT).toBe(4010);
  });

  it("rejects an out-of-range WORKER_PORT", () => {
    expect(() => parseEnv({ DATABASE_URL: VALID_DB, WORKER_PORT: "70000" })).toThrowError(
      /WORKER_PORT/,
    );
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseEnv({ DATABASE_URL: VALID_DB, NODE_ENV: "staging" })).toThrowError(
      /NODE_ENV/,
    );
  });
});
