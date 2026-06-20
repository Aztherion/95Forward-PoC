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
  | "radio";

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
            href: "/opportunities",
            icon: "target",
          },
          {
            kind: "leaf",
            id: "proposals",
            label: "Proposals",
            href: "/proposals",
            icon: "file-text",
          },
          {
            kind: "leaf",
            id: "portfolio",
            label: "Portfolio",
            href: "/portfolio",
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
        children: [
          { kind: "leaf", id: "today", label: "Today", href: "/95-forward/today", icon: "sunrise" },
          {
            kind: "leaf",
            id: "prospects",
            label: "Prospects",
            href: "/95-forward/prospects",
            icon: "list-ordered",
          },
          {
            kind: "leaf",
            id: "green-sheet",
            label: "Green Sheet",
            href: "/95-forward/green-sheet",
            icon: "trending-up",
          },
          {
            kind: "leaf",
            id: "initiatives",
            label: "Initiatives",
            href: "/95-forward/initiatives",
            icon: "target",
          },
        ],
      },
      {
        kind: "cta",
        id: "visit",
        label: "Enter visit mode",
        href: "/95-forward/visit",
        icon: "radio",
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
