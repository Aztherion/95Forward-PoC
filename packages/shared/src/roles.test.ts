import { describe, expect, it } from "vitest";
import { ROLE_LABELS, canViewTeamScope, isLeadership } from "./roles";

describe("roles", () => {
  it("labels every role", () => {
    expect(ROLE_LABELS.major_gifts_officer).toBe("Major Gifts Officer");
    expect(ROLE_LABELS.gift_officer).toBe("Gift Officer");
    expect(ROLE_LABELS.chief_development_officer).toBe("Chief Development Officer");
  });

  it("grants team scope only to leadership", () => {
    expect(canViewTeamScope("chief_development_officer")).toBe(true);
    expect(canViewTeamScope("major_gifts_officer")).toBe(false);
    expect(canViewTeamScope("gift_officer")).toBe(false);
  });

  it("identifies leadership", () => {
    expect(isLeadership("chief_development_officer")).toBe(true);
    expect(isLeadership("gift_officer")).toBe(false);
  });
});
