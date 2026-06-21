"use client";

import { useActionState, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  QPI_DEFAULT_WEIGHTS,
  QPI_DIMENSIONS,
  QPI_MAX_RATING,
  weightsPointsTotal,
  weightsSumTo100,
  type QpiDimension,
  type QpiWeights,
} from "@95forward/shared";
import { Badge, Button, Card } from "@/components/ds";
import { saveQpiWeightsAction, type FormState } from "@/server/actions/settings";

interface DimensionMeta {
  label: string;
  varName: string;
  blurb: string;
}

const DIMENSION_META: Record<QpiDimension, DimensionMeta> = {
  capacity: { label: "Capacity", varName: "--qpi-capacity", blurb: "Ability to give at scale." },
  relationship: {
    label: "Relationship",
    varName: "--qpi-relationship",
    blurb: "Depth of the warm path.",
  },
  timing: { label: "Timing", varName: "--qpi-timing", blurb: "Readiness to act now." },
  gift_history: {
    label: "Gift history",
    varName: "--qpi-history",
    blurb: "Track record of giving.",
  },
  philanthropy: {
    label: "Philanthropy",
    varName: "--qpi-philanthropy",
    blurb: "Affinity for the mission.",
  },
};

const WEIGHT_MIN = 1;
const WEIGHT_MAX = 20;

const initialState: FormState = {};

export function QpiWeightsEditor({ initialWeights }: { initialWeights: QpiWeights }) {
  const [weights, setWeights] = useState<QpiWeights>(initialWeights);
  const [state, formAction, pending] = useActionState(saveQpiWeightsAction, initialState);

  const pointsTotal = weightsPointsTotal(weights);
  const valid = weightsSumTo100(weights);

  function step(dimension: QpiDimension, delta: number) {
    setWeights((prev) => {
      const next = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, prev[dimension] + delta));
      return { ...prev, [dimension]: next };
    });
  }

  function reset() {
    setWeights({ ...QPI_DEFAULT_WEIGHTS });
  }

  return (
    <Card pad="lg">
      <form action={formAction} className="f95-stack" data-testid="qpi-weights">
        <div className="f95-settings__intro">
          <p className="f95-settings__lede">
            The QPI scores every prospect out of 100. Each dimension is a 1&ndash;5 rating times the
            weight you set here &mdash; so the weights decide how much each part can move the score.
            Tune them and every prospect re-scores.
          </p>
        </div>

        <div className="f95-weights">
          {QPI_DIMENSIONS.map((dimension) => {
            const meta = DIMENSION_META[dimension];
            const weight = weights[dimension];
            const maxPoints = weight * QPI_MAX_RATING;
            const color = `var(${meta.varName})`;
            return (
              <div className="f95-weight" key={dimension} data-testid={`qpi-weight-${dimension}`}>
                <span className="f95-weight__dot" style={{ background: color }} />
                <div className="f95-weight__label">
                  <span className="f95-weight__name">{meta.label}</span>
                  <span className="f95-weight__blurb">{meta.blurb}</span>
                </div>
                <div className="f95-weight__stepper">
                  <button
                    type="button"
                    className="f95-stepper__btn"
                    onClick={() => step(dimension, -1)}
                    disabled={weight <= WEIGHT_MIN || pending}
                    aria-label={`Lower ${meta.label} weight`}
                  >
                    <Minus size={15} strokeWidth={1.8} />
                  </button>
                  <span className="f95-stepper__value" data-testid="qpi-weight-value">
                    {weight}
                  </span>
                  <button
                    type="button"
                    className="f95-stepper__btn"
                    onClick={() => step(dimension, 1)}
                    disabled={weight >= WEIGHT_MAX || pending}
                    aria-label={`Raise ${meta.label} weight`}
                  >
                    <Plus size={15} strokeWidth={1.8} />
                  </button>
                </div>
                <div className="f95-weight__points">
                  <span className="f95-weight__max" data-testid="qpi-weight-max">
                    {maxPoints} pts max
                  </span>
                </div>
                <input type="hidden" name={dimension} value={weight} />
              </div>
            );
          })}
        </div>

        <div className="f95-weights__footer">
          <Badge tone={valid ? "success" : "attention"} dot>
            <span data-testid="qpi-weights-sum">Points sum to {pointsTotal} / 100</span>
          </Badge>
          {state.fieldErrors?.capacity ? (
            <span className="f95-field__err">{state.fieldErrors.capacity}</span>
          ) : null}
          <span className="f95-weights__spacer" />
          {state.ok ? <span className="f95-settings__saved">Weights saved.</span> : null}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={reset}
            disabled={pending}
            iconLeft={<RotateCcw size={15} strokeWidth={1.8} />}
          >
            Reset to defaults
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={!valid || pending}>
            {pending ? "Saving" : "Save weights"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
