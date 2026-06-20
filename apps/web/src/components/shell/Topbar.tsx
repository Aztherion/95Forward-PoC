import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ds";

export interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="shell-topbar">
      <div className="shell-topbar__heading">
        <h1 className="shell-topbar__title">{title}</h1>
        {subtitle ? <div className="shell-topbar__subtitle">{subtitle}</div> : null}
      </div>
      <label className="shell-search">
        <Search size={16} strokeWidth={1.8} className="shell-search__icon" />
        <input className="shell-search__input" placeholder="Search Keystone" />
      </label>
      <Button variant="secondary" size="sm" iconLeft={<Plus size={16} strokeWidth={1.8} />}>
        Add
      </Button>
      <button type="button" className="shell-bell" aria-label="Notifications">
        <Bell size={18} strokeWidth={1.8} />
      </button>
    </header>
  );
}
