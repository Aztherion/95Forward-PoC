import type { ReactNode } from "react";
import Link from "next/link";

export interface TabItem {
  id: string;
  label: string;
  href: string;
}

export interface TabsProps {
  items: TabItem[];
  active: string;
  children?: ReactNode;
  label?: string;
}

export function Tabs({ items, active, children, label = "Record sections" }: TabsProps) {
  return (
    <div className="f95-tabs">
      <div className="f95-tablist" role="tablist" aria-label={label}>
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              role="tab"
              aria-selected={selected}
              className="f95-tab"
              scroll={false}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div role="tabpanel">{children}</div>
    </div>
  );
}
