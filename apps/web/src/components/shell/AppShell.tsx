"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ChartLine,
  ChevronRight,
  CircleDollarSign,
  Compass,
  FileText,
  Gift,
  HandHeart,
  Home,
  IdCard,
  List,
  ListOrdered,
  LogOut,
  Megaphone,
  Flag,
  LayoutDashboard,
  Radio,
  Scale,
  Settings,
  Sunrise,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CurrentUser, Register } from "@95forward/shared";
import { HOST_BRAND, ROLE_LABELS } from "@95forward/shared";
import { Avatar, Mark } from "@/components/ds";
import { NAV_SECTIONS, type NavGroup, type NavIcon, type NavLeaf } from "./nav";
import { JobTray } from "./JobTray";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  users: Users,
  "circle-dollar-sign": CircleDollarSign,
  gift: Gift,
  list: List,
  megaphone: Megaphone,
  calendar: Calendar,
  "hand-heart": HandHeart,
  "id-card": IdCard,
  "chart-line": ChartLine,
  settings: Settings,
  sunrise: Sunrise,
  "list-ordered": ListOrdered,
  "trending-up": TrendingUp,
  target: Target,
  "file-text": FileText,
  briefcase: Briefcase,
  radio: Radio,
  compass: Compass,
  scale: Scale,
  "layout-dashboard": LayoutDashboard,
  flag: Flag,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavRowProps {
  leaf: NavLeaf;
  active: boolean;
}

function NavRow({ leaf, active }: NavRowProps) {
  const Icon = ICONS[leaf.icon];
  return (
    <Link
      href={leaf.href}
      className={`shell-row${active ? " shell-row--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} strokeWidth={1.8} className="shell-row__icon" />
      <span className="shell-row__label">{leaf.label}</span>
    </Link>
  );
}

interface NavGroupRowProps {
  group: NavGroup;
  pathname: string;
  branded: boolean;
}

function NavGroupRow({ group, pathname, branded }: NavGroupRowProps) {
  const Icon = ICONS[group.icon];
  const within =
    isActive(pathname, group.basePath) ||
    group.children.some((child) => isActive(pathname, child.href));
  const [open, setOpen] = useState(within);
  const expanded = open || within;
  return (
    <div className={`shell-group${branded ? " shell-group--branded" : ""}`}>
      <button
        type="button"
        className="shell-row shell-row--group"
        aria-expanded={expanded}
        onClick={() => setOpen((value) => !value)}
      >
        {branded ? (
          <Mark size={18} />
        ) : (
          <Icon size={18} strokeWidth={1.8} className="shell-row__icon" />
        )}
        <span className="shell-row__label">{group.label}</span>
        <ChevronRight
          size={15}
          strokeWidth={1.8}
          className={`shell-row__chevron${expanded ? " shell-row__chevron--open" : ""}`}
        />
      </button>
      {expanded ? (
        <div className="shell-group__children">
          {group.children.map((child) => (
            <NavRow key={child.id} leaf={child} active={isActive(pathname, child.href)} />
          ))}
        </div>
      ) : null}
      {/* INSIDE the group but OUTSIDE the collapsible children, deliberately.
          Entering visit mode is the product's most time-critical affordance — a rep does it on the
          way out of the door. Putting it among the children would hide it whenever the group is
          collapsed, which is every host page, so it would be least reachable exactly when somebody
          is elsewhere in the CRM and about to leave. */}
      {group.cta ? (
        <Link href={group.cta.href} className="shell-visit">
          <Radio size={17} strokeWidth={1.8} />
          {group.cta.label}
        </Link>
      ) : null}
    </div>
  );
}

export interface AppShellProps {
  register: Register;
  user: CurrentUser;
  children: ReactNode;
}

export function AppShell({ register, user, children }: AppShellProps) {
  const pathname = usePathname();
  return (
    <div className="shell" data-register={register}>
      <a href="#shell-content" className="skip-link">
        Skip to main content
      </a>
      <aside className="shell-sidebar">
        <Link href="/" className="shell-brand">
          <span className="shell-brand__name">{HOST_BRAND.name}</span>
          <span className="shell-brand__org">{HOST_BRAND.org}</span>
        </Link>

        {NAV_SECTIONS.map((section) => (
          // `data-tier` is what separates the host from the add-on VISUALLY without separating them
          // functionally: every Keystone row below stays a real link to a real, working page. A
          // stakeholder who clicks one and lands on a functioning CRM screen has the framing
          // confirmed; a dead link would undo it.
          <nav
            key={section.id}
            className="shell-nav"
            data-tier={section.id === "add-ons" ? "addon" : "host"}
          >
            {section.items.map((item) => {
              if (item.kind === "eyebrow") {
                return (
                  <div key={item.id} className="shell-eyebrow">
                    {item.label}
                  </div>
                );
              }
              if (item.kind === "cta") {
                const Icon = ICONS[item.icon];
                return (
                  <Link key={item.id} href={item.href} className="shell-visit">
                    <Icon size={17} strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              }
              if (item.kind === "group") {
                return (
                  <NavGroupRow
                    key={item.id}
                    group={item}
                    pathname={pathname}
                    branded={item.id === "95-forward"}
                  />
                );
              }
              return <NavRow key={item.id} leaf={item} active={isActive(pathname, item.href)} />;
            })}
          </nav>
        ))}

        <div className="shell-account">
          <Link href="/settings" className="shell-user">
            <Avatar name={user.name} size="md" ringColor="var(--role-manager)" />
            <span className="shell-user__text">
              <span className="shell-user__name">{user.name}</span>
              <span className="shell-user__sub">{ROLE_LABELS[user.role]}</span>
            </span>
          </Link>
          <a href="/auth/logout" className="shell-signout" aria-label="Sign out">
            <LogOut size={18} strokeWidth={1.8} />
          </a>
        </div>
      </aside>

      <div className="shell-main">
        <main id="shell-content" className="shell-content" tabIndex={-1}>
          {children}
        </main>
        {register === "95-forward" ? <JobTray /> : null}
      </div>
    </div>
  );
}
