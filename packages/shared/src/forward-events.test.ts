import { describe, expect, it } from "vitest";
import {
  closeDateChanges,
  diffOpportunityFields,
  lastContactAt,
  movementTimeline,
  serialiseEventValue,
  silenceDays,
  stageChanges,
  currentStageFromEvents,
  type OpportunityEventLike,
} from "./forward-events";

function event(partial: Partial<OpportunityEventLike>): OpportunityEventLike {
  return {
    eventType: "field_change",
    field: null,
    oldValue: null,
    newValue: null,
    prospectSourced: false,
    occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("diffOpportunityFields", () => {
  it("emits one event per changed tracked field and ignores untouched ones", () => {
    const events = diffOpportunityFields(
      { amountCents: 25_000_000, closeDate: "2026-07-29", stage: "visit_and_ask" },
      { amountCents: 30_000_000, closeDate: "2026-07-29" },
      false,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: "field_change",
      field: "amountCents",
      oldValue: "25000000",
      newValue: "30000000",
    });
  });

  it("emits stage moves as stage_change, not field_change", () => {
    const events = diffOpportunityFields(
      { stage: "visit_and_ask" },
      { stage: "follow_up_and_close" },
      false,
    );
    expect(events[0]?.eventType).toBe("stage_change");
    expect(events[0]?.field).toBe("stage");
  });

  it("captures at the write path: two sequential updates produce two events, not one collapsed diff", () => {
    // This is the requirement that rules out reconstructing history by diffing snapshots.
    const first = diffOpportunityFields(
      { closeDate: "2026-07-29" },
      { closeDate: "2026-08-31" },
      false,
    );
    const second = diffOpportunityFields(
      { closeDate: "2026-08-31" },
      { closeDate: "2026-09-30" },
      false,
    );

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect([...first, ...second].map((e) => e.newValue)).toEqual(["2026-08-31", "2026-09-30"]);
  });

  it("distinguishes a prospect-sourced change from one of ours", () => {
    const ours = diffOpportunityFields({ closeDate: "a" }, { closeDate: "b" }, false);
    const theirs = diffOpportunityFields({ closeDate: "a" }, { closeDate: "b" }, true);
    expect(ours[0]?.prospectSourced).toBe(false);
    expect(theirs[0]?.prospectSourced).toBe(true);
  });

  it("treats a field absent from the patch as untouched, and null as a real change", () => {
    expect(diffOpportunityFields({ amountNote: "x" }, {}, false)).toEqual([]);
    const cleared = diffOpportunityFields({ amountNote: "x" }, { amountNote: null }, false);
    expect(cleared[0]).toMatchObject({ oldValue: "x", newValue: null });
  });

  it("serialises dates and numbers stably", () => {
    expect(serialiseEventValue(new Date("2026-09-12T12:00:00.000Z"))).toBe(
      "2026-09-12T12:00:00.000Z",
    );
    expect(serialiseEventValue(42)).toBe("42");
    expect(serialiseEventValue(null)).toBeNull();
    expect(serialiseEventValue(undefined)).toBeNull();
  });
});

describe("closeDateChanges", () => {
  // The design's Hallworth chain: JUL 29 -> AUG 31 -> SEP 30 -> OCT 31, all three moves made by us.
  const hallworth = [
    event({
      field: "closeDate",
      oldValue: "2026-07-29",
      newValue: "2026-08-31",
      occurredAt: new Date("2026-06-29T00:00:00.000Z"),
      actorName: "Dana Reese",
    }),
    event({
      field: "closeDate",
      oldValue: "2026-08-31",
      newValue: "2026-09-30",
      occurredAt: new Date("2026-07-30T00:00:00.000Z"),
      actorName: "Dana Reese",
    }),
    event({
      field: "closeDate",
      oldValue: "2026-09-30",
      newValue: "2026-10-31",
      occurredAt: new Date("2026-08-21T00:00:00.000Z"),
      actorName: "Dana Reese",
    }),
  ];

  it("builds the ordered chain, the count and the total days moved", () => {
    const result = closeDateChanges(hallworth);
    expect(result.count).toBe(3);
    expect(result.chain).toEqual(["2026-07-29", "2026-08-31", "2026-09-30", "2026-10-31"]);
    expect(result.totalDaysMoved).toBe(94);
  });

  it("reports that no move was prospect-sourced — a date we invent is not a date", () => {
    expect(closeDateChanges(hallworth).anyProspectSourced).toBe(false);
  });

  it("flags a chain where the prospect did give a date", () => {
    const withProspect = [...hallworth, event({ field: "closeDate", oldValue: "2026-10-31", newValue: "2026-11-15", prospectSourced: true, occurredAt: new Date("2026-09-01T00:00:00.000Z") })];
    expect(closeDateChanges(withProspect).anyProspectSourced).toBe(true);
  });

  it("ignores events for other fields", () => {
    expect(closeDateChanges([event({ field: "amountCents", oldValue: "1", newValue: "2" })]).count).toBe(0);
  });

  it("orders by occurrence even when the input is shuffled", () => {
    const shuffled = [hallworth[2]!, hallworth[0]!, hallworth[1]!];
    expect(closeDateChanges(shuffled).chain).toEqual([
      "2026-07-29",
      "2026-08-31",
      "2026-09-30",
      "2026-10-31",
    ]);
  });
});

describe("silence", () => {
  const anchor = new Date("2026-09-12T12:00:00.000Z");

  it("measures days since the last logged contact", () => {
    // 23 June + 81 days = 12 September — the design's "81 days idle".
    const contact = new Date("2026-06-23T12:00:00.000Z");
    expect(silenceDays(contact, anchor)).toBe(81);
  });

  it("returns null when there has never been contact, rather than zero", () => {
    expect(silenceDays(null, anchor)).toBeNull();
  });

  it("takes the most recent contact event", () => {
    const events = [
      event({ eventType: "contact_logged", occurredAt: new Date("2026-06-12T00:00:00.000Z") }),
      event({ eventType: "contact_logged", occurredAt: new Date("2026-06-23T12:00:00.000Z") }),
      event({ eventType: "field_change", occurredAt: new Date("2026-08-21T00:00:00.000Z") }),
    ];
    const contact = lastContactAt(events);
    expect(contact?.toISOString()).toBe("2026-06-23T12:00:00.000Z");
    expect(silenceDays(contact, anchor)).toBe(81);
  });
});

describe("movementTimeline", () => {
  it("orders newest first for the detail screen", () => {
    const events = [
      event({ occurredAt: new Date("2026-06-23T00:00:00.000Z"), note: "older" }),
      event({ occurredAt: new Date("2026-08-21T00:00:00.000Z"), note: "newer" }),
    ];
    expect(movementTimeline(events).map((e) => e.note)).toEqual(["newer", "older"]);
  });

  it("does not mutate its input", () => {
    const events = [
      event({ occurredAt: new Date("2026-06-23T00:00:00.000Z") }),
      event({ occurredAt: new Date("2026-08-21T00:00:00.000Z") }),
    ];
    const before = events.map((e) => e.occurredAt.getTime());
    movementTimeline(events);
    expect(events.map((e) => e.occurredAt.getTime())).toEqual(before);
  });
});

describe("stage history", () => {
  it("returns the latest stage reached", () => {
    const events = [
      event({
        eventType: "stage_change",
        field: "stage",
        newValue: "visit_and_ask",
        occurredAt: new Date("2026-06-10T00:00:00.000Z"),
      }),
      event({
        eventType: "stage_change",
        field: "stage",
        newValue: "follow_up_and_close",
        occurredAt: new Date("2026-06-29T00:00:00.000Z"),
      }),
    ];
    expect(stageChanges(events)).toHaveLength(2);
    expect(currentStageFromEvents(events)).toBe("follow_up_and_close");
  });

  it("returns null when the stage has never moved", () => {
    expect(currentStageFromEvents([event({ eventType: "contact_logged" })])).toBeNull();
  });
});
