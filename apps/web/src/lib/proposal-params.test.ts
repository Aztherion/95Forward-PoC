import { describe, expect, it } from "vitest";
import {
  hasActiveProposalFilters,
  parseProposalListParams,
  proposalParamsToSearch,
} from "./proposal-params";

describe("parseProposalListParams", () => {
  it("returns a null status for empty input", () => {
    expect(parseProposalListParams({})).toEqual({ status: null });
  });

  it("parses a valid status", () => {
    expect(parseProposalListParams({ status: "submitted" }).status).toBe("submitted");
  });

  it("rejects an unknown status", () => {
    expect(parseProposalListParams({ status: "rejected" }).status).toBeNull();
  });

  it("takes the first value when arrays are provided", () => {
    expect(parseProposalListParams({ status: ["draft", "funded"] }).status).toBe("draft");
  });
});

describe("proposalParamsToSearch", () => {
  it("omits a null status", () => {
    expect(proposalParamsToSearch({ status: null }).toString()).toBe("");
  });

  it("serializes a set status", () => {
    expect(proposalParamsToSearch({ status: "under_review" }).get("status")).toBe("under_review");
  });
});

describe("hasActiveProposalFilters", () => {
  it("is false for bare defaults", () => {
    expect(hasActiveProposalFilters(parseProposalListParams({}))).toBe(false);
  });

  it("is true when status is set", () => {
    expect(hasActiveProposalFilters({ status: "funded" })).toBe(true);
  });
});
