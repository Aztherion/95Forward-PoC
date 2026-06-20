import Link from "next/link";

const ITEMS = [
  { id: "gallery", label: "Gallery", href: "/analysis" },
  {
    id: "fundraising-performance",
    label: "Fundraising",
    href: "/analysis/fundraising-performance",
  },
  { id: "donor-retention", label: "Donor retention", href: "/analysis/donor-retention" },
  { id: "campaign-progress", label: "Campaign progress", href: "/analysis/campaign-progress" },
] as const;

export type AnalysisSection = (typeof ITEMS)[number]["id"];

export function AnalysisNav({ active }: { active: AnalysisSection }) {
  return (
    <div className="f95-tablist" role="navigation" aria-label="Analysis sections">
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
