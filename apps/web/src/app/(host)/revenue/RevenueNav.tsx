import Link from "next/link";

const ITEMS = [
  { id: "gifts", label: "Gifts", href: "/revenue" },
  { id: "funds", label: "Funds", href: "/revenue/funds" },
  { id: "campaigns", label: "Campaigns", href: "/revenue/campaigns" },
  { id: "appeals", label: "Appeals", href: "/revenue/appeals" },
] as const;

export type RevenueSection = (typeof ITEMS)[number]["id"];

export function RevenueNav({ active }: { active: RevenueSection }) {
  return (
    <div className="f95-tablist" role="navigation" aria-label="Revenue sections">
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
