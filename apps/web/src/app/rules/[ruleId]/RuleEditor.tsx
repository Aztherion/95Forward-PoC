"use client";

import { useActionState, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { ParameterSpec, ResolvedEntry } from "@95forward/shared";
import { Badge, Button, Card, Checkbox, Input, Select, Switch, Textarea } from "@/components/ds";
import {
  resetRuleAction,
  saveRuleAction,
  toggleRuleAction,
  type RulesFormState,
} from "@/server/actions/rules";

const initialState: RulesFormState = {};

function ParameterField({
  spec,
  value,
  changed,
  error,
}: {
  spec: ParameterSpec;
  value: number | string | readonly string[];
  changed: boolean;
  error?: string;
}) {
  const name = `param.${spec.key}`;
  const label = `${spec.label}${spec.unit ? ` (${spec.unit})` : ""}`;

  if (spec.type === "enum") {
    return (
      <div className="f95-param" data-testid={`param-${spec.key}`}>
        <Select
          name={name}
          label={label}
          hint={spec.description}
          error={error}
          defaultValue={String(value)}
          options={(spec.options ?? []).map((option) => ({
            value: option,
            label: option.replace(/_/g, " "),
          }))}
        />
        {changed ? <Badge tone="info">Changed</Badge> : null}
      </div>
    );
  }

  if (spec.type === "enum-list") {
    const selected = new Set((value as readonly string[]).map(String));
    return (
      <div className="f95-param f95-param--list" data-testid={`param-${spec.key}`}>
        <span className="f95-param__label">{label}</span>
        {spec.description ? <p className="f95-param__hint">{spec.description}</p> : null}
        <div className="f95-param__options">
          {(spec.options ?? []).map((option) => (
            <Checkbox
              key={option}
              name={name}
              value={option}
              label={option.replace(/_/g, " ")}
              defaultChecked={selected.has(option)}
            />
          ))}
        </div>
        {error ? <p className="f95-settings__error">{error}</p> : null}
        {changed ? <Badge tone="info">Changed</Badge> : null}
      </div>
    );
  }

  return (
    <div className="f95-param" data-testid={`param-${spec.key}`}>
      <Input
        name={name}
        type="number"
        label={label}
        // The bounds are advisory in the browser and enforced on the server, which REJECTS rather
        // than clamps: a typed-over value that is out of range comes back as an error on this
        // field, not as a silently corrected number.
        min={spec.min}
        max={spec.max}
        step={spec.step}
        hint={spec.description}
        error={error}
        defaultValue={String(value)}
      />
      {changed ? <Badge tone="info">Changed</Badge> : null}
    </div>
  );
}

export function RuleEditor({ entry }: { entry: ResolvedEntry }) {
  const [saveState, saveAction, saving] = useActionState(saveRuleAction, initialState);
  const [, toggleAction] = useActionState(toggleRuleAction, initialState);
  const [, resetAction, resetting] = useActionState(resetRuleAction, initialState);
  const [enabled, setEnabled] = useState(entry.enabled);

  const changed =
    entry.statementOverridden || entry.enabledOverridden || entry.changedParameterKeys.length > 0;

  return (
    <Card pad="lg">
      <div className="f95-stack">
        <div className="f95-settings__intro">
          {changed ? (
            <Badge tone="info" data-testid="rule-changed-banner">
              Changed from what shipped
            </Badge>
          ) : (
            <Badge tone="neutral">As it shipped</Badge>
          )}
        </div>

        {/* noValidate: the SERVER decides what is legal, and says so in this design system's own
            voice rather than in a browser-chrome bubble. The min/max/step below stay for the
            spinner affordance, but a value that gets past them must still come back as a field
            error here — otherwise the only thing standing between an org and a coverage multiple of
            zero is a tooltip. */}
        <form action={saveAction} className="f95-stack" data-testid="rule-form" noValidate>
          <input type="hidden" name="ruleId" value={entry.id} />

          {/* The statement is the biggest thing on the page because it is the thing that is
              actually the doctrine. The parameters below only tune what it already says. */}
          <Textarea
            name="statement"
            label="How this reads"
            rows={3}
            defaultValue={entry.statement}
            hint="Say it the way your team says it. The wording is yours; the behaviour is not."
            error={saveState.fieldErrors?.["statement"]}
            className="f95-rule__statement-input"
            data-testid="rule-statement"
          />

          {entry.parameters.length > 0 ? (
            <div className="f95-params">
              {entry.parameters.map((spec) => (
                <ParameterField
                  key={spec.key}
                  spec={spec}
                  value={entry.values[spec.key] ?? spec.defaultValue}
                  changed={entry.changedParameterKeys.includes(spec.key)}
                  error={saveState.fieldErrors?.[spec.key]}
                />
              ))}
            </div>
          ) : null}

          {saveState.error && !saveState.fieldErrors ? (
            <p className="f95-settings__error">{saveState.error}</p>
          ) : null}
          {saveState.ok ? <p className="f95-settings__note">Saved.</p> : null}

          <div className="f95-settings__actions">
            <Button type="submit" disabled={saving} data-testid="rule-save">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>

        {entry.kind === "rule" ? (
          <form action={toggleAction} className="f95-settings__inline" data-testid="rule-toggle">
            <input type="hidden" name="ruleId" value={entry.id} />
            <input type="hidden" name="enabled" value={String(!enabled)} />
            <Switch
              checked={enabled}
              label={enabled ? "Running" : "Switched off"}
              onChange={(event) => {
                setEnabled(event.currentTarget.checked);
                event.currentTarget.form?.requestSubmit();
              }}
            />
            <span className="f95-settings__note">
              A rule that is off stops producing findings anywhere &mdash; and the time-to-clear
              total drops with it.
            </span>
          </form>
        ) : null}

        <form action={resetAction} className="f95-settings__inline">
          <input type="hidden" name="ruleId" value={entry.id} />
          <Button
            type="submit"
            variant="ghost"
            disabled={!changed || resetting}
            iconLeft={<RotateCcw size={16} strokeWidth={1.8} />}
            data-testid="rule-reset"
          >
            Reset to what shipped
          </Button>
        </form>
      </div>
    </Card>
  );
}
