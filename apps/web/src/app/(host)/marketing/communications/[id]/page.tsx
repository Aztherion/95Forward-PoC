import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input } from "@/components/ds";
import type { BadgeTone } from "@/components/ds";
import { getCurrentUser } from "@/lib/auth";
import { getCommunication } from "@/server/data/communications";
import { listSegments } from "@/server/data/segments";
import {
  deleteCommunicationAction,
  scheduleCommunicationAction,
  sendCommunicationAction,
  updateCommunicationAction,
} from "@/server/actions/communications";
import { formatDate, titleCaseFromSnake } from "@/lib/format";
import { timestampToScheduledDate } from "@/lib/marketing-format";
import type { RawSearchParams } from "@/lib/list-params";
import { CommunicationForm } from "../../CommunicationForm";

export const dynamic = "force-dynamic";

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "sent":
      return "success";
    case "scheduled":
      return "info";
    default:
      return "neutral";
  }
}

export default async function CommunicationRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const { schedule } = await searchParams;
  const scheduleError = schedule === "missing-date";
  const [communication, segments] = await Promise.all([
    getCommunication(user.tenantId, id),
    listSegments(user.tenantId),
  ]);
  if (!communication) notFound();

  const boundAction = updateCommunicationAction.bind(null, id);
  const scheduledValue = timestampToScheduledDate(communication.scheduledAt);

  return (
    <div className="f95-page">
      <Link href="/marketing/communications" className="f95-table__cell-link f95-cluster">
        <ArrowLeft size={15} strokeWidth={1.8} /> Communications
      </Link>

      <div className="f95-record-head">
        <div className="f95-record-head__main">
          <h1 className="f95-record-head__title">{communication.name}</h1>
          <div className="f95-record-head__meta">
            <Badge tone="neutral">{titleCaseFromSnake(communication.channel)}</Badge>
            <Badge tone={statusTone(communication.status)}>
              {titleCaseFromSnake(communication.status)}
            </Badge>
            <span>{communication.segmentName ?? "No segment"}</span>
            {communication.recipientCount !== null ? (
              <>
                <span>·</span>
                <span>
                  {communication.recipientCount === 1
                    ? "1 recipient"
                    : `${communication.recipientCount} recipients`}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="f95-record-head__actions">
          <form action={deleteCommunicationAction}>
            <input type="hidden" name="id" value={id} />
            <Button
              variant="danger"
              size="sm"
              type="submit"
              iconLeft={<Trash2 size={15} strokeWidth={1.8} />}
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card pad="lg" tone="sunk">
        <h2 className="f95-section-title">Send</h2>
        <p className="f95-field__hint" style={{ marginTop: "var(--space-2)" }}>
          Sending is simulated — no email is delivered. These actions only update the status and
          timestamps.
        </p>
        <div className="f95-cluster" style={{ marginTop: "var(--space-3)" }}>
          <form action={sendCommunicationAction}>
            <input type="hidden" name="id" value={id} />
            <Button
              type="submit"
              variant="primary"
              iconLeft={<Send size={15} strokeWidth={1.8} />}
              disabled={communication.status === "sent"}
            >
              Send now
            </Button>
          </form>
          <form action={scheduleCommunicationAction} className="f95-cluster">
            <input type="hidden" name="id" value={id} />
            <Input
              type="date"
              name="scheduledAt"
              aria-label="Schedule date"
              defaultValue={scheduledValue}
              disabled={communication.status === "sent"}
            />
            <Button type="submit" variant="secondary" disabled={communication.status === "sent"}>
              Schedule
            </Button>
          </form>
        </div>
        {scheduleError ? (
          <p className="f95-field__err" style={{ marginTop: "var(--space-2)" }}>
            Pick a date to schedule this communication.
          </p>
        ) : null}
        <p className="f95-table__muted" style={{ marginTop: "var(--space-3)" }}>
          {communication.status === "sent"
            ? `Sent ${formatDate(communication.sentAt)}`
            : communication.status === "scheduled"
              ? `Scheduled for ${formatDate(communication.scheduledAt)}`
              : "Not sent yet"}
        </p>
      </Card>

      <CommunicationForm
        action={boundAction}
        segments={segments.map((segment) => ({ id: segment.id, name: segment.name }))}
        submitLabel="Save changes"
        cancelHref="/marketing/communications"
        initial={{
          id: communication.id,
          name: communication.name,
          channel: communication.channel,
          segmentId: communication.segmentId ?? undefined,
          subject: communication.subject ?? undefined,
          body: communication.body ?? undefined,
          status: communication.status,
          scheduledAt: scheduledValue || undefined,
        }}
      />
    </div>
  );
}
