import Link from "next/link";

const ITEMS = [
  { id: "opportunities", label: "Opportunities", href: "/major-giving/opportunities" },
  { id: "proposals", label: "Proposals", href: "/major-giving/proposals" },
  { id: "portfolio", label: "Portfolio", href: "/major-giving/portfolio" },
] as const;

export type MajorGivingSection = (typeof ITEMS)[number]["id"];

export function MajorGivingNav({ active }: { active: MajorGivingSection }) {
  return (
    <div className="f95-tablist" role="navigation" aria-label="Major Giving sections">
      {ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="f95-tab"
          aria-current={item.id === active ? "page" : undefined}
          aria-selected={item.id === active}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
