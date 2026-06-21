"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Button, Input } from "@/components/ds";
import { searchProspectsAction } from "@/server/actions/prospect-search";

export interface SearchFormProps {
  query: string;
  examples: string[];
}

export function SearchForm({ query, examples }: SearchFormProps) {
  return (
    <div className="f95-stack f95-stack--sm">
      <form
        action={searchProspectsAction}
        className="f95-cluster"
        style={{ alignItems: "flex-end" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            name="q"
            defaultValue={query}
            placeholder="e.g. foundations with high capacity"
            aria-label="Search prospects"
            icon={<Search size={16} strokeWidth={1.8} />}
          />
        </div>
        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>
      <div className="f95-cluster">
        {examples.map((example) => (
          <Link
            key={example}
            href={`/95-forward/search?q=${encodeURIComponent(example)}`}
            className="f95-tag f95-tag--interactive"
            style={{ textDecoration: "none" }}
          >
            {example}
          </Link>
        ))}
      </div>
    </div>
  );
}
