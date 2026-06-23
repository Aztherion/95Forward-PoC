"use client";

import { useState } from "react";
import type { ProposalRow } from "@95forward/ai";
import { Button, Card, Textarea } from "@/components/ds";
import { CopilotTrigger } from "@/components/copilot/CopilotTrigger";
import {
  runCallMemoDraftAction,
  runFollowUpDraftAction,
  saveCallMemoAction,
  markFollowUpDoneAction,
} from "@/server/actions/execution";

interface DraftPayload {
  kind?: string;
  body?: string;
}

function bodyOf(proposal: ProposalRow): string {
  const payload = proposal.payload as DraftPayload | null;
  return payload?.body ?? proposal.summary ?? "";
}

function kindOf(proposal: ProposalRow): string {
  const payload = proposal.payload as DraftPayload | null;
  return payload?.kind ?? "";
}

// The iris copilot-draft surface: a longer-form draft the user edits and then *uses* — saving a call
// memo to the visit, or "sending" a follow-up (which marks the 24-hour task done). Nothing is applied
// without the user's action; the draft itself is never written back automatically.
function DraftEditor({
  proposal,
  prospectId,
  visitId,
  followUpTaskId,
}: {
  proposal: ProposalRow;
  prospectId: string;
  visitId: string | null;
  followUpTaskId: string | null;
}) {
  const kind = kindOf(proposal);
  const isMemo = kind === "call_memo";
  const [text, setText] = useState(bodyOf(proposal));

  return (
    <Card tone="ai">
      <div className="f95-prov" data-testid={`draft-${kind}`}>
        <div className="f95-prov__top">
          <span className="f95-prov__title">
            Copilot drafted · {isMemo ? "call memo" : "24-hour follow-up"}
          </span>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          aria-label={isMemo ? "Call memo draft" : "Follow-up draft"}
        />
        <div className="f95-prov__acts">
          {isMemo && visitId ? (
            <form action={saveCallMemoAction}>
              <input type="hidden" name="prospectId" value={prospectId} />
              <input type="hidden" name="visitId" value={visitId} />
              <input type="hidden" name="callMemo" value={text} />
              <Button type="submit" variant="primary" size="sm">
                Save to the visit
              </Button>
            </form>
          ) : null}
          {!isMemo && followUpTaskId ? (
            <form action={markFollowUpDoneAction}>
              <input type="hidden" name="prospectId" value={prospectId} />
              <input type="hidden" name="followUpTaskId" value={followUpTaskId} />
              <Button type="submit" variant="primary" size="sm">
                Send (simulated)
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function CopilotDrafts({
  prospectId,
  visitId,
  followUpTaskId,
  drafts,
}: {
  prospectId: string;
  visitId: string | null;
  followUpTaskId: string | null;
  drafts: ProposalRow[];
}) {
  return (
    <Card tone="ai">
      <div className="f95-stack f95-stack--sm" data-testid="execution-copilot">
        <div className="f95-cluster">
          <h2 className="f95-section-title">From your copilot</h2>
          <span className="f95-recordbar__spacer" />
          <CopilotTrigger
            action={runCallMemoDraftAction}
            subjectId={prospectId}
            label="Draft a call memo"
          />
          <CopilotTrigger
            action={runFollowUpDraftAction}
            subjectId={prospectId}
            label="Draft the follow-up"
          />
        </div>
        {drafts.length === 0 ? (
          <span className="f95-deflist__desc--empty">
            Ask the copilot to draft a call memo or a 24-hour follow-up — you edit and use it.
          </span>
        ) : (
          drafts.map((draft) => (
            <DraftEditor
              key={draft.id}
              proposal={draft}
              prospectId={prospectId}
              visitId={visitId}
              followUpTaskId={followUpTaskId}
            />
          ))
        )}
      </div>
    </Card>
  );
}
