import { describe, expect, it } from "vitest";
import { isForwardRoute, resolveRegister } from "./register";

describe("resolveRegister", () => {
  it("treats host core routes as the host register", () => {
    for (const path of [
      "/",
      "/constituents",
      "/revenue",
      "/major-giving",
      "/major-giving/opportunities",
      "/lists",
      "/marketing",
      "/settings",
    ]) {
      expect(resolveRegister(path)).toBe("host");
    }
  });

  it("treats /95-forward and its descendants as the 95 Forward register", () => {
    for (const path of [
      "/95-forward",
      "/95-forward/today",
      "/95-forward/prospects",
      "/95-forward/green-sheet",
      "/95-forward/initiatives",
      "/95-forward/visit",
    ]) {
      expect(resolveRegister(path)).toBe("95-forward");
    }
  });

  it("ignores query strings and hashes", () => {
    expect(resolveRegister("/95-forward/today?tab=open#row-3")).toBe("95-forward");
    expect(resolveRegister("/constituents?q=smith")).toBe("host");
  });

  it("does not match lookalike prefixes", () => {
    expect(resolveRegister("/95-forwarded")).toBe("host");
    expect(resolveRegister("/95-forward-extras")).toBe("host");
  });

  it("exposes a boolean convenience helper", () => {
    expect(isForwardRoute("/95-forward/visit")).toBe(true);
    expect(isForwardRoute("/")).toBe(false);
  });
});
