import { describe, expect, it } from "vitest";
import {
  communicationInputSchema,
  constituentInputSchema,
  copilotTogglesInputSchema,
  eventInputSchema,
  giftInputSchema,
  interactionInputSchema,
  membershipInputSchema,
  membershipTierInputSchema,
  naturalPartnerInputSchema,
  qpiOverrideInputSchema,
  qpiWeightsInputSchema,
  registrationInputSchema,
  relationshipInputSchema,
  savedListInputSchema,
  segmentInputSchema,
  tagInputSchema,
  volunteerHoursInputSchema,
  volunteerOpportunityInputSchema,
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

describe("segmentInputSchema", () => {
  it("accepts a segment defined by a constituent filter", () => {
    const parsed = segmentInputSchema.parse({
      name: "Lapsed donors",
      definition: { filters: [{ field: "prospectStatus", operator: "eq", value: "donor" }] },
    });
    expect(parsed.definition.filters).toHaveLength(1);
  });

  it("requires a name", () => {
    expect(() => segmentInputSchema.parse({ name: "", definition: { filters: [] } })).toThrow();
  });
});

describe("communicationInputSchema", () => {
  it("accepts a draft and defaults status to draft", () => {
    const parsed = communicationInputSchema.parse({
      name: "World Water Day appeal",
      channel: "appeal",
    });
    expect(parsed.status).toBe("draft");
  });

  it("requires a scheduled date when status is scheduled", () => {
    expect(() =>
      communicationInputSchema.parse({
        name: "Year-end email",
        channel: "email",
        status: "scheduled",
      }),
    ).toThrow();
    const parsed = communicationInputSchema.parse({
      name: "Year-end email",
      channel: "email",
      status: "scheduled",
      scheduledAt: "2026-12-01",
    });
    expect(parsed.scheduledAt).toBe("2026-12-01");
  });

  it("rejects an unknown channel", () => {
    expect(() =>
      communicationInputSchema.parse({ name: "X", channel: "carrier_pigeon" }),
    ).toThrow();
  });
});

describe("eventInputSchema", () => {
  it("accepts a valid event and defaults the type", () => {
    const parsed = eventInputSchema.parse({ name: "Donor breakfast", startsAt: "2026-03-22" });
    expect(parsed.eventType).toBe("other");
  });

  it("requires a start date", () => {
    expect(() => eventInputSchema.parse({ name: "Gala" })).toThrow();
  });

  it("rejects an end date before the start date", () => {
    expect(() =>
      eventInputSchema.parse({ name: "Tour", startsAt: "2026-03-22", endsAt: "2026-03-21" }),
    ).toThrow();
  });
});

describe("registrationInputSchema", () => {
  it("accepts a registration and defaults status, guests, and attendance", () => {
    const parsed = registrationInputSchema.parse({ eventId: UUID, constituentId: UUID_B });
    expect(parsed.status).toBe("registered");
    expect(parsed.guestCount).toBe(0);
    expect(parsed.attended).toBe(false);
  });

  it("rejects a negative guest count", () => {
    expect(() =>
      registrationInputSchema.parse({ eventId: UUID, constituentId: UUID_B, guestCount: -1 }),
    ).toThrow();
  });
});

describe("volunteerOpportunityInputSchema", () => {
  it("accepts a minimal opportunity", () => {
    const parsed = volunteerOpportunityInputSchema.parse({ name: "World Water Day booth" });
    expect(parsed.name).toBe("World Water Day booth");
  });

  it("requires a name and rejects a non-positive capacity", () => {
    expect(() => volunteerOpportunityInputSchema.parse({ name: "" })).toThrow();
    expect(() =>
      volunteerOpportunityInputSchema.parse({ name: "Gala setup", capacity: 0 }),
    ).toThrow();
  });
});

describe("volunteerHoursInputSchema", () => {
  it("accepts logged hours", () => {
    const parsed = volunteerHoursInputSchema.parse({
      constituentId: UUID,
      opportunityId: UUID_B,
      hours: 3.5,
      loggedDate: "2026-03-22",
    });
    expect(parsed.hours).toBe(3.5);
  });

  it("rejects zero/negative hours and malformed dates", () => {
    expect(() =>
      volunteerHoursInputSchema.parse({
        constituentId: UUID,
        opportunityId: UUID_B,
        hours: 0,
        loggedDate: "2026-03-22",
      }),
    ).toThrow();
    expect(() =>
      volunteerHoursInputSchema.parse({
        constituentId: UUID,
        opportunityId: UUID_B,
        hours: 2,
        loggedDate: "03/22/2026",
      }),
    ).toThrow();
  });
});

describe("membershipTierInputSchema", () => {
  it("accepts a tier with level, dues, and benefits", () => {
    const parsed = membershipTierInputSchema.parse({
      name: "Wavemaker Circle",
      level: 2,
      amountCents: 50_000,
      benefits: "Quarterly impact reports",
    });
    expect(parsed.level).toBe(2);
  });

  it("requires a name", () => {
    expect(() => membershipTierInputSchema.parse({ name: "" })).toThrow();
  });
});

describe("membershipInputSchema", () => {
  it("accepts a membership and defaults status to active", () => {
    const parsed = membershipInputSchema.parse({ constituentId: UUID, tierId: UUID_B });
    expect(parsed.status).toBe("active");
  });

  it("rejects an unknown status", () => {
    expect(() =>
      membershipInputSchema.parse({ constituentId: UUID, tierId: UUID_B, status: "frozen" }),
    ).toThrow();
  });
});

describe("qpiOverrideInputSchema", () => {
  it("accepts a 1-5 rating with rationale", () => {
    const parsed = qpiOverrideInputSchema.parse({
      prospectId: UUID,
      dimension: "capacity",
      rating: 5,
      rationale: "Foundation assets ≈ $180M",
      source: "IRS 990-PF · 2024",
    });
    expect(parsed.rating).toBe(5);
  });

  it("accepts marking a dimension unknown without a rating", () => {
    const parsed = qpiOverrideInputSchema.parse({
      prospectId: UUID,
      dimension: "capacity",
      isUnknown: true,
    });
    expect(parsed.isUnknown).toBe(true);
  });

  it("rejects neither a rating nor an unknown flag, and out-of-range ratings", () => {
    expect(() => qpiOverrideInputSchema.parse({ prospectId: UUID, dimension: "timing" })).toThrow();
    expect(() =>
      qpiOverrideInputSchema.parse({ prospectId: UUID, dimension: "timing", rating: 6 }),
    ).toThrow();
  });
});

describe("naturalPartnerInputSchema", () => {
  it("accepts a constituent-linked partner", () => {
    const parsed = naturalPartnerInputSchema.parse({ prospectId: UUID, constituentId: UUID_B });
    expect(parsed.constituentId).toBe(UUID_B);
  });

  it("requires at least one of user / constituent / external name", () => {
    expect(() => naturalPartnerInputSchema.parse({ prospectId: UUID })).toThrow();
  });
});

describe("qpiWeightsInputSchema", () => {
  it("accepts the default weighting (points sum to 100)", () => {
    const parsed = qpiWeightsInputSchema.parse({
      capacity: 7,
      relationship: 6,
      timing: 3,
      gift_history: 2,
      philanthropy: 2,
    });
    expect(parsed.capacity).toBe(7);
  });

  it("rejects a weighting whose points do not sum to 100", () => {
    expect(() =>
      qpiWeightsInputSchema.parse({
        capacity: 8,
        relationship: 6,
        timing: 3,
        gift_history: 2,
        philanthropy: 2,
      }),
    ).toThrow();
  });
});

describe("copilotTogglesInputSchema", () => {
  it("accepts the three booleans", () => {
    const parsed = copilotTogglesInputSchema.parse({
      researchPublicSources: true,
      proposeQpiUpdatesAutomatically: false,
      draft24hFollowups: true,
    });
    expect(parsed.proposeQpiUpdatesAutomatically).toBe(false);
  });
});
