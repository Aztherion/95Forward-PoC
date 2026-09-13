import Link from "next/link";
import type { ReactNode } from "react";
import { InitiativeDot } from "./InitiativeDot";

export interface TabNavItem {
  id: string;
  label: string;
  href: string;
  /** An initiative's stored colour key, for the Forecast Room's initiative tabs. */
  colourKey?: string | null;
  /** Renders inert — the Team / All-reps toggles, which are undesigned. */
  disabled?: boolean;
}

export interface TabNavProps {
  items: TabNavItem[];
  active: string;
  label: string;
  children?: ReactNode;
}

/**
 * Link-based navigation tabs that set an attribute a link is allowed to have.
 *
 * Six hand-rolled `*Nav` components set `aria-selected` on plain links — not because anyone chose
 * to, but because `.f95-tab[aria-selected="true"]` is the only rule in the system that styles an
 * active tab and nothing targets `aria-current`. `aria-selected` is invalid on a link: it belongs
 * to `role="tab"` inside a `role="tablist"`, and these are navigation, not tabs.
 *
 * This styles `aria-current="page"`, which is the correct attribute for "the link to the page you
 * are on", and adds the two things the Forecast Room's initiative tabs need that `Tabs` has no
 * notion of: a colour dot per item, and a disabled state.
 *
 * The existing six are deliberately left alone — they are a separate cleanup, and copying their
 * mistake into a load-bearing new surface is how a broken pattern becomes the house style.
 */
export function TabNav({ items, active, label, children }: TabNavProps) {
  return (
    <>
      <nav className="f95-tabnav" aria-label={label}>
        {items.map((item) => {
          const current = item.id === active;
          const body = (
            <>
              {item.colourKey !== undefined ? <InitiativeDot colourKey={item.colourKey} /> : null}
              {item.label}
            </>
          );
          if (item.disabled) {
            return (
              <span key={item.id} className="f95-tabnav__item" aria-disabled="true">
                {body}
              </span>
            );
          }
          return (
            <Link
              key={item.id}
              href={item.href}
              className="f95-tabnav__item"
              aria-current={current ? "page" : undefined}
              scroll={false}
            >
              {body}
            </Link>
          );
        })}
      </nav>
      {children}
    </>
  );
}
