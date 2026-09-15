import { describe, expect, it } from "vitest";
import { assertResetAllowed, databaseNameFrom, ResetNotAllowedError } from "./reset";

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

// ---------------------------------------------------------------------------------------------
// The fourth guard (D1): which database, not just whether.
// ---------------------------------------------------------------------------------------------

describe("the target-database guard", () => {
  const allowed = {
    ALLOW_DESTRUCTIVE_RESET: "true",
    RESEARCH_MODE: "demo",
    DATABASE_URL: "postgres://user:pw@host:5432/forward_demo",
  } as NodeJS.ProcessEnv;
  const confirm = ["node", "reset.ts", "--confirm"];

  it("is opt-in — an unset expectation does not block a local reset", () => {
    expect(() => assertResetAllowed(allowed, confirm)).not.toThrow();
  });

  it("allows the reset when the name matches", () => {
    expect(() =>
      assertResetAllowed({ ...allowed, DEMO_DATABASE_NAME: "forward_demo" }, confirm),
    ).not.toThrow();
  });

  it("REFUSES when DATABASE_URL points somewhere else", () => {
    // The gap the other three guards leave open: they establish that SOME database may be reset
    // and say nothing about which. An operator with a Console shell on the demo app and a
    // DATABASE_URL from another environment exported in their own shell satisfies all three.
    expect(() =>
      assertResetAllowed(
        {
          ...allowed,
          DEMO_DATABASE_NAME: "forward_demo",
          DATABASE_URL: "postgres://user:pw@prod-host:5432/customer_live",
        },
        confirm,
      ),
    ).toThrow(ResetNotAllowedError);
  });

  it("names both databases in the refusal, so the operator can see which shell is wrong", () => {
    let message = "";
    try {
      assertResetAllowed(
        {
          ...allowed,
          DEMO_DATABASE_NAME: "forward_demo",
          DATABASE_URL: "postgres://user:pw@prod-host:5432/customer_live",
        },
        confirm,
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("forward_demo");
    expect(message).toContain("customer_live");
  });

  it("refuses rather than proceeding when the URL cannot be read", () => {
    expect(() =>
      assertResetAllowed(
        { ...allowed, DEMO_DATABASE_NAME: "forward_demo", DATABASE_URL: "not-a-url" },
        confirm,
      ),
    ).toThrow(ResetNotAllowedError);
  });

  it("reads the database name off a connection URL", () => {
    expect(databaseNameFrom("postgres://u:p@h:5432/forward_demo")).toBe("forward_demo");
    expect(databaseNameFrom("postgres://u:p@h:5432/forward_demo?sslmode=require")).toBe(
      "forward_demo",
    );
    expect(databaseNameFrom("postgres://u:p@h:5432/")).toBeNull();
    expect(databaseNameFrom(undefined)).toBeNull();
    expect(databaseNameFrom("garbage")).toBeNull();
  });

  it("still refuses without the first three, whatever the name says", () => {
    // Layer 4 ADDS to the others; it does not replace any of them.
    const named = { ...allowed, DEMO_DATABASE_NAME: "forward_demo" };
    expect(() =>
      assertResetAllowed({ ...named, ALLOW_DESTRUCTIVE_RESET: undefined }, confirm),
    ).toThrow(ResetNotAllowedError);
    expect(() => assertResetAllowed({ ...named, RESEARCH_MODE: "live" }, confirm)).toThrow(
      ResetNotAllowedError,
    );
    expect(() => assertResetAllowed(named, ["node", "reset.ts"])).toThrow(ResetNotAllowedError);
  });
});
