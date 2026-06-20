import { describe, expect, it } from "vitest";
import {
  constituentInputSchema,
  giftInputSchema,
  interactionInputSchema,
  relationshipInputSchema,
  savedListInputSchema,
  tagInputSchema,
} from "./forms";

const UUID = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";

describe("constituentInputSchema", () => {
  it("accepts a minimal valid constituent and defaults flags", () => {
    const parsed = constituentInputSchema.parse({ type: "individual", displayName: "Jane Doe" });
    expect(parsed.prospectStatus).toBe("none");
    expect(parsed.boardMember).toBe(false);
  });

  it("requires a display name", () => {
    expect(() => constituentInputSchema.parse({ type: "foundation", displayName: "" })).toThrow();
  });

  it("rejects an unknown type and a bad email", () => {
    expect(() => constituentInputSchema.parse({ type: "robot", displayName: "X" })).toThrow();
    expect(() =>
      constituentInputSchema.parse({ type: "individual", displayName: "X", email: "nope" }),
    ).toThrow();
  });
});

describe("giftInputSchema", () => {
  it("accepts a valid gift", () => {
    const parsed = giftInputSchema.parse({
      constituentId: "11111111-1111-1111-1111-111111111111",
      amountCents: 5000,
      giftDate: "2026-03-01",
      giftType: "one_time",
    });
    expect(parsed.receiptStatus).toBe("unreceipted");
  });

  it("rejects non-positive amounts, bad dates, and unknown gift types", () => {
    const base = {
      constituentId: "11111111-1111-1111-1111-111111111111",
      giftDate: "2026-03-01",
      giftType: "one_time" as const,
    };
    expect(() => giftInputSchema.parse({ ...base, amountCents: 0 })).toThrow();
    expect(() =>
      giftInputSchema.parse({ ...base, amountCents: 100, giftDate: "03/01/2026" }),
    ).toThrow();
    expect(() =>
      giftInputSchema.parse({ ...base, amountCents: 100, giftType: "donation" }),
    ).toThrow();
  });
});

describe("savedListInputSchema", () => {
  it("accepts a saved list definition with filters", () => {
    const parsed = savedListInputSchema.parse({
      name: "Major donors",
      recordType: "constituent",
      definition: { filters: [{ field: "type", operator: "eq", value: "foundation" }] },
    });
    expect(parsed.definition.filters).toHaveLength(1);
  });
});

describe("interactionInputSchema", () => {
  it("accepts a valid interaction", () => {
    const parsed = interactionInputSchema.parse({
      constituentId: UUID,
      type: "call",
      occurredAt: "2026-03-01",
    });
    expect(parsed.type).toBe("call");
  });

  it("rejects unknown types and malformed dates", () => {
    expect(() =>
      interactionInputSchema.parse({
        constituentId: UUID,
        type: "carrier_pigeon",
        occurredAt: "2026-03-01",
      }),
    ).toThrow();
    expect(() =>
      interactionInputSchema.parse({ constituentId: UUID, type: "call", occurredAt: "03/01/2026" }),
    ).toThrow();
  });
});

describe("relationshipInputSchema", () => {
  it("accepts a linked constituent relationship", () => {
    const parsed = relationshipInputSchema.parse({
      fromConstituentId: UUID,
      toConstituentId: UUID_B,
      type: "connector",
    });
    expect(parsed.toConstituentId).toBe(UUID_B);
  });

  it("accepts an external-name relationship", () => {
    const parsed = relationshipInputSchema.parse({
      fromConstituentId: UUID,
      externalName: "David Hallworth (Trustee)",
      type: "board_contact",
    });
    expect(parsed.externalName).toBe("David Hallworth (Trustee)");
  });

  it("requires either a linked constituent or an external name", () => {
    expect(() =>
      relationshipInputSchema.parse({ fromConstituentId: UUID, type: "peer" }),
    ).toThrow();
  });
});

describe("tagInputSchema", () => {
  it("accepts an existing tag id", () => {
    const parsed = tagInputSchema.parse({ constituentId: UUID, tagId: UUID_B });
    expect(parsed.tagId).toBe(UUID_B);
  });

  it("accepts a new tag name", () => {
    const parsed = tagInputSchema.parse({ constituentId: UUID, newTagName: "Climate" });
    expect(parsed.newTagName).toBe("Climate");
  });

  it("requires either a tag id or a new tag name", () => {
    expect(() => tagInputSchema.parse({ constituentId: UUID })).toThrow();
  });
});
