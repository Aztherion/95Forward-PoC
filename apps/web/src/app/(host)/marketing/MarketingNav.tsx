import Link from "next/link";

const ITEMS = [
  { id: "communications", label: "Communications", href: "/marketing/communications" },
  { id: "segments", label: "Segments", href: "/marketing/segments" },
] as const;

export type MarketingSection = (typeof ITEMS)[number]["id"];

export function MarketingNav({ active }: { active: MarketingSection }) {
  return (
    <div className="f95-tablist" role="navigation" aria-label="Marketing sections">
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
