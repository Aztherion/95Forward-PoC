import type { RuleChangeRow } from "@95forward/db";
import { Card, EmptyState } from "@/components/ds";

function describe(value: unknown): string {
  if (value === null || value === undefined) return "the default";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "on" : "off";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "nothing";
    return entries.map(([key, v]) => `${key} = ${String(v)}`).join(", ");
  }
  return String(value);
}

const FIELD_LABELS: Record<string, string> = {
  enabled: "switched",
  statement: "reworded",
  parameters: "retuned",
  reset: "reset to default",
  "goal-order": "goals reordered",
  proposal: "rule proposed",
};

export function ChangeTrail({ changes }: { changes: readonly RuleChangeRow[] }) {
  if (changes.length === 0) {
    return (
      <Card pad="lg">
        <EmptyState
          title="Nothing has been changed yet"
          line="Every rule is still set the way it shipped."
        />
      </Card>
    );
  }

  return (
    <Card pad="none">
      <ul className="f95-trail" data-testid="rules-change-trail">
        {changes.map((change) => (
          <li className="f95-trail__row" key={change.id}>
            <div className="f95-trail__main">
              <code className="f95-rule__id">{change.ruleId}</code>{" "}
              <span className="f95-trail__field">
                {FIELD_LABELS[change.field] ?? change.field}
              </span>
            </div>
            <div className="f95-trail__delta">
              {describe(change.before)} &rarr; {describe(change.after)}
            </div>
            <div className="f95-trail__who">
              {change.actorName ?? "Someone"} ·{" "}
              {change.changedAt.toISOString().slice(0, 10)}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
