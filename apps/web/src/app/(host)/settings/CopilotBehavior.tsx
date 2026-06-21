"use client";

import { useActionState } from "react";
import type { CopilotToggles } from "@95forward/shared";
import { Button, Card, Switch } from "@/components/ds";
import { saveCopilotTogglesAction, type FormState } from "@/server/actions/settings";

interface ToggleMeta {
  name: keyof CopilotToggles;
  label: string;
  helper: string;
}

const TOGGLES: ToggleMeta[] = [
  {
    name: "research_public_sources",
    label: "Let the copilot research public sources",
    helper:
      "Allow the copilot to research public sources (990-PFs, news, public filings) to ground its suggestions.",
  },
  {
    name: "propose_qpi_updates_automatically",
    label: "Propose QPI updates automatically",
    helper: "When new evidence appears, let the copilot propose QPI changes for your review.",
  },
  {
    name: "draft_24h_followups",
    label: "Draft 24-hour follow-ups after visits",
    helper: "After a visit debrief, the copilot drafts a follow-up for you to approve.",
  },
];

const initialState: FormState = {};

export function CopilotBehavior({ initialToggles }: { initialToggles: CopilotToggles }) {
  const [state, formAction, pending] = useActionState(saveCopilotTogglesAction, initialState);

  return (
    <Card pad="lg">
      <form action={formAction} className="f95-stack">
        <div className="f95-toggles">
          {TOGGLES.map((toggle) => (
            <div
              className="f95-toggle"
              key={toggle.name}
              data-testid={`copilot-toggle-${toggle.name}`}
            >
              <div className="f95-toggle__copy">
                <span className="f95-toggle__label">{toggle.label}</span>
                <span className="f95-toggle__helper">{toggle.helper}</span>
              </div>
              <Switch
                name={toggle.name}
                defaultChecked={initialToggles[toggle.name]}
                aria-label={toggle.label}
              />
            </div>
          ))}
        </div>

        <div className="f95-cluster">
          <Button variant="primary" size="sm" type="submit" disabled={pending}>
            {pending ? "Saving" : "Save preferences"}
          </Button>
          {state.ok ? <span className="f95-settings__saved">Preferences saved.</span> : null}
        </div>
      </form>
    </Card>
  );
}
