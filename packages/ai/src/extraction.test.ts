import { describe, expect, it } from "vitest";
import { MockModelProvider, toolUseResponse } from "./provider/model";
import { extractSearchFilters } from "./extraction";

const EXTRACTION_SCRIPTS = {
  "QPI higher than 80": [
    toolUseResponse("emit_search_filters", {
      filters: [{ field: "qpi_total", op: "gt", value: 80 }],
      semanticTerms: null,
    }),
  ],
  "Foundations with high capacity": [
    toolUseResponse("emit_search_filters", {
      filters: [
        { field: "type", op: "eq", value: "foundation" },
        { field: "capacity", op: "gte", value: 4 },
      ],
      semanticTerms: null,
    }),
  ],
  "Not contacted in 60 days": [
    toolUseResponse("emit_search_filters", {
      filters: [{ field: "last_contact_days", op: "gt", value: 60 }],
      semanticTerms: null,
    }),
  ],
  "Strong relationship to clean water": [
    toolUseResponse("emit_search_filters", {
      filters: [{ field: "relationship", op: "gte", value: 4 }],
      semanticTerms: "clean water",
    }),
  ],
  // Models off-whitelist hallucination: the tool input names a field the schema doesn't allow.
  "hallucinated field": [
    toolUseResponse("emit_search_filters", {
      filters: [{ field: "annual_income", op: "gt", value: 100 }],
      semanticTerms: null,
    }),
  ],
};

function model() {
  return MockModelProvider.scripted(EXTRACTION_SCRIPTS);
}

describe("extractSearchFilters — query → validated filter object", () => {
  it("parses 'QPI higher than 80' to a pure-structured qpi_total filter", async () => {
    const r = await extractSearchFilters(model(), "Prospects with QPI higher than 80");
    expect(r.mode).toBe("structured");
    expect(r.fellBack).toBe(false);
    expect(r.filters).toEqual([{ field: "qpi_total", op: "gt", value: 80 }]);
    expect(r.semanticTerms).toBeNull();
  });

  it("parses 'Foundations with high capacity' to type + capacity>=4", async () => {
    const r = await extractSearchFilters(model(), "Foundations with high capacity");
    expect(r.mode).toBe("structured");
    expect(r.filters).toEqual([
      { field: "type", op: "eq", value: "foundation" },
      { field: "capacity", op: "gte", value: 4 },
    ]);
  });

  it("parses 'Not contacted in 60 days' to a recency filter", async () => {
    const r = await extractSearchFilters(model(), "Not contacted in 60 days");
    expect(r.mode).toBe("structured");
    expect(r.filters).toEqual([{ field: "last_contact_days", op: "gt", value: 60 }]);
  });

  it("parses 'Strong relationship to clean water' as HYBRID (relationship + semantic)", async () => {
    const r = await extractSearchFilters(model(), "Strong relationship to clean water");
    expect(r.mode).toBe("hybrid");
    expect(r.filters).toEqual([{ field: "relationship", op: "gte", value: 4 }]);
    expect(r.semanticTerms).toBe("clean water");
  });

  it("falls back to pure-semantic when the model emits an off-whitelist field (Zod rejects)", async () => {
    const r = await extractSearchFilters(model(), "hallucinated field query");
    expect(r.mode).toBe("semantic");
    expect(r.fellBack).toBe(true);
    expect(r.filters).toEqual([]);
    expect(r.semanticTerms).toBe("hallucinated field query");
  });

  it("falls back to pure-semantic for an unparseable query (mock matches no script → throws → caught)", async () => {
    const query = "tell me something interesting";
    const r = await extractSearchFilters(model(), query);
    expect(r.mode).toBe("semantic");
    expect(r.fellBack).toBe(true);
    expect(r.filters).toEqual([]);
    expect(r.semanticTerms).toBe(query);
  });

  it("falls back on an empty query", async () => {
    const r = await extractSearchFilters(model(), "   ");
    expect(r.mode).toBe("semantic");
    expect(r.fellBack).toBe(true);
  });
});
