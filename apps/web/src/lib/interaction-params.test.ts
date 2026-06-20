import { describe, expect, it } from "vitest";
import {
  definitionToInteractionParams,
  hasActiveInteractionFilters,
  interactionParamsToDefinition,
  interactionParamsToSearch,
  parseInteractionListParams,
} from "./interaction-params";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("parseInteractionListParams", () => {
  it("returns newest-first defaults for empty input", () => {
    expect(parseInteractionListParams({})).toEqual({
      search: "",
      type: null,
      ownerUserId: null,
      constituentId: null,
      from: null,
      to: null,
      sort: "occurredAt",
      dir: "desc",
      page: 1,
    });
  });

  it("parses and trims valid filters", () => {
    const params = parseInteractionListParams({
      search: "  call ",
      type: "meeting",
      owner: UUID,
      constituent: UUID,
      from: "2025-01-01",
      to: "2025-12-31",
      sort: "type",
      dir: "asc",
      page: "3",
    });
    expect(params.search).toBe("call");
    expect(params.type).toBe("meeting");
    expect(params.ownerUserId).toBe(UUID);
    expect(params.constituentId).toBe(UUID);
    expect(params.from).toBe("2025-01-01");
    expect(params.to).toBe("2025-12-31");
    expect(params.sort).toBe("type");
    expect(params.dir).toBe("asc");
    expect(params.page).toBe(3);
  });

  it("rejects invalid enum, non-uuid, and malformed dates", () => {
    const params = parseInteractionListParams({
      type: "fax",
      owner: "nope",
      constituent: "123",
      from: "01-01-2025",
      sort: "salary",
      dir: "sideways",
      page: "-1",
    });
    expect(params.type).toBeNull();
    expect(params.ownerUserId).toBeNull();
    expect(params.constituentId).toBeNull();
    expect(params.from).toBeNull();
    expect(params.sort).toBe("occurredAt");
    expect(params.dir).toBe("desc");
    expect(params.page).toBe(1);
  });
});

describe("interactionParamsToSearch", () => {
  it("omits defaults", () => {
    const sp = interactionParamsToSearch(parseInteractionListParams({}));
    expect(sp.toString()).toBe("");
  });

  it("serializes non-default values", () => {
    const sp = interactionParamsToSearch({
      search: "call",
      type: "email",
      sort: "type",
      dir: "asc",
      page: 2,
    });
    expect(sp.get("search")).toBe("call");
    expect(sp.get("type")).toBe("email");
    expect(sp.get("sort")).toBe("type");
    expect(sp.get("dir")).toBe("asc");
    expect(sp.get("page")).toBe("2");
  });
});

describe("hasActiveInteractionFilters", () => {
  it("is false for bare defaults", () => {
    expect(hasActiveInteractionFilters(parseInteractionListParams({}))).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveInteractionFilters(parseInteractionListParams({ type: "note" }))).toBe(true);
    expect(hasActiveInteractionFilters(parseInteractionListParams({ from: "2025-01-01" }))).toBe(
      true,
    );
  });
});

describe("interaction definition round-trip", () => {
  it("maps params to a definition and back", () => {
    const params = parseInteractionListParams({
      type: "meeting",
      owner: UUID,
      from: "2025-02-01",
      to: "2025-03-01",
      sort: "constituent",
      dir: "asc",
    });
    const definition = interactionParamsToDefinition(params);
    expect(definition.filters).toContainEqual({ field: "type", operator: "eq", value: "meeting" });
    expect(definition.filters).toContainEqual({
      field: "occurredAt",
      operator: "gte",
      value: "2025-02-01",
    });
    expect(definition.filters).toContainEqual({
      field: "occurredAt",
      operator: "lte",
      value: "2025-03-01",
    });

    const restored = definitionToInteractionParams(definition);
    expect(restored.type).toBe("meeting");
    expect(restored.ownerUserId).toBe(UUID);
    expect(restored.from).toBe("2025-02-01");
    expect(restored.to).toBe("2025-03-01");
    expect(restored.sort).toBe("constituent");
    expect(restored.dir).toBe("asc");
  });

  it("ignores unknown fields and invalid enum values", () => {
    const restored = definitionToInteractionParams({
      filters: [
        { field: "type", operator: "eq", value: "telepathy" },
        { field: "mystery", operator: "eq", value: "x" },
      ],
      search: "  ",
    });
    expect(restored.type).toBeNull();
    expect(restored.search).toBe("  ");
  });
});
