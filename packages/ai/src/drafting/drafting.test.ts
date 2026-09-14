import { describe, expect, it } from "vitest";
import type { NextActionKind } from "@95forward/shared";
import { DRAFT_AUDIENCE, draftRecipient, renderContext, type DraftContext } from "./context";
import { fixtureDraft } from "./fixtures";
import { checkGrounding } from "./grounding";
import { editedPercent, generateDraft } from "./draft";
import { MockModelProvider } from "../provider/model";
import type { Providers } from "../types";

const BASE: DraftContext = {
  kind: "follow-up-to-close",
  today: "2026-09-12",
  prospect: {
    name: "The Hallworth Family Foundation",
    type: "foundation",
    facts: ["Trustees care about clean-water access."],
  },
  opportunity: {
    amount: "$250,000",
    amountNote: "over three years",
    closeDate: "Oct 31, 2026",
    stage: "Follow up & close",
    closeDateMoves: 3,
    closeDateMovesProspectSourced: false,
    silenceDays: 81,
    lastContact: "Jun 23, 2026 — the verbal agreement call",
  },
  initiative: {
    name: "Everyone in Kamuli — Uganda 2026",
    story: "Every home, school and clinic in Kamuli District with water that lasts.",
    goal: "$1,200,000",
  },
  milestones: [
    {
      label: "Close date confirmed by the prospect",
      source: "they_said",
      blocking: true,
      confirmed: false,
      confirmedBy: null,
      confirmedOn: null,
      evidence: null,
    },
    {
      label: "Amount agreed",
      source: "they_said",
      blocking: true,
      confirmed: true,
      confirmedBy: "Ellen Hallworth",
      confirmedOn: "Jun 23, 2026",
      evidence: null,
    },
    {
      label: "Confirmed in writing",
      source: "they_said",
      blocking: true,
      confirmed: false,
      confirmedBy: null,
      confirmedOn: null,
      evidence: null,
    },
  ],
  rule: {
    id: "live-ask-silence",
    statement: "An ask you have made and gone quiet on is the most expensive thing on your board.",
    rationale: "The largest live ask in your portfolio has gone silent longest.",
  },
  people: {
    relationshipManager: "Dana Reese",
    connector: { name: "Tom Bradley", role: "board member", introOfferedOn: "Jun 2, 2026" },
    leader: "Priya Nair",
  },
  recentEvents: ["Aug 21, 2026 — close date moved, Dana Reese, no prospect input."],
};

const ALL_KINDS: NextActionKind[] = [
  "follow-up-to-close",
  "make-specific-ask",
  "get-it-in-writing",
  "prep-the-visit",
  "get-ask-approved",
  "use-introduction",
  "ask-partner",
  "get-the-visit",
  "steward-the-gift",
];

function providers(response?: string): Providers {
  const model = new MockModelProvider();
  if (response !== undefined) model.queueText(response);
  return { model } as unknown as Providers;
}

describe("every kind produces a draft", () => {
  it("drafts all nine, with no empty output", () => {
    for (const kind of ALL_KINDS) {
      const text = fixtureDraft({ ...BASE, kind });
      expect(text.length, kind).toBeGreaterThan(120);
      expect(text, kind).not.toContain("undefined");
      expect(text, kind).not.toContain("null");
    }
  });

  it("grounds every one of them against its own briefing", () => {
    for (const kind of ALL_KINDS) {
      const context = { ...BASE, kind };
      const report = checkGrounding(fixtureDraft(context), context);
      expect(report.issues, kind).toEqual([]);
    }
  });

  it("states the amount exactly as the record holds it", () => {
    for (const kind of ALL_KINDS) {
      const text = fixtureDraft({ ...BASE, kind });
      const figures = text.match(/\$[\d,]+/g) ?? [];
      for (const figure of figures) expect(figure, `${kind}: ${figure}`).toBe("$250,000");
    }
  });
});

describe("the connector drafts address the connector, not the prospect", () => {
  // A letter addressed to the wrong human is the most visible failure this feature can produce.
  for (const kind of ["use-introduction", "ask-partner"] as const) {
    it(`${kind} opens to the connector`, () => {
      const context = { ...BASE, kind };
      const text = fixtureDraft(context);
      const salutation = /^(?:Subject:.*\n\n)?(.+?),/m.exec(text)?.[1] ?? "";
      expect(salutation).toContain("Tom");
      expect(salutation).not.toContain("Hallworth");
      expect(DRAFT_AUDIENCE[kind]).toBe("connector");
      expect(draftRecipient(context)).toBe("Tom Bradley");
    });
  }

  it("the prospect kinds do not open to the connector", () => {
    for (const kind of ["follow-up-to-close", "make-specific-ask", "get-it-in-writing"] as const) {
      const text = fixtureDraft({ ...BASE, kind });
      const salutation = /^(?:Subject:.*\n\n)?(.+?),/m.exec(text)?.[1] ?? "";
      expect(salutation, kind).not.toContain("Tom");
    }
  });

  it("the internal ones are addressed internally", () => {
    expect(fixtureDraft({ ...BASE, kind: "get-ask-approved" })).toContain("To: Priya Nair");
    expect(fixtureDraft({ ...BASE, kind: "prep-the-visit" })).toContain("WHO WE ARE SEEING");
    expect(DRAFT_AUDIENCE["prep-the-visit"]).toBe("internal");
  });
});

describe("grounding catches what a plausible letter would invent", () => {
  // The adversarial fixture: a briefing with NO gift history, NO named contact beyond the one on
  // record, and no programme detail beyond one line. A letter-writing model reaching for warmth
  // invents exactly these.
  const bare: DraftContext = {
    ...BASE,
    prospect: { name: "Cedar Hollow Group", type: "organization", facts: [] },
    initiative: { name: "Unrestricted", story: null, goal: null },
    milestones: [],
    people: { relationshipManager: "Dana Reese", connector: null, leader: null },
    recentEvents: [],
  };

  it("flags an invented gift history", () => {
    const report = checkGrounding(
      "Subject: Thank you\n\nDear Cedar Hollow,\n\nYour gift of $75,000 last year made a real difference.\n\nBest,\nDana Reese",
      bare,
    );
    expect(report.grounded).toBe(false);
    expect(report.issues.some((i) => i.kind === "money" && i.value === "$75,000")).toBe(true);
  });

  it("flags an invented person", () => {
    const report = checkGrounding(
      "Subject: Following up\n\nDear Cedar Hollow,\n\nIt was good to speak with Sarah Whitcombe about this.\n\nBest,\nDana Reese",
      bare,
    );
    expect(report.grounded).toBe(false);
    expect(report.issues.some((i) => i.value.includes("Sarah Whitcombe"))).toBe(true);
  });

  it("flags an invented place mid-sentence", () => {
    const report = checkGrounding(
      "Subject: Hello\n\nDear Cedar Hollow,\n\nOur team in Kampala would welcome a visit.\n\nBest,\nDana Reese",
      bare,
    );
    expect(report.issues.some((i) => i.value === "Kampala")).toBe(true);
  });

  it("flags a promise made on the organisation's behalf", () => {
    for (const promise of [
      "We can discuss naming rights for the new facility.",
      "We will send you a quarterly report on the programme.",
      "I can guarantee your gift reaches the field within 30 days.",
    ]) {
      const report = checkGrounding(`Subject: x\n\nDear Cedar Hollow,\n\n${promise}`, bare);
      expect(
        report.issues.some((i) => i.kind === "promise"),
        promise,
      ).toBe(true);
    }
  });

  it("does not flag grammar — headings, list markers and sentence openers", () => {
    // The checker earning its keep means not crying wolf: "DISCOVERY QUESTIONS" is a heading and
    // "Timing." opens a bullet. Both were false positives before.
    const report = checkGrounding(fixtureDraft({ ...BASE, kind: "prep-the-visit" }), BASE);
    expect(report.issues).toEqual([]);
  });

  it("accepts an amount that IS on the record, in either punctuation", () => {
    expect(checkGrounding("We discussed $250,000.", BASE).grounded).toBe(true);
    expect(checkGrounding("We discussed $250000.", BASE).grounded).toBe(true);
  });
});

describe("generateDraft", () => {
  it("makes no model call in mock mode", async () => {
    // If it reached the model, MockModelProvider would throw: nothing is queued and no script tag
    // matches. That throw IS the assertion.
    const result = await generateDraft({ providers: providers(), context: BASE, mode: "mock" });
    expect(result.provider).toBe("mock");
    expect(result.text).toContain("Dana Reese");
    expect(result.subject).toBe("Everyone in Kamuli — Uganda 2026 — where are we?");
    expect(result.audience).toBe("prospect");
  });

  it("runs the live path with NO tools — the strongest grounding there is", async () => {
    const model = new MockModelProvider();
    model.queueText("Subject: Hello\n\nDear Ellen Hallworth,\n\nA line.\n\nBest,\nDana Reese");
    let seenTools: unknown = "unset";
    const spy = {
      model: {
        kind: "mock" as const,
        createMessage: async (req: Record<string, unknown>) => {
          seenTools = req.tools;
          return model.createMessage(req as never);
        },
      },
    } as unknown as Providers;

    const result = await generateDraft({ providers: spy, context: BASE, mode: "live" });
    expect(seenTools).toBeUndefined();
    expect(result.provider).toBe("live");
    expect(result.grounding.grounded).toBe(true);
  });

  it("unwraps a fenced or prefaced response", async () => {
    const result = await generateDraft({
      providers: providers(
        "Here's a draft:\n\n```\nSubject: X\n\nDear Ellen Hallworth,\n\nBody.\n```",
      ),
      context: BASE,
      mode: "live",
    });
    expect(result.text.startsWith("Subject: X")).toBe(true);
    expect(result.text).not.toContain("```");
  });

  it("returns the grounding report rather than throwing, so a human can see it", async () => {
    const result = await generateDraft({
      providers: providers("Subject: X\n\nDear Ellen Hallworth,\n\nYour $9,999 gift helped."),
      context: BASE,
      mode: "live",
    });
    expect(result.grounding.grounded).toBe(false);
    expect(result.text).toContain("$9,999");
  });
});

describe("editedPercent", () => {
  it("is zero for an untouched draft and rises with the change", () => {
    const generated = "Dear Ellen,\n\nWhen does your board decide?\n\nBest,\nDana";
    expect(editedPercent(generated, generated)).toBe(0);
    expect(editedPercent(generated, `${generated} `)).toBe(0);

    const nudge = generated.replace("decide?", "decide on this?");
    expect(editedPercent(generated, nudge)).toBeGreaterThan(0);
    expect(editedPercent(generated, nudge)).toBeLessThan(25);

    const rewrite = "Hi Ellen — quick one. Any news on timing? Dana";
    expect(editedPercent(generated, rewrite)).toBeGreaterThan(50);
  });

  it("treats an emptied draft as wholly changed", () => {
    expect(editedPercent("something", "")).toBe(100);
  });
});

describe("renderContext", () => {
  it("states absences rather than omitting them", () => {
    // A missing key is an invitation to assume. "not on record" is a fact the letter can use.
    const rendered = renderContext({
      ...BASE,
      opportunity: { ...BASE.opportunity, closeDate: null, lastContact: null, silenceDays: null },
      people: { relationshipManager: null, connector: null, leader: null },
    });
    expect(rendered).toContain("Close date: not on record");
    expect(rendered).toContain("Connector: nobody identified");
    expect(rendered).toContain("Leader who approves the ask: not on record");
  });

  it("says who moved the close date, because the letter may need to not say it", () => {
    expect(renderContext(BASE)).toContain("every one of them decided by us, not by them");
  });
});
