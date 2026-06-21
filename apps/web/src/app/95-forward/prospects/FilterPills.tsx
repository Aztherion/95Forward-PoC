"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ds";

export interface FilterPillsProps {
  rmUsers: { id: string; name: string }[];
}

const BAND_OPTIONS = [
  { value: "go", label: "90+" },
  { value: "strong", label: "70–89" },
  { value: "build", label: "50–69" },
  { value: "early", label: "Under 50" },
];

const TYPE_OPTIONS = [
  { value: "individual", label: "People" },
  { value: "organization", label: "Companies" },
  { value: "foundation", label: "Foundations" },
];

const STATUS_OPTIONS = [
  { value: "research", label: "Research" },
  { value: "cultivation", label: "Cultivation" },
  { value: "solicitation", label: "Solicitation" },
  { value: "stewardship", label: "Stewardship" },
  { value: "active", label: "Active" },
];

export function FilterPills({ rmUsers }: FilterPillsProps) {
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
      router.push(`/95-forward/prospects?${next.toString()}`);
    });
  }

  const rmOptions = [
    { value: "me", label: "Mine" },
    ...rmUsers.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <div className="f95-mpl__pills">
      <Select
        label="Relationship manager"
        placeholder="Anyone"
        options={rmOptions}
        value={searchParams.get("rm") ?? ""}
        onChange={(event) => update("rm", event.target.value)}
      />
      <Select
        label="QPI band"
        placeholder="Any score"
        options={BAND_OPTIONS}
        value={searchParams.get("band") ?? ""}
        onChange={(event) => update("band", event.target.value)}
      />
      <Select
        label="Entity type"
        placeholder="All types"
        options={TYPE_OPTIONS}
        value={searchParams.get("type") ?? ""}
        onChange={(event) => update("type", event.target.value)}
      />
      <Select
        label="Stage"
        placeholder="All stages"
        options={STATUS_OPTIONS}
        value={searchParams.get("status") ?? ""}
        onChange={(event) => update("status", event.target.value)}
      />
    </div>
  );
}
