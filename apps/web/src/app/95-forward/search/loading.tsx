import { Search } from "lucide-react";
import { Topbar } from "@/components/shell";

export default function SearchLoading() {
  return (
    <>
      <Topbar title="Search prospects" subtitle="95 Forward" />
      <div className="f95-page" data-testid="search-loading">
        <div className="f95-page__header">
          <div className="f95-page__heading">
            <div className="f95-page__eyebrow">95 Forward</div>
            <h1 className="f95-page__title">Search prospects</h1>
          </div>
        </div>
        <div className="f95-cluster" role="status" aria-live="polite">
          <Search size={16} strokeWidth={1.8} aria-hidden />
          <span className="f95-page__count">Reading your search…</span>
        </div>
      </div>
    </>
  );
}
