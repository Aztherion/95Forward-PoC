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

  it("groups the 95 Forward add-on under an ADD-ONS eyebrow", () => {
    const items = section("add-ons").items;
    // The visit CTA is no longer a sibling of the group — it lives INSIDE it (I24).
    expect(items.map((i) => i.kind)).toEqual(["eyebrow", "group"]);

    const eyebrow = items[0];
    expect(eyebrow?.kind).toBe("eyebrow");
    if (eyebrow?.kind === "eyebrow") expect(eyebrow.label).toBe("Add-ons");
  });

  it("lists the seven war-room items in order", () => {
    const group = section("add-ons").items.find(
      (i): i is NavGroup => i.kind === "group" && i.id === "95-forward",
    );
    expect(group).toBeDefined();
    expect(group?.label).toBe("95 Forward");
    expect(group?.basePath).toBe("/95-forward");
    expect(group?.children.map((c) => [c.label, c.href])).toEqual([
      ["The Board", "/95-forward/board"],
      ["Opportunities", "/95-forward/opportunities"],
      ["Prospects", "/95-forward/prospects"],
      ["Initiatives", "/95-forward/initiatives"],
      ["Forecast", "/95-forward/forecast"],
      ["Green Sheet", "/95-forward/green-sheet"],
      ["Rules", "/rules"],
    ]);
  });

  it("keeps the old prospect-centric dashboard out of the nav", () => {
    // `/95-forward/today` is gone as of I25 — deleted, not parked, because two landing screens
    // means two philosophies and someone eventually demos the wrong one.
    const hrefs = NAV_SECTIONS.flatMap((s) =>
      s.items.flatMap((i) =>
        i.kind === "group" ? i.children.map((c) => c.href) : i.kind === "eyebrow" ? [] : [i.href],
      ),
    );
    expect(hrefs).not.toContain("/95-forward/today");
  });

  it("puts Enter visit mode inside the 95 Forward group, not beside it", () => {
    const group = section("add-ons").items.find(
      (i): i is NavGroup => i.kind === "group" && i.id === "95-forward",
    );
    // It is a product affordance, not host chrome.
    expect(group?.cta?.label).toBe("Enter visit mode");
    expect(group?.cta?.href).toBe("/95-forward/visit");
  });

  it("keeps every Keystone section present and navigable", () => {
    // I24 mutes the host VISUALLY. Breaking 63 working pages to make a visual point would weaken
    // the demonstration it is supposed to make.
    const hostSections = NAV_SECTIONS.filter((s) => s.id !== "add-ons");
    const leaves = hostSections.flatMap((s) =>
      s.items.flatMap((i) =>
        i.kind === "group" ? i.children : i.kind === "leaf" ? [i] : [],
      ),
    );
    expect(leaves.length).toBeGreaterThan(10);
    for (const leaf of leaves) {
      expect(leaf.href, leaf.label).toMatch(/^\//);
      expect(leaf.href, leaf.label).not.toBe("#");
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
