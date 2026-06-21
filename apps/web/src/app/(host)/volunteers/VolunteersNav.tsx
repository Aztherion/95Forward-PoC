import Link from "next/link";

const ITEMS = [
  { id: "roster", label: "Roster", href: "/volunteers/roster" },
  { id: "opportunities", label: "Opportunities", href: "/volunteers/opportunities" },
] as const;

export type VolunteersSection = (typeof ITEMS)[number]["id"];

export function VolunteersNav({ active }: { active: VolunteersSection }) {
  return (
    <div className="f95-tablist" role="navigation" aria-label="Volunteers sections">
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
