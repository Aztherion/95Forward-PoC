import Link from "next/link";

const ITEMS = [
  { id: "members", label: "Members", href: "/memberships/members" },
  { id: "renewals", label: "Renewals", href: "/memberships/renewals" },
  { id: "tiers", label: "Tiers", href: "/memberships/tiers" },
  { id: "wavemaker", label: "Wavemaker", href: "/memberships/wavemaker" },
] as const;

export type MembershipsSection = (typeof ITEMS)[number]["id"];

export function MembershipsNav({ active }: { active: MembershipsSection }) {
  return (
    <div className="f95-tablist" role="navigation" aria-label="Memberships sections">
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
