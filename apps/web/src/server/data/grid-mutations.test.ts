import { describe, expect, it } from "vitest";
import { GRID_EDITABLE_FIELDS } from "@95forward/shared";
import { isGridEditableField, parseGridEdit } from "./grid-mutations";

const ALLOWED = {
  initiatives: new Set(["i-kamuli", "i-bolivia"]),
  owners: new Set(["u-dana", "u-priya"]),
};

const parse = (field: Parameters<typeof parseGridEdit>[0], value: string | null) =>
  parseGridEdit(field, value, ALLOWED);

describe("a cell is validated against the typed model, not accepted like a spreadsheet", () => {
  it("accepts a plain amount and stores it in cents", () => {
    expect(parse("amountCents", "250000")).toEqual({ patch: { amountCents: 25_000_000 } });
  });

  it("accepts what a human actually types into a money cell", () => {
    for (const typed of ["$250,000", "250,000", " 250000 ", "$250000"]) {
      expect(parse("amountCents", typed).patch, typed).toEqual({ amountCents: 25_000_000 });
    }
    expect(parse("amountCents", "1234.56").patch).toEqual({ amountCents: 123_456 });
  });

  it("rejects nonsense, zero and negatives, each with a sentence", () => {
    for (const bad of ["", "abc", "$$", "0", "-100"]) {
      const result = parse("amountCents", bad);
      expect(result.patch, bad).toEqual({});
      expect(result.error, bad).toBeTruthy();
      // A rejection has to say WHY. "Invalid" teaches a rep nothing and a silent revert teaches
      // them the tool loses their work.
      expect(result.error!.length, bad).toBeGreaterThan(10);
    }
  });

  it("rejects an amount that is almost certainly a typo", () => {
    expect(parse("amountCents", "999999999").error).toMatch(/\$100M/);
  });

  it("accepts every value of each enum and nothing else", () => {
    expect(parse("stage", "visit_and_ask").patch).toEqual({ stage: "visit_and_ask" });
    expect(parse("stage", "Visit & ask").error).toBeTruthy();
    expect(parse("stage", "").error).toBeTruthy();
    expect(parse("probability", "lock").patch).toEqual({ probability: "lock" });
    expect(parse("probability", "certain").error).toBeTruthy();
    expect(parse("dateConfidence", "semi_firm").patch).toEqual({ dateConfidence: "semi_firm" });
    expect(parse("dateConfidence", "very").error).toBeTruthy();
  });

  it("treats clearing the visit rating as an edit, not a failure", () => {
    // It is genuinely nullable: "we have not rated this visit" is a state, not a mistake.
    expect(parse("visitRating", "")).toEqual({ patch: { visitRating: null } });
    expect(parse("visitRating", "strong").patch).toEqual({ visitRating: "strong" });
    expect(parse("visitRating", "excellent").error).toBeTruthy();
  });

  it("clears a close date but refuses a malformed one", () => {
    expect(parse("closeDate", "")).toEqual({ patch: { closeDate: null } });
    expect(parse("closeDate", "2026-10-31").patch).toEqual({ closeDate: "2026-10-31" });
    for (const bad of ["31/10/2026", "2026-10", "next Tuesday", "2026-13-01"]) {
      expect(parse("closeDate", bad).error, bad).toBeTruthy();
    }
  });

  it("accepts only this tenant's initiatives and users", () => {
    // A well-formed uuid belonging to ANOTHER tenant is exactly the input that must not work, and
    // a shape check would wave it through. The allowed sets are read under RLS.
    expect(parse("initiativeId", "i-kamuli").patch).toEqual({ initiativeId: "i-kamuli" });
    expect(parse("initiativeId", "00000000-0000-0000-0000-000000000001").error).toBeTruthy();
    expect(parse("ownerUserId", "u-priya").patch).toEqual({ ownerUserId: "u-priya" });
    expect(parse("ownerUserId", "someone-elses-user").error).toBeTruthy();
  });

  it("treats a null value the same as an empty one", () => {
    expect(parse("visitRating", null).patch).toEqual({ visitRating: null });
    expect(parse("amountCents", null).error).toBeTruthy();
  });
});

describe("the editable set is closed", () => {
  it("recognises exactly the eight fields and refuses anything else", () => {
    for (const field of GRID_EDITABLE_FIELDS) expect(isGridEditableField(field)).toBe(true);
    // `status` is the one that matters: winning and losing a deal are not cell edits, and neither
    // is creating or deleting one.
    for (const nope of ["status", "id", "tenantId", "prospectId", "amountNote", "__proto__"]) {
      expect(isGridEditableField(nope), nope).toBe(false);
    }
  });

  it("never returns a patch touching a field other than the one asked for", () => {
    for (const field of GRID_EDITABLE_FIELDS) {
      const { patch } = parse(field, field === "amountCents" ? "1000" : "");
      expect(Object.keys(patch).length).toBeLessThanOrEqual(1);
      if (Object.keys(patch).length === 1) expect(Object.keys(patch)[0]).toBe(field);
    }
  });
});
