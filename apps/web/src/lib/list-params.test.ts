import { describe, expect, it } from "vitest";
import {
  constituentParamsToDefinition,
  constituentParamsToSearch,
  definitionToConstituentParams,
  definitionToConstituentSearch,
  parseConstituentListParams,
} from "./list-params";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("parseConstituentListParams", () => {
  it("returns calm defaults for empty input", () => {
    const params = parseConstituentListParams({});
    expect(params).toEqual({
      search: "",
      type: null,
      status: null,
      assignedUserId: null,
      tagId: null,
      sort: "displayName",
      dir: "asc",
      page: 1,
      showArchived: false,
    });
  });

  it("parses and trims valid filters", () => {
    const params = parseConstituentListParams({
      search: "  hallworth ",
      type: "foundation",
      status: "donor",
      assigned: UUID,
      tag: UUID,
      sort: "lifetimeGiving",
      dir: "desc",
      page: "3",
      archived: "1",
    });
    expect(params.search).toBe("hallworth");
    expect(params.type).toBe("foundation");
    expect(params.status).toBe("donor");
    expect(params.assignedUserId).toBe(UUID);
    expect(params.tagId).toBe(UUID);
    expect(params.sort).toBe("lifetimeGiving");
    expect(params.dir).toBe("desc");
    expect(params.page).toBe(3);
    expect(params.showArchived).toBe(true);
  });

  it("rejects invalid enum and non-uuid values", () => {
    const params = parseConstituentListParams({
      type: "alien",
      status: "vip",
      assigned: "not-a-uuid",
      tag: "123",
      sort: "salary",
      dir: "sideways",
      page: "-4",
    });
    expect(params.type).toBeNull();
    expect(params.status).toBeNull();
    expect(params.assignedUserId).toBeNull();
    expect(params.tagId).toBeNull();
    expect(params.sort).toBe("displayName");
    expect(params.dir).toBe("asc");
    expect(params.page).toBe(1);
  });

  it("takes the first value when arrays are provided", () => {
    const params = parseConstituentListParams({ search: ["first", "second"] });
    expect(params.search).toBe("first");
  });
});

describe("constituentParamsToSearch", () => {
  it("omits defaults to keep URLs clean", () => {
    const sp = constituentParamsToSearch({
      search: "",
      type: null,
      status: null,
      assignedUserId: null,
      tagId: null,
      sort: "displayName",
      dir: "asc",
      page: 1,
      showArchived: false,
    });
    expect(sp.toString()).toBe("");
  });

  it("serializes only non-default values", () => {
    const sp = constituentParamsToSearch({
      search: "vega",
      type: "individual",
      sort: "lastGift",
      dir: "desc",
      page: 2,
      showArchived: true,
    });
    expect(sp.get("search")).toBe("vega");
    expect(sp.get("type")).toBe("individual");
    expect(sp.get("sort")).toBe("lastGift");
    expect(sp.get("dir")).toBe("desc");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("archived")).toBe("1");
  });
});

describe("saved view round-trip", () => {
  it("converts params to a definition and back to search", () => {
    const params = parseConstituentListParams({
      search: "osgood",
      type: "foundation",
      status: "active",
      assigned: UUID,
      tag: UUID,
      sort: "lastContact",
      dir: "desc",
    });
    const definition = constituentParamsToDefinition(params);
    expect(definition.search).toBe("osgood");
    expect(definition.sort).toEqual({ field: "lastContact", dir: "desc" });
    expect(definition.filters).toContainEqual({
      field: "type",
      operator: "eq",
      value: "foundation",
    });

    const sp = definitionToConstituentSearch(definition);
    const reparsed = parseConstituentListParams(Object.fromEntries(sp.entries()));
    expect(reparsed.search).toBe("osgood");
    expect(reparsed.type).toBe("foundation");
    expect(reparsed.status).toBe("active");
    expect(reparsed.assignedUserId).toBe(UUID);
    expect(reparsed.tagId).toBe(UUID);
    expect(reparsed.sort).toBe("lastContact");
    expect(reparsed.dir).toBe("desc");
  });
});

describe("definitionToConstituentParams", () => {
  it("runs a saved definition into runnable params", () => {
    const params = definitionToConstituentParams({
      filters: [
        { field: "type", operator: "eq", value: "organization" },
        { field: "prospectStatus", operator: "eq", value: "prospect" },
        { field: "assignedUserId", operator: "eq", value: UUID },
      ],
      search: "vega",
      sort: { field: "lifetimeGiving", dir: "desc" },
    });
    expect(params.type).toBe("organization");
    expect(params.status).toBe("prospect");
    expect(params.assignedUserId).toBe(UUID);
    expect(params.search).toBe("vega");
    expect(params.sort).toBe("lifetimeGiving");
    expect(params.dir).toBe("desc");
    expect(params.page).toBe(1);
  });

  it("ignores unknown fields and falls back to defaults", () => {
    const params = definitionToConstituentParams({
      filters: [{ field: "x", operator: "eq", value: "y" }],
    });
    expect(params.type).toBeNull();
    expect(params.sort).toBe("displayName");
    expect(params.dir).toBe("asc");
  });
});
