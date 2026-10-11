import { describe, expect, it } from "vitest";
import {
  aggregateScorecard,
  assertScorecardTransition,
  buildScoringJsonSchema,
  canTransitionScorecard,
  normaliseForEvidence,
  READY_IS_REACHABLE_ONLY_FROM,
  SCORECARD_STATUSES,
  parseScoringResponse,
  snapshotCriteria,
  validateScorecardDefinition,
  verifyEvidenceQuote,
  type CriterionResultInput,
  type ScorecardDefinitionSnapshot,
} from "./scorecards";

// A definition with ALL THREE criterion types and two uneven sections, so the schema test and the
// weighting test both have something that would break under the wrong implementation.
const SNAPSHOT: ScorecardDefinitionSnapshot = {
  id: "def-1",
  name: "Ask Visit Scorecard",
  meetingTypeId: "type-1",
  meetingTypeName: "Ask Visit",
  sections: [
    {
      id: "sec-ask",
      title: "The ask",
      description: "Whether a real request was made.",
      sortOrder: 0,
      criteria: [
        {
          id: "c-amount",
          type: "boolean",
          prompt: "Was a specific amount stated?",
          guidance: "A figure the prospect could repeat back.",
          sortOrder: 0,
          options: [],
        },
        {
          id: "c-tied",
          type: "boolean",
          prompt: "Was it tied to an initiative?",
          guidance: null,
          sortOrder: 1,
          options: [],
        },
        {
          id: "c-framing",
          type: "classification",
          prompt: "How was it framed?",
          guidance: null,
          sortOrder: 2,
          options: [
            { id: "o-today", label: "Today", description: "Current programmes.", sortOrder: 0 },
            { id: "o-tomorrow", label: "Tomorrow", description: "Multi-year.", sortOrder: 1 },
          ],
        },
      ],
    },
    {
      id: "sec-dialogue",
      title: "Dialogue",
      description: null,
      sortOrder: 1,
      criteria: [
        {
          id: "c-silence",
          type: "score",
          prompt: "Did they let the prospect respond?",
          guidance: null,
          sortOrder: 0,
          options: [],
        },
      ],
    },
  ],
};

function result(over: Partial<CriterionResultInput> & Pick<CriterionResultInput, "criterionId">) {
  return {
    sectionId: "sec-ask",
    criterionType: "boolean" as const,
    determinable: true,
    booleanValue: null,
    scoreValue: null,
    optionId: null,
    rationale: "because",
    evidenceQuote: null,
    ...over,
  } satisfies CriterionResultInput;
}

describe("validateScorecardDefinition", () => {
  it("accepts a well-formed definition", () => {
    expect(
      validateScorecardDefinition({
        name: "Ask Visit",
        sections: [
          {
            title: "The ask",
            criteria: [
              { type: "boolean", prompt: "Was an amount stated?" },
              {
                type: "classification",
                prompt: "How was it framed?",
                options: [
                  { label: "Today", description: "Current programmes." },
                  { label: "Tomorrow", description: "Multi-year." },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("refuses a definition with no sections", () => {
    const issues = validateScorecardDefinition({ name: "Empty", sections: [] });
    expect(issues.map((i) => i.path)).toContain("sections");
  });

  it("refuses a section with no criteria", () => {
    const issues = validateScorecardDefinition({
      name: "x",
      sections: [{ title: "Dialogue", criteria: [] }],
    });
    expect(issues.map((i) => i.path)).toContain("sections[0].criteria");
  });

  it("refuses a criterion with an empty prompt", () => {
    const issues = validateScorecardDefinition({
      name: "x",
      sections: [{ title: "s", criteria: [{ type: "boolean", prompt: "   " }] }],
    });
    expect(issues.map((i) => i.path)).toContain("sections[0].criteria[0].prompt");
  });

  it("refuses a classification with fewer than two options", () => {
    const issues = validateScorecardDefinition({
      name: "x",
      sections: [
        {
          title: "s",
          criteria: [
            { type: "classification", prompt: "p", options: [{ label: "Only", description: "d" }] },
          ],
        },
      ],
    });
    expect(issues.map((i) => i.path)).toContain("sections[0].criteria[0].options");
  });

  it("refuses a classification option with no description — the model chooses on the description", () => {
    const issues = validateScorecardDefinition({
      name: "x",
      sections: [
        {
          title: "s",
          criteria: [
            {
              type: "classification",
              prompt: "p",
              options: [
                { label: "A", description: "a thing" },
                { label: "B", description: "" },
              ],
            },
          ],
        },
      ],
    });
    expect(issues.map((i) => i.path)).toContain("sections[0].criteria[0].options[1].description");
  });

  it("reports every issue, not just the first", () => {
    const issues = validateScorecardDefinition({
      name: "",
      sections: [{ title: "", criteria: [] }],
    });
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe("buildScoringJsonSchema", () => {
  const schema = buildScoringJsonSchema(SNAPSHOT);

  it("keys every criterion by its stable id, in section-then-criterion order", () => {
    const properties = (schema as { properties: Record<string, unknown> }).properties;
    expect(Object.keys(properties)).toEqual(["c-amount", "c-tied", "c-framing", "c-silence"]);
    expect((schema as { required: string[] }).required).toEqual([
      "c-amount",
      "c-tied",
      "c-framing",
      "c-silence",
    ]);
  });

  it("puts rationale BEFORE the value — the model reasons before it commits", () => {
    const properties = (schema as { properties: Record<string, { properties: object }> }).properties;
    for (const criterion of Object.values(properties)) {
      expect(Object.keys(criterion.properties)).toEqual([
        "rationale",
        "determinable",
        "value",
        "evidence_quote",
      ]);
    }
  });

  it("gives a classification the enum of ITS OWN option ids, plus null", () => {
    const framing = (
      schema as { properties: { "c-framing": { properties: { value: { enum: unknown[] } } } } }
    ).properties["c-framing"].properties.value;
    expect(framing.enum).toEqual(["o-today", "o-tomorrow", null]);
  });

  it("bounds a score to [0, 1] and leaves it continuous", () => {
    const value = (
      schema as {
        properties: { "c-silence": { properties: { value: { minimum: number; maximum: number } } } };
      }
    ).properties["c-silence"].properties.value;
    expect(value.minimum).toBe(0);
    expect(value.maximum).toBe(1);
  });

  it("allows null on every value, so not-determinable has somewhere to go", () => {
    const properties = (
      schema as { properties: Record<string, { properties: { value: { type: unknown } } }> }
    ).properties;
    for (const criterion of Object.values(properties)) {
      expect(criterion.properties.value.type).toContain("null");
    }
  });

  it("matches its snapshot", () => {
    expect(schema).toMatchInlineSnapshot(`
      {
        "additionalProperties": false,
        "description": "One entry per criterion, keyed by criterion id. Judge only from the meeting content.",
        "properties": {
          "c-amount": {
            "additionalProperties": false,
            "properties": {
              "determinable": {
                "description": "False when the content does not say either way. Absence of evidence is not evidence of absence.",
                "type": "boolean",
              },
              "evidence_quote": {
                "description": "A short verbatim quote from the meeting content that supports the rationale, or null. One sentence or less. Copy it exactly.",
                "type": [
                  "string",
                  "null",
                ],
              },
              "rationale": {
                "description": "One or two sentences saying why. Always present — when not determinable, say why not.",
                "type": "string",
              },
              "value": {
                "description": "True or false, or null when not determinable.",
                "type": [
                  "boolean",
                  "null",
                ],
              },
            },
            "required": [
              "rationale",
              "determinable",
              "value",
              "evidence_quote",
            ],
            "type": "object",
          },
          "c-framing": {
            "additionalProperties": false,
            "properties": {
              "determinable": {
                "description": "False when the content does not say either way. Absence of evidence is not evidence of absence.",
                "type": "boolean",
              },
              "evidence_quote": {
                "description": "A short verbatim quote from the meeting content that supports the rationale, or null. One sentence or less. Copy it exactly.",
                "type": [
                  "string",
                  "null",
                ],
              },
              "rationale": {
                "description": "One or two sentences saying why. Always present — when not determinable, say why not.",
                "type": "string",
              },
              "value": {
                "description": "The id of the option that fits, or null when not determinable.",
                "enum": [
                  "o-today",
                  "o-tomorrow",
                  null,
                ],
                "type": [
                  "string",
                  "null",
                ],
              },
            },
            "required": [
              "rationale",
              "determinable",
              "value",
              "evidence_quote",
            ],
            "type": "object",
          },
          "c-silence": {
            "additionalProperties": false,
            "properties": {
              "determinable": {
                "description": "False when the content does not say either way. Absence of evidence is not evidence of absence.",
                "type": "boolean",
              },
              "evidence_quote": {
                "description": "A short verbatim quote from the meeting content that supports the rationale, or null. One sentence or less. Copy it exactly.",
                "type": [
                  "string",
                  "null",
                ],
              },
              "rationale": {
                "description": "One or two sentences saying why. Always present — when not determinable, say why not.",
                "type": "string",
              },
              "value": {
                "description": "A continuous score from 0 to 1, or null when not determinable. Do not round to buckets.",
                "maximum": 1,
                "minimum": 0,
                "type": [
                  "number",
                  "null",
                ],
              },
            },
            "required": [
              "rationale",
              "determinable",
              "value",
              "evidence_quote",
            ],
            "type": "object",
          },
          "c-tied": {
            "additionalProperties": false,
            "properties": {
              "determinable": {
                "description": "False when the content does not say either way. Absence of evidence is not evidence of absence.",
                "type": "boolean",
              },
              "evidence_quote": {
                "description": "A short verbatim quote from the meeting content that supports the rationale, or null. One sentence or less. Copy it exactly.",
                "type": [
                  "string",
                  "null",
                ],
              },
              "rationale": {
                "description": "One or two sentences saying why. Always present — when not determinable, say why not.",
                "type": "string",
              },
              "value": {
                "description": "True or false, or null when not determinable.",
                "type": [
                  "boolean",
                  "null",
                ],
              },
            },
            "required": [
              "rationale",
              "determinable",
              "value",
              "evidence_quote",
            ],
            "type": "object",
          },
        },
        "required": [
          "c-amount",
          "c-tied",
          "c-framing",
          "c-silence",
        ],
        "type": "object",
      }
    `);
  });
});

describe("parseScoringResponse", () => {
  const valid = {
    "c-amount": { rationale: "stated", determinable: true, value: true, evidence_quote: "x" },
    "c-tied": { rationale: "no", determinable: true, value: false, evidence_quote: null },
    "c-framing": {
      rationale: "multi-year",
      determinable: true,
      value: "o-tomorrow",
      evidence_quote: null,
    },
    "c-silence": { rationale: "held it", determinable: true, value: 0.73, evidence_quote: null },
  };

  it("reads a valid response back into results", () => {
    const parsed = parseScoringResponse(SNAPSHOT, valid);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.results).toHaveLength(4);
    expect(parsed.results[3]?.scoreValue).toBe(0.73);
    expect(parsed.results[2]?.optionId).toBe("o-tomorrow");
  });

  it("rejects a missing criterion", () => {
    const { "c-tied": _omitted, ...rest } = valid;
    const parsed = parseScoringResponse(SNAPSHOT, rest);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("c-tied");
  });

  it("rejects a score outside [0, 1]", () => {
    const parsed = parseScoringResponse(SNAPSHOT, {
      ...valid,
      "c-silence": { rationale: "r", determinable: true, value: 1.4, evidence_quote: null },
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects an option id that is not one of this criterion's options", () => {
    const parsed = parseScoringResponse(SNAPSHOT, {
      ...valid,
      "c-framing": { rationale: "r", determinable: true, value: "o-forever", evidence_quote: null },
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects a value carried alongside determinable: false", () => {
    const parsed = parseScoringResponse(SNAPSHOT, {
      ...valid,
      "c-amount": { rationale: "r", determinable: false, value: true, evidence_quote: null },
    });
    expect(parsed.ok).toBe(false);
  });

  it("requires a rationale even when nothing could be determined", () => {
    const parsed = parseScoringResponse(SNAPSHOT, {
      ...valid,
      "c-amount": { rationale: "", determinable: false, value: null, evidence_quote: null },
    });
    expect(parsed.ok).toBe(false);
  });

  it("accepts a not-determinable criterion with a null value", () => {
    const parsed = parseScoringResponse(SNAPSHOT, {
      ...valid,
      "c-amount": {
        rationale: "the notes do not say",
        determinable: false,
        value: null,
        evidence_quote: null,
      },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.results[0]?.determinable).toBe(false);
    expect(parsed.results[0]?.booleanValue).toBeNull();
  });
});

describe("verifyEvidenceQuote", () => {
  const content = `[00:02:14] Dana Reese: Two hundred and fifty thousand dollars over three years.
[00:02:30] Ellen Hallworth: That's a larger number than we've given you before.`;

  it("verifies a verbatim quote", () => {
    expect(verifyEvidenceQuote(content, "Two hundred and fifty thousand dollars over three years."))
      .toBe(true);
  });

  it("verifies across a line break and collapsed whitespace", () => {
    expect(
      verifyEvidenceQuote(content, "over three years.\n   [00:02:30] Ellen Hallworth:  That's"),
    ).toBe(true);
  });

  it("verifies across differing quote characters", () => {
    expect(verifyEvidenceQuote(content, "That’s a larger number")).toBe(true);
  });

  it("does NOT verify an altered quote", () => {
    expect(verifyEvidenceQuote(content, "Two hundred thousand dollars over three years.")).toBe(
      false,
    );
  });

  it("does not verify a null or empty quote", () => {
    expect(verifyEvidenceQuote(content, null)).toBe(false);
    expect(verifyEvidenceQuote(content, "   ")).toBe(false);
  });

  it("normalises nothing fuzzier than whitespace, quotes and dashes", () => {
    expect(normaliseForEvidence("  “A”  —  B’s  ")).toBe('"a" - b\'s');
  });
});

describe("aggregateScorecard", () => {
  it("counts booleans as 1 and 0", () => {
    const aggregate = aggregateScorecard(SNAPSHOT, [
      result({ criterionId: "c-amount", booleanValue: true }),
      result({ criterionId: "c-tied", booleanValue: false }),
      result({ criterionId: "c-framing", criterionType: "classification", optionId: "o-today" }),
      result({
        criterionId: "c-silence",
        sectionId: "sec-dialogue",
        criterionType: "score",
        scoreValue: 0.5,
      }),
    ]);
    expect(aggregate.sectionScores["sec-ask"]).toBe(0.5);
    expect(aggregate.sectionScores["sec-dialogue"]).toBe(0.5);
    expect(aggregate.overallScore).toBeCloseTo(0.5, 10);
  });

  it("EXCLUDES classifications — an outcome is a fact, not a quality", () => {
    const withDecline = aggregateScorecard(SNAPSHOT, [
      result({ criterionId: "c-amount", booleanValue: true }),
      result({ criterionId: "c-tied", booleanValue: true }),
      result({ criterionId: "c-framing", criterionType: "classification", optionId: "o-today" }),
      result({
        criterionId: "c-silence",
        sectionId: "sec-dialogue",
        criterionType: "score",
        scoreValue: 1,
      }),
    ]);
    expect(withDecline.sectionScores["sec-ask"]).toBe(1);
    expect(withDecline.overallScore).toBe(1);
  });

  it("excludes not-determinable results from the denominator", () => {
    const aggregate = aggregateScorecard(SNAPSHOT, [
      result({ criterionId: "c-amount", booleanValue: true }),
      result({ criterionId: "c-tied", determinable: false }),
      result({ criterionId: "c-framing", criterionType: "classification", determinable: false }),
      result({
        criterionId: "c-silence",
        sectionId: "sec-dialogue",
        criterionType: "score",
        scoreValue: 0,
      }),
    ]);
    // One countable 1 in the ask section, not a 1 and a 0.
    expect(aggregate.sectionScores["sec-ask"]).toBe(1);
    expect(aggregate.overallScore).toBe(0.5);
  });

  it("returns null when nothing countable was determinable", () => {
    const aggregate = aggregateScorecard(SNAPSHOT, [
      result({ criterionId: "c-amount", determinable: false }),
      result({ criterionId: "c-tied", determinable: false }),
      result({ criterionId: "c-framing", criterionType: "classification", optionId: "o-today" }),
      result({
        criterionId: "c-silence",
        sectionId: "sec-dialogue",
        criterionType: "score",
        determinable: false,
      }),
    ]);
    expect(aggregate.overallScore).toBeNull();
    expect(aggregate.sectionScores["sec-ask"]).toBeNull();
    expect(aggregate.sectionScores["sec-dialogue"]).toBeNull();
  });

  it("weights each CRITERION equally across uneven sections, not each section", () => {
    // Ask section: two countable 1s. Dialogue: one countable 0.
    // Per-criterion: (1 + 1 + 0) / 3 = 0.667.  Per-section it would be (1 + 0) / 2 = 0.5.
    const aggregate = aggregateScorecard(SNAPSHOT, [
      result({ criterionId: "c-amount", booleanValue: true }),
      result({ criterionId: "c-tied", booleanValue: true }),
      result({ criterionId: "c-framing", criterionType: "classification", optionId: "o-today" }),
      result({
        criterionId: "c-silence",
        sectionId: "sec-dialogue",
        criterionType: "score",
        scoreValue: 0,
      }),
    ]);
    expect(aggregate.overallScore).toBeCloseTo(2 / 3, 10);
    expect(aggregate.overallScore).not.toBe(0.5);
  });

  it("treats a missing result as not determinable rather than as a zero", () => {
    const aggregate = aggregateScorecard(SNAPSHOT, [
      result({ criterionId: "c-amount", booleanValue: true }),
    ]);
    expect(aggregate.overallScore).toBe(1);
  });
});

describe("the scorecard lifecycle", () => {
  it("walks queued -> classifying -> scoring -> ready one step at a time", () => {
    expect(canTransitionScorecard("queued", "classifying")).toBe(true);
    expect(canTransitionScorecard("classifying", "scoring")).toBe(true);
    expect(canTransitionScorecard("scoring", "ready")).toBe(true);
  });

  it("never lets anything reach `ready` except `scoring`", () => {
    // The one edge that must not grow. A Scorecard in `ready` that never passed through `scoring`
    // claims results it does not have.
    for (const from of SCORECARD_STATUSES) {
      expect(canTransitionScorecard(from, "ready")).toBe(
        READY_IS_REACHABLE_ONLY_FROM.includes(from),
      );
    }
    expect(() => {
      assertScorecardTransition("queued", "ready");
    }).toThrow(/illegal transition/);
    expect(() => {
      assertScorecardTransition("classifying", "ready");
    }).toThrow(/illegal transition/);
  });

  it("allows scoring -> scoring, which is what makes a retry idempotent", () => {
    expect(canTransitionScorecard("scoring", "scoring")).toBe(true);
  });

  it("allows ready -> scoring (a type override) and ready -> queued (a full re-score)", () => {
    expect(canTransitionScorecard("ready", "scoring")).toBe(true);
    expect(canTransitionScorecard("ready", "queued")).toBe(true);
  });

  it("allows queued -> scoring, which is a human naming the type before the classifier runs", () => {
    expect(canTransitionScorecard("queued", "scoring")).toBe(true);
  });

  it("can fail from any working state and be re-run from failed", () => {
    expect(canTransitionScorecard("queued", "failed")).toBe(true);
    expect(canTransitionScorecard("classifying", "failed")).toBe(true);
    expect(canTransitionScorecard("scoring", "failed")).toBe(true);
    expect(canTransitionScorecard("failed", "classifying")).toBe(true);
  });

  it("can always start over, from any state", () => {
    // Re-scoring is `-> queued`, and it is also the only way out of a Scorecard left mid-flight by
    // a worker that died between legs.
    for (const from of SCORECARD_STATUSES) {
      expect(canTransitionScorecard(from, "queued")).toBe(true);
    }
  });
});

describe("snapshotCriteria", () => {
  it("walks sections and criteria in sort order regardless of array order", () => {
    const shuffled: ScorecardDefinitionSnapshot = {
      ...SNAPSHOT,
      sections: [...SNAPSHOT.sections].reverse(),
    };
    expect(snapshotCriteria(shuffled).map((entry) => entry.criterion.id)).toEqual([
      "c-amount",
      "c-tied",
      "c-framing",
      "c-silence",
    ]);
  });
});
