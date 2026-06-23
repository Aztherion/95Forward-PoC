"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Input } from "@/components/ds";

export interface SearchFormProps {
  query: string;
  examples: string[];
}

function searchHref(q: string): string {
  return `/95-forward/search?q=${encodeURIComponent(q)}`;
}

// Both search paths — the form submit and the suggestion chips — navigate within the same
// /95-forward/search segment (only ?q= changes), which does not reliably remount the route-level
// loading.tsx Suspense fallback. So drive every navigation through one useTransition: isPending gives
// a guaranteed pending state on EVERY trigger (chips included), the same latency-UX guarantee the
// copilot-hang fix added. The <form> stays for progressive enhancement / keyboard submit.
export function SearchForm({ query, examples }: SearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(query);

  function go(q: string): void {
    const trimmed = q.trim();
    startTransition(() => {
      router.push(trimmed.length > 0 ? searchHref(trimmed) : "/95-forward/search");
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    go(value);
  }

  return (
    <div className="f95-stack f95-stack--sm">
      <form onSubmit={onSubmit} className="f95-cluster" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. foundations with high capacity"
            aria-label="Search prospects"
            icon={<Search size={16} strokeWidth={1.8} />}
          />
        </div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Searching…" : "Search"}
        </Button>
      </form>
      <div className="f95-cluster">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="f95-tag f95-tag--interactive"
            onClick={() => go(example)}
            disabled={isPending}
          >
            {example}
          </button>
        ))}
      </div>
      {isPending ? (
        <div className="f95-cluster" role="status" aria-live="polite" data-testid="search-pending">
          <Search size={15} strokeWidth={1.8} aria-hidden />
          <span className="f95-page__count">Reading your search…</span>
        </div>
      ) : null}
    </div>
  );
}
