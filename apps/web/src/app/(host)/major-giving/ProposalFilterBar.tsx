"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROPOSAL_STATUSES } from "@95forward/shared";
import { Select } from "@/components/ds";
import { titleCaseFromSnake } from "@/lib/format";

export function ProposalFilterBar() {
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
      router.push(`/major-giving/proposals?${next.toString()}`);
    });
  }

  const statusOptions = PROPOSAL_STATUSES.map((status) => ({
    value: status,
    label: titleCaseFromSnake(status),
  }));

  return (
    <div className="f95-filterbar">
      <div className="f95-filterbar__field">
        <Select
          label="Status"
          placeholder="All statuses"
          options={statusOptions}
          value={searchParams.get("status") ?? ""}
          onChange={(event) => update("status", event.target.value)}
        />
      </div>
    </div>
  );
}
