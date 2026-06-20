"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { GIFT_TYPES, RECEIPT_STATUSES } from "@95forward/shared";
import { Input, Select } from "@/components/ds";
import { titleCaseFromSnake } from "@/lib/format";

export interface GiftFilterBarProps {
  funds: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  appeals: { id: string; name: string }[];
}

export function FilterBar({ funds, campaigns, appeals }: GiftFilterBarProps) {
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
      router.push(`/revenue?${next.toString()}`);
    });
  }

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    update("search", search.trim());
  }

  const typeOptions = GIFT_TYPES.map((type) => ({
    value: type,
    label: titleCaseFromSnake(type),
  }));
  const receiptOptions = RECEIPT_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));
  const fundOptions = funds.map((fund) => ({ value: fund.id, label: fund.name }));
  const campaignOptions = campaigns.map((c) => ({ value: c.id, label: c.name }));
  const appealOptions = appeals.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="f95-filterbar">
      <form className="f95-filterbar__search" onSubmit={onSearchSubmit} role="search">
        <Input
          label="Search"
          placeholder="Search by donor name"
          icon={<Search size={16} strokeWidth={1.8} />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          name="search"
        />
      </form>
      <div className="f95-filterbar__field">
        <Select
          label="Gift type"
          placeholder="All types"
          options={typeOptions}
          value={searchParams.get("gift_type") ?? ""}
          onChange={(event) => update("gift_type", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Fund"
          placeholder="All funds"
          options={fundOptions}
          value={searchParams.get("fund") ?? ""}
          onChange={(event) => update("fund", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Campaign"
          placeholder="All campaigns"
          options={campaignOptions}
          value={searchParams.get("campaign") ?? ""}
          onChange={(event) => update("campaign", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Appeal"
          placeholder="All appeals"
          options={appealOptions}
          value={searchParams.get("appeal") ?? ""}
          onChange={(event) => update("appeal", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Receipt"
          placeholder="Any status"
          options={receiptOptions}
          value={searchParams.get("receipt") ?? ""}
          onChange={(event) => update("receipt", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Input
          label="From"
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(event) => update("from", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Input
          label="To"
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(event) => update("to", event.target.value)}
        />
      </div>
    </div>
  );
}
