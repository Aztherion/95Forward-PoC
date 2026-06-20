"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ds";

export interface PortfolioOfficerPickerProps {
  owners: { id: string; name: string }[];
  selectedId: string;
}

export function PortfolioOfficerPicker({ owners, selectedId }: PortfolioOfficerPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set("owner", value);
    } else {
      next.delete("owner");
    }
    startTransition(() => {
      router.push(`/major-giving/portfolio?${next.toString()}`);
    });
  }

  const ownerOptions = owners.map((o) => ({ value: o.id, label: o.name }));

  return (
    <div className="f95-filterbar">
      <div className="f95-filterbar__field">
        <Select
          label="Gift officer"
          options={ownerOptions}
          value={selectedId}
          onChange={(event) => update(event.target.value)}
        />
      </div>
    </div>
  );
}
