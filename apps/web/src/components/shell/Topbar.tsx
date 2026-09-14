import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ds";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { isFeedbackEnabled } from "@/server/feedback/config";

export interface TopbarProps {
  title: string;
  subtitle?: string;
  /**
   * Whether this topbar carries the page's `<h1>`.
   *
   * Default true, because most screens build their header from `.f95-page__header` markup with no
   * heading of their own and rely on this one. Pass `false` on a screen that renders its own title,
   * and let THAT be the h1.
   *
   * Until I26 the only way to satisfy the one-h1-per-screen rule was to demote the page's own
   * title to an `h2` — seven screens had done it — which puts the host's chrome above the page's
   * content in the document outline. That is backwards: the topbar repeats the page's name for the
   * shell, it is not the page's heading. It renders a `<div>` here instead, styled identically.
   */
  heading?: boolean;
}

export function Topbar({ title, subtitle, heading = true }: TopbarProps) {
  const feedbackEnabled = isFeedbackEnabled();
  return (
    <header className="shell-topbar">
      <div className="shell-topbar__heading">
        {heading ? (
          <h1 className="shell-topbar__title">{title}</h1>
        ) : (
          <div className="shell-topbar__title">{title}</div>
        )}
        {subtitle ? <div className="shell-topbar__subtitle">{subtitle}</div> : null}
      </div>
      <label className="shell-search">
        <Search size={16} strokeWidth={1.8} className="shell-search__icon" />
        <input
          className="shell-search__input"
          type="search"
          placeholder="Search Keystone"
          aria-label="Search Keystone"
        />
      </label>
      <Button variant="secondary" size="sm" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
        Add
      </Button>
      {feedbackEnabled ? <FeedbackWidget /> : null}
      <button type="button" className="shell-bell" aria-label="Notifications">
        <Bell size={18} strokeWidth={1.8} />
      </button>
    </header>
  );
}
