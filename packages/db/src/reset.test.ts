import { describe, expect, it } from "vitest";
import { assertResetAllowed, ResetNotAllowedError } from "./reset";

const PASSING_ENV = { ALLOW_DESTRUCTIVE_RESET: "true", RESEARCH_MODE: "demo" } as NodeJS.ProcessEnv;
const CONFIRM = ["node", "reset.ts", "--confirm"];

describe("assertResetAllowed (the destructive-reset guard)", () => {
  it("refuses when ALLOW_DESTRUCTIVE_RESET is not 'true'", () => {
    expect(() => assertResetAllowed({ RESEARCH_MODE: "demo" }, CONFIRM)).toThrow(
      ResetNotAllowedError,
    );
    expect(() =>
      assertResetAllowed({ ALLOW_DESTRUCTIVE_RESET: "false", RESEARCH_MODE: "demo" }, CONFIRM),
    ).toThrow(/ALLOW_DESTRUCTIVE_RESET/);
  });

  it("refuses when RESEARCH_MODE=live even if the marker is set and --confirm is passed", () => {
    expect(() =>
      assertResetAllowed({ ALLOW_DESTRUCTIVE_RESET: "true", RESEARCH_MODE: "live" }, CONFIRM),
    ).toThrow(/RESEARCH_MODE=live/);
  });

  it("refuses when --confirm is absent even with the marker set", () => {
    expect(() => assertResetAllowed(PASSING_ENV, ["node", "reset.ts"])).toThrow(/--confirm/);
  });

  it("does NOT refuse on NODE_ENV=production when the marker, mode, and --confirm all hold", () => {
    // The deployed demo runs NODE_ENV=production; the guard must NOT key on it.
    const env = {
      ALLOW_DESTRUCTIVE_RESET: "true",
      RESEARCH_MODE: "demo",
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv;
    expect(() => assertResetAllowed(env, CONFIRM)).not.toThrow();
  });

  it("passes when all three layers hold", () => {
    expect(() => assertResetAllowed(PASSING_ENV, CONFIRM)).not.toThrow();
  });
});
