"use client";

import { useActionState, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { QpiResult } from "@95forward/shared";
import { Button, Card, Checkbox, FormRow, Input, Select, Textarea } from "@/components/ds";
import { overrideQpiAction, type FormState } from "@/server/actions/prospects";

const DIMENSION_LABELS: Record<string, string> = {
  capacity: "Capacity",
  relationship: "Relationship",
  timing: "Timing",
  gift_history: "Gift history",
  philanthropy: "Philanthropy",
};

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} of 5`,
}));

const initialState: FormState = {};

export function AdjustScore({ prospectId, result }: { prospectId: string; result: QpiResult }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(overrideQpiAction, initialState);
  const [unknown, setUnknown] = useState(false);

  const errors = state.fieldErrors ?? {};
  const dimensionOptions = result.dimensions.map((dim) => ({
    value: dim.dimension,
    label: DIMENSION_LABELS[dim.dimension] ?? dim.dimension,
  }));

  if (state.ok && open) {
    setOpen(false);
    setUnknown(false);
  }

  return (
    <div className="f95-stack f95-stack--sm">
      <div className="f95-cluster">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<SlidersHorizontal size={15} strokeWidth={1.8} />}
          onClick={() => setOpen((value) => !value)}
        >
          Adjust the score
        </Button>
        <span className="f95-deflist__desc--empty">
          You decide — set a rating, or mark a part still unknown.
        </span>
      </div>

      {open ? (
        <Card>
          <form action={formAction} className="f95-inline-form">
            <input type="hidden" name="prospectId" value={prospectId} />
            <FormRow columns={2}>
              <Select
                name="dimension"
                label="Which part"
                options={dimensionOptions}
                error={errors.dimension}
              />
              <Select
                name="rating"
                label="Rating"
                placeholder="Pick a rating"
                options={RATING_OPTIONS}
                disabled={unknown}
                error={errors.rating}
              />
            </FormRow>
            <Checkbox
              name="isUnknown"
              label="Mark this part unknown — worth researching"
              checked={unknown}
              onChange={(event) => setUnknown(event.currentTarget.checked)}
            />
            <Textarea
              name="rationale"
              label="Why"
              optional
              placeholder="One human line — what the evidence says"
              error={errors.rationale}
            />
            <Input
              name="source"
              label="Source"
              optional
              placeholder="e.g. IRS 990-PF · 2024, or Logged · Dana R."
              error={errors.source}
            />
            <div className="f95-cluster">
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Saving" : "Save the rating"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setUnknown(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
