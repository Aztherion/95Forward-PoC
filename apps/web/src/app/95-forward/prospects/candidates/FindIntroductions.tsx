"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { Button, Card, Select } from "@/components/ds";
import { findIntroductionsAction } from "@/server/actions/discovery";

interface Option {
  id: string;
  name: string;
}

export function FindIntroductions({
  connectors,
  initiatives,
  fixedInitiativeId,
  label = "Find introductions",
}: {
  connectors: Option[];
  initiatives?: Option[];
  fixedInitiativeId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        iconLeft={<Compass size={15} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
        data-testid="find-introductions"
      >
        {label}
      </Button>
    );
  }

  return (
    <Card tone="ai" accent>
      <form action={findIntroductionsAction} className="f95-inline-form">
        {fixedInitiativeId ? (
          <input type="hidden" name="fundingInitiativeId" value={fixedInitiativeId} />
        ) : (
          <Select
            name="fundingInitiativeId"
            label="Initiative"
            options={(initiatives ?? []).map((o) => ({ value: o.id, label: o.name }))}
            placeholder="Which cause are we matching affinity against?"
          />
        )}
        <Select
          name="connectorConstituentId"
          label="Connector"
          options={connectors.map((o) => ({ value: o.id, label: o.name }))}
          placeholder="Who can make the introductions?"
        />
        <div className="f95-cluster">
          <Button type="submit" variant="primary" size="sm">
            Start the search
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
