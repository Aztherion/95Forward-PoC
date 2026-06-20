"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { CONSTITUENT_PROSPECT_STATUSES, CONSTITUENT_TYPES } from "@95forward/shared";
import { Input, Select, Switch } from "@/components/ds";
import { titleCaseFromSnake } from "@/lib/format";

export interface FilterBarProps {
  users: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export function FilterBar({ users, tags }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    startTransition(() => {
      router.push(`/constituents?${next.toString()}`);
    });
  }

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    update("search", search.trim());
  }

  const typeOptions = CONSTITUENT_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));
  const statusOptions = CONSTITUENT_PROSPECT_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));
  const userOptions = users.map((user) => ({ value: user.id, label: user.name }));
  const tagOptions = tags.map((tag) => ({ value: tag.id, label: tag.name }));

  return (
    <div className="f95-filterbar">
      <form className="f95-filterbar__search" onSubmit={onSearchSubmit} role="search">
        <Input
          label="Search"
          placeholder="Search by name or email"
          icon={<Search size={16} strokeWidth={1.8} />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          name="search"
        />
      </form>
      <div className="f95-filterbar__field">
        <Select
          label="Type"
          placeholder="All types"
          options={typeOptions}
          value={searchParams.get("type") ?? ""}
          onChange={(event) => update("type", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Prospect status"
          placeholder="All statuses"
          options={statusOptions}
          value={searchParams.get("status") ?? ""}
          onChange={(event) => update("status", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Assigned to"
          placeholder="Anyone"
          options={userOptions}
          value={searchParams.get("assigned") ?? ""}
          onChange={(event) => update("assigned", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Tag"
          placeholder="Any tag"
          options={tagOptions}
          value={searchParams.get("tag") ?? ""}
          onChange={(event) => update("tag", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__toggle">
        <Switch
          label="Show archived"
          checked={searchParams.get("archived") === "1"}
          onChange={(event) => update("archived", event.target.checked ? "1" : "")}
        />
      </div>
    </div>
  );
}
