import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isTerminal, JOB_STATES } from "./state";

describe("research job state machine", () => {
  it("allows only the forward one-step transitions", () => {
    expect(canTransition("queued", "researching")).toBe(true);
    expect(canTransition("researching", "ready")).toBe(true);
    expect(canTransition("ready", "reviewed")).toBe(true);
  });

  it("rejects skips", () => {
    expect(canTransition("queued", "ready")).toBe(false);
    expect(canTransition("queued", "reviewed")).toBe(false);
    expect(canTransition("researching", "reviewed")).toBe(false);
  });

  it("rejects backward and self transitions", () => {
    expect(canTransition("researching", "queued")).toBe(false);
    expect(canTransition("ready", "researching")).toBe(false);
    expect(canTransition("reviewed", "ready")).toBe(false);
    expect(canTransition("researching", "researching")).toBe(false);
  });

  it("treats reviewed as terminal", () => {
    expect(isTerminal("reviewed")).toBe(true);
    expect(isTerminal("queued")).toBe(false);
    expect(isTerminal("researching")).toBe(false);
    expect(isTerminal("ready")).toBe(false);
  });

  it("assertTransition throws on an illegal transition", () => {
    expect(() => assertTransition("queued", "reviewed")).toThrowError(/illegal transition/);
    expect(() => assertTransition("queued", "researching")).not.toThrow();
  });

  it("exposes the four states in lifecycle order", () => {
    expect(JOB_STATES).toEqual(["queued", "researching", "ready", "reviewed"]);
  });
});
