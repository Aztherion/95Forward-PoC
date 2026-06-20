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
  FileText,
  Gift,
  HandHeart,
  Home,
  IdCard,
  List,
  ListOrdered,
  Megaphone,
  Radio,
  Settings,
  Sunrise,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Register } from "@95forward/shared";
import { HOST_BRAND } from "@95forward/shared";
import { Avatar, Mark } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { NAV_SECTIONS, type NavGroup, type NavIcon, type NavLeaf } from "./nav";

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
    </div>
  );
}

export interface AppShellProps {
  register: Register;
  children: ReactNode;
}

export function AppShell({ register, children }: AppShellProps) {
  const pathname = usePathname();
  const user = getCurrentUser();
  return (
    <div className="shell" data-register={register}>
      <aside className="shell-sidebar">
        <Link href="/" className="shell-brand">
          <span className="shell-brand__name">{HOST_BRAND.name}</span>
          <span className="shell-brand__org">{HOST_BRAND.org}</span>
        </Link>

        {NAV_SECTIONS.map((section) => (
          <nav key={section.id} className="shell-nav">
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

        <Link href="/settings" className="shell-user">
          <Avatar name={user.name} size="md" ringColor="var(--role-manager)" />
          <span className="shell-user__text">
            <span className="shell-user__name">{user.name}</span>
            <span className="shell-user__sub">
              {user.name} · {user.role}
            </span>
          </span>
        </Link>
      </aside>

      <div className="shell-main">
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
