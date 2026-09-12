"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { RuleGoalRow } from "@95forward/db";
import { Button, Card, Input } from "@/components/ds";
import {
  addGoalAction,
  removeGoalAction,
  reorderGoalsAction,
  type RulesFormState,
} from "@/server/actions/rules";

const initialState: RulesFormState = {};

/**
 * The goals, in priority order.
 *
 * The ORDER is the content. I23 ranks work against the top goal, so "by end of year" sitting above
 * "next quarter" is what decides whether a January opportunity is worth a rep's Tuesday. Moving a
 * row is therefore an edit to how the product behaves, not a display preference — which is why it
 * is versioned and audited like any other rule change.
 */
export function GoalsEditor({ goals }: { goals: readonly RuleGoalRow[] }) {
  const [order, setOrder] = useState<RuleGoalRow[]>([...goals]);
  const [saveState, saveAction, saving] = useActionState(reorderGoalsAction, initialState);
  const [, addAction, adding] = useActionState(addGoalAction, initialState);
  const [, removeAction] = useActionState(removeGoalAction, initialState);

  function move(index: number, delta: number) {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return next;
    });
  }

  const dirty = order.map((g) => g.id).join(",") !== goals.map((g) => g.id).join(",");

  return (
    <section className="f95-settings__section" data-testid="rules-goals">
      <header className="f95-settings__head">
        <div className="f95-page__eyebrow">95 Forward · goals</div>
        <h2 className="f95-settings__title">What we are trying to do, in order</h2>
        <p className="f95-settings__sub">
          The order matters. When two things both need doing, the one that serves the goal nearer
          the top wins.
        </p>
      </header>

      <Card pad="lg">
        <form action={saveAction} className="f95-stack">
          <ol className="f95-goals" data-testid="rules-goals-list">
            {order.map((goal, index) => (
              <li className="f95-goals__row" key={goal.id} data-testid={`goal-${goal.id}`}>
                <span className="f95-goals__rank">{index + 1}</span>
                <span className="f95-goals__statement">{goal.statement}</span>
                <input type="hidden" name="goalId" value={goal.id} />
                <div className="f95-goals__controls">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Move "${goal.statement}" up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    data-testid={`goal-up-${goal.id}`}
                  >
                    <ArrowUp size={14} strokeWidth={1.8} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Move "${goal.statement}" down`}
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                    data-testid={`goal-down-${goal.id}`}
                  >
                    <ArrowDown size={14} strokeWidth={1.8} />
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          {saveState.error ? <p className="f95-settings__error">{saveState.error}</p> : null}

          <div className="f95-settings__actions">
            <Button type="submit" disabled={!dirty || saving} data-testid="goals-save">
              {saving ? "Saving…" : "Save this order"}
            </Button>
          </div>
        </form>
      </Card>

      <Card pad="lg">
        <form action={addAction} className="f95-settings__inline">
          <Input
            name="statement"
            label="Add a goal"
            placeholder="Retain every donor who gave last year"
            data-testid="goal-add-input"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={adding}
            iconLeft={<Plus size={16} strokeWidth={1.8} />}
            data-testid="goal-add-submit"
          >
            Add
          </Button>
        </form>
        {goals.length > 0 ? (
          <form action={removeAction} className="f95-settings__inline">
            <select name="goalId" className="f95-select" aria-label="Goal to remove">
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.statement}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="ghost"
              iconLeft={<Trash2 size={16} strokeWidth={1.8} />}
              data-testid="goal-remove-submit"
            >
              Remove
            </Button>
          </form>
        ) : null}
      </Card>
    </section>
  );
}
