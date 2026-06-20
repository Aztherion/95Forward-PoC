import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, type NavGroup, type NavLeaf } from "./nav";

function section(id: string) {
  const found = NAV_SECTIONS.find((s) => s.id === id);
  if (!found) throw new Error(`missing section ${id}`);
  return found;
}

describe("nav configuration", () => {
  it("orders the sections host-core, add-ons, host-more, bottom", () => {
    expect(NAV_SECTIONS.map((s) => s.id)).toEqual(["host-core", "add-ons", "host-more", "bottom"]);
  });

  it("lists host core items in the exact order with hrefs", () => {
    const items = section("host-core").items;
    expect(items.map((i) => i.id)).toEqual([
      "home",
      "constituents",
      "revenue",
      "major-giving",
      "lists",
    ]);
    const leaves = items.filter((i): i is NavLeaf => i.kind === "leaf");
    expect(leaves.map((l) => [l.label, l.href])).toEqual([
      ["Home", "/"],
      ["Constituents", "/constituents"],
      ["Revenue", "/revenue"],
      ["Lists", "/lists"],
    ]);
  });

  it("expands Major Giving into opportunities, proposals, portfolio", () => {
    const group = section("host-core").items.find(
      (i): i is NavGroup => i.kind === "group" && i.id === "major-giving",
    );
    expect(group).toBeDefined();
    expect(group?.label).toBe("Major Giving");
    expect(group?.basePath).toBe("/major-giving");
    expect(group?.children.map((c) => [c.label, c.href])).toEqual([
      ["Opportunities", "/major-giving/opportunities"],
      ["Proposals", "/major-giving/proposals"],
      ["Portfolio", "/major-giving/portfolio"],
    ]);
  });

  it("groups the 95 Forward add-on under an ADD-ONS eyebrow with a visit CTA", () => {
    const items = section("add-ons").items;
    expect(items.map((i) => i.kind)).toEqual(["eyebrow", "group", "cta"]);

    const eyebrow = items[0];
    expect(eyebrow?.kind).toBe("eyebrow");
    if (eyebrow?.kind === "eyebrow") expect(eyebrow.label).toBe("Add-ons");

    const group = items[1];
    expect(group?.kind).toBe("group");
    if (group?.kind === "group") {
      expect(group.id).toBe("95-forward");
      expect(group.label).toBe("95 Forward");
      expect(group.basePath).toBe("/95-forward");
      expect(group.children.map((c) => [c.label, c.href])).toEqual([
        ["Today", "/95-forward/today"],
        ["Prospects", "/95-forward/prospects"],
        ["Green Sheet", "/95-forward/green-sheet"],
        ["Initiatives", "/95-forward/initiatives"],
      ]);
    }

    const cta = items[2];
    expect(cta?.kind).toBe("cta");
    if (cta?.kind === "cta") {
      expect(cta.label).toBe("Enter visit mode");
      expect(cta.href).toBe("/95-forward/visit");
    }
  });

  it("lists host more items in the exact order", () => {
    const leaves = section("host-more").items.filter((i): i is NavLeaf => i.kind === "leaf");
    expect(leaves.map((l) => [l.label, l.href])).toEqual([
      ["Marketing", "/marketing"],
      ["Events", "/events"],
      ["Volunteers", "/volunteers"],
      ["Memberships", "/memberships"],
      ["Analysis", "/analysis"],
    ]);
  });

  it("pins settings at the bottom", () => {
    const items = section("bottom").items;
    expect(items).toHaveLength(1);
    const settings = items[0];
    expect(settings?.kind).toBe("leaf");
    if (settings?.kind === "leaf") {
      expect(settings.label).toBe("Settings");
      expect(settings.href).toBe("/settings");
    }
  });
});
