import { ADDON_BRAND } from "@95forward/shared";

export type NavIcon =
  | "home"
  | "users"
  | "circle-dollar-sign"
  | "gift"
  | "list"
  | "megaphone"
  | "calendar"
  | "hand-heart"
  | "id-card"
  | "chart-line"
  | "settings"
  | "sunrise"
  | "list-ordered"
  | "trending-up"
  | "target"
  | "file-text"
  | "briefcase"
  | "radio"
  | "compass"
  | "scale"
  | "layout-dashboard"
  | "flag";

export interface NavLeaf {
  kind: "leaf";
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
}

export interface NavGroup {
  kind: "group";
  id: string;
  label: string;
  icon: NavIcon;
  basePath: string;
  children: NavLeaf[];
  /**
   * A call to action rendered INSIDE the group, below its children.
   *
   * "Enter visit mode" is a product affordance, not host chrome — it belongs to 95 Forward, and
   * sitting it beside the group rather than inside it read as another thing the CRM offers.
   */
  cta?: NavCta;
}

export interface NavCta {
  kind: "cta";
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
}

export interface NavEyebrow {
  kind: "eyebrow";
  id: string;
  label: string;
}

export type NavItem = NavLeaf | NavGroup | NavCta | NavEyebrow;

export interface NavSection {
  id: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "host-core",
    items: [
      { kind: "leaf", id: "home", label: "Home", href: "/", icon: "home" },
      {
        kind: "leaf",
        id: "constituents",
        label: "Constituents",
        href: "/constituents",
        icon: "users",
      },
      {
        kind: "leaf",
        id: "revenue",
        label: "Revenue",
        href: "/revenue",
        icon: "circle-dollar-sign",
      },
      {
        kind: "group",
        id: "major-giving",
        label: "Major Giving",
        icon: "gift",
        basePath: "/major-giving",
        children: [
          {
            kind: "leaf",
            id: "opportunities",
            label: "Opportunities",
            href: "/major-giving/opportunities",
            icon: "target",
          },
          {
            kind: "leaf",
            id: "proposals",
            label: "Proposals",
            href: "/major-giving/proposals",
            icon: "file-text",
          },
          {
            kind: "leaf",
            id: "portfolio",
            label: "Portfolio",
            href: "/major-giving/portfolio",
            icon: "briefcase",
          },
        ],
      },
      { kind: "leaf", id: "lists", label: "Lists", href: "/lists", icon: "list" },
    ],
  },
  {
    id: "add-ons",
    items: [
      { kind: "eyebrow", id: "add-ons-label", label: "Add-ons" },
      {
        kind: "group",
        id: "95-forward",
        label: ADDON_BRAND.name,
        icon: "sunrise",
        basePath: "/95-forward",
        // The war-room order: what to do today, the things you do it to, then the numbers, then the
        // doctrine behind the numbers. `Today` (the old prospect-centric dashboard) is deliberately
        // absent — The Board replaces it as the landing, and two landings is one too many. The route
        // stays reachable until I25 removes it.
        children: [
          {
            kind: "leaf",
            id: "board",
            label: "The Board",
            href: "/95-forward/board",
            icon: "layout-dashboard",
          },
          {
            kind: "leaf",
            id: "opportunities",
            label: "Opportunities",
            href: "/95-forward/opportunities",
            icon: "target",
          },
          {
            kind: "leaf",
            id: "prospects",
            label: "Prospects",
            href: "/95-forward/prospects",
            icon: "list-ordered",
          },
          {
            kind: "leaf",
            id: "initiatives",
            label: "Initiatives",
            href: "/95-forward/initiatives",
            icon: "flag",
          },
          {
            kind: "leaf",
            id: "forecast",
            label: "Forecast",
            href: "/95-forward/forecast",
            icon: "chart-line",
          },
          {
            kind: "leaf",
            id: "green-sheet",
            label: "Green Sheet",
            href: "/95-forward/green-sheet",
            icon: "trending-up",
          },
          // The Rules of Robb (I22). Deliberately at `/rules`, not `/95-forward/rules`: the RULE
          // chips on every screen link here, and a short stable path is what makes the chip's
          // promise — "this leads somewhere a human can read" — cheap to honour everywhere.
          { kind: "leaf", id: "rules", label: "Rules", href: "/rules", icon: "scale" },
        ],
        cta: {
          kind: "cta",
          id: "visit",
          label: "Enter visit mode",
          href: "/95-forward/visit",
          icon: "radio",
        },
      },
    ],
  },
  {
    id: "host-more",
    items: [
      { kind: "leaf", id: "marketing", label: "Marketing", href: "/marketing", icon: "megaphone" },
      { kind: "leaf", id: "events", label: "Events", href: "/events", icon: "calendar" },
      {
        kind: "leaf",
        id: "volunteers",
        label: "Volunteers",
        href: "/volunteers",
        icon: "hand-heart",
      },
      {
        kind: "leaf",
        id: "memberships",
        label: "Memberships",
        href: "/memberships",
        icon: "id-card",
      },
      { kind: "leaf", id: "analysis", label: "Analysis", href: "/analysis", icon: "chart-line" },
    ],
  },
  {
    id: "bottom",
    items: [
      { kind: "leaf", id: "settings", label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];
