"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OPPORTUNITY_STAGES } from "@95forward/shared";
import { Select } from "@/components/ds";
import { titleCaseFromSnake } from "@/lib/format";

export interface OpportunityFilterBarProps {
  owners: { id: string; name: string }[];
}

export function OpportunityFilterBar({ owners }: OpportunityFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    startTransition(() => {
      router.push(`/major-giving/opportunities?${next.toString()}`);
    });
  }

  const stageOptions = OPPORTUNITY_STAGES.map((stage) => ({
    value: stage,
    label: titleCaseFromSnake(stage),
  }));
  const ownerOptions = owners.map((o) => ({ value: o.id, label: o.name }));

  return (
    <div className="f95-filterbar">
      <div className="f95-filterbar__field">
        <Select
          label="Stage"
          placeholder="All stages"
          options={stageOptions}
          value={searchParams.get("stage") ?? ""}
          onChange={(event) => update("stage", event.target.value)}
        />
      </div>
      <div className="f95-filterbar__field">
        <Select
          label="Owner"
          placeholder="All owners"
          options={ownerOptions}
          value={searchParams.get("owner") ?? ""}
          onChange={(event) => update("owner", event.target.value)}
        />
      </div>
    </div>
  );
}
