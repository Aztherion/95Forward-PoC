"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { EVENT_TYPES } from "@95forward/shared";
import { Input, Select } from "@/components/ds";
import { titleCaseFromSnake } from "@/lib/format";

export function EventFilterBar() {
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
      router.push(`/events?${next.toString()}`);
    });
  }

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    update("search", search.trim());
  }

  const typeOptions = EVENT_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));

  return (
    <div className="f95-filterbar">
      <form className="f95-filterbar__search" onSubmit={onSearchSubmit} role="search">
        <Input
          label="Search"
          placeholder="Search by event name"
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
          value={searchParams.get("event_type") ?? ""}
          onChange={(event) => update("event_type", event.target.value)}
        />
      </div>
    </div>
  );
}
