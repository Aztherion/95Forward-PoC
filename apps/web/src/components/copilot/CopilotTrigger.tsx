"use client";

import { useActionState, type ReactNode } from "react";
import { Sparkle } from "lucide-react";
import { Button } from "@/components/ds";
import { initialCopilotState, type CopilotActionState } from "./copilot-action-state";

export interface CopilotTriggerProps {
  action: (prev: CopilotActionState, formData: FormData) => Promise<CopilotActionState>;
  subjectId: string;
  subjectIdName?: string;
  label: string;
  pendingLabel?: string;
  icon?: ReactNode;
  testId?: string;
}

// Drives a slow copilot draft action through useActionState rather than a bare <form action>. This
// is the fix for the live-mode hang: useActionState exposes isPending (so the button shows progress
// and disables instead of the UI appearing frozen) and its returned state drives the re-render that
// applies the action's revalidatePath — so the new provisional draft surfaces without a manual
// reload. The pending state clears on both success and error; errors are surfaced, not swallowed.
export function CopilotTrigger({
  action,
  subjectId,
  subjectIdName = "prospectId",
  label,
  pendingLabel = "Working…",
  icon = <Sparkle size={15} strokeWidth={1.8} />,
  testId,
}: CopilotTriggerProps) {
  const [state, formAction, isPending] = useActionState(action, initialCopilotState);

  return (
    <form action={formAction} data-testid={testId}>
      <input type="hidden" name={subjectIdName} value={subjectId} />
      <Button type="submit" variant="secondary" size="sm" disabled={isPending} iconLeft={icon}>
        {isPending ? pendingLabel : label}
      </Button>
      {state.error ? (
        <span className="f95-field__error" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
