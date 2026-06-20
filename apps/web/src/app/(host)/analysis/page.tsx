import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, Card } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ReportCard {
  title: string;
  description: string;
  href: string | null;
  live: boolean;
}

const REPORTS: ReportCard[] = [
  {
    title: "Fundraising performance",
    description: "Gifts over time, totals by fund and campaign, and headline giving metrics.",
    href: "/analysis/fundraising-performance",
    live: true,
  },
  {
    title: "Donor retention",
    description: "New, returning, and lapsed donors with a year-over-year retention rate.",
    href: "/analysis/donor-retention",
    live: true,
  },
  {
    title: "Campaign & appeal progress",
    description: "Goal versus raised for every campaign and appeal, with amount remaining.",
    href: "/analysis/campaign-progress",
    live: true,
  },
  {
    title: "Lapsed donor recovery",
    description: "Reactivation pipeline for donors who gave previously but not this year.",
    href: null,
    live: false,
  },
  {
    title: "Gift officer portfolio",
    description: "Assigned constituents, recent touchpoints, and pipeline by fundraiser.",
    href: null,
    live: false,
  },
];

export default async function AnalysisPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="f95-page">
      <div className="f95-page__header">
        <div className="f95-page__heading">
          <div className="f95-page__eyebrow">Keystone CRM</div>
          <h1 className="f95-page__title">Analysis</h1>
          <div className="f95-page__count">Reports and dashboards across your data</div>
        </div>
      </div>

      <div className="f95-tilegrid f95-tilegrid--wide">
        {REPORTS.map((report) => (
          <Card key={report.title} pad="lg">
            <div className="f95-stack f95-stack--sm">
              <div className="f95-cluster">
                <h2 className="f95-section-title">{report.title}</h2>
                {report.live ? (
                  <Badge tone="success">Live</Badge>
                ) : (
                  <Badge tone="neutral">Static in this PoC</Badge>
                )}
              </div>
              <p className="f95-stat__sub">{report.description}</p>
              {report.href ? (
                <Link href={report.href} className="f95-analysis-link">
                  Open dashboard
                  <ArrowUpRight size={15} strokeWidth={1.8} />
                </Link>
              ) : (
                <span className="f95-analysis-link f95-analysis-link--muted">
                  Not available in this PoC
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
