"use client";

import { ForecastChart, type ForecastPoint } from "@/components/forecast";
import { formatCurrencyFromCents } from "@/lib/format";
import type { WhatIfResultView } from "@/server/data/what-if";
import { deltaText, deltaTone, type Preset, type PresetId } from "./what-if-copy";

export interface WhatIfPanelProps {
  readonly result: WhatIfResultView | null;
  readonly computing: boolean;
  readonly error: string | null;
  readonly changedCount: number;
  readonly presets: readonly Preset[];
  readonly onPreset: (id: PresetId) => void;
}

/**
 * The hypothesis, shown: the curve with the baseline ghosted behind it, and the headline metrics
 * before and after.
 *
 * The two lines together are the entire visual argument. A what-if curve on its own is a forecast
 * — indistinguishable from the real one and therefore dangerous. Beside its baseline it is
 * obviously a comparison, which is what it actually is.
 */
export function WhatIfPanel({
  result,
  computing,
  error,
  changedCount,
  presets,
  onPreset,
}: WhatIfPanelProps) {
  const points: ForecastPoint[] =
    result?.points.map((p) => ({
      date: p.date,
      actualCents: p.actualCents,
      mostLikelyCents: p.mostLikelyCents,
      bestCents: p.bestCents,
      worstCents: p.worstCents,
      baselineMostLikelyCents: p.baselineMostLikelyCents,
    })) ?? [];

  return (
    <section className="f95-wipanel" data-testid="whatif-panel" aria-label="What if">
      <div className="f95-wipanel__presets" data-testid="whatif-presets">
        <span className="f95-wipanel__presetlabel">Try</span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="f95-wipanel__preset"
            onClick={() => onPreset(preset.id)}
            title={preset.detail}
            data-testid={`whatif-preset-${preset.id}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="f95-wipanel__error" role="alert" data-testid="whatif-error">
          {error}
        </p>
      ) : null}

      <div className="f95-wipanel__body">
        <div className="f95-wipanel__chart">
          <ForecastChart
            points={points}
            goalCents={result?.goalCents ?? null}
            todayIso={result?.todayIso ?? new Date().toISOString().slice(0, 10)}
            height={220}
            ariaLabel={
              changedCount === 0
                ? "Cumulative forecast, no changes pending."
                : `Cumulative forecast under ${changedCount} hypothetical changes, with today's baseline ghosted behind it.`
            }
          />
          {/* Marked on the chart itself, so a screenshot cropped to the plot still reads as
              hypothetical. */}
          <span className="f95-wipanel__stamp" aria-hidden="true">
            WHAT IF · NOT REAL
          </span>
        </div>

        <div className="f95-wipanel__metrics" data-testid="whatif-metrics">
          {result === null ? (
            <p className="f95-wipanel__pending">Working out what that does…</p>
          ) : (
            result.metrics.map((row) => {
              const isRatio = row.kind === "ratio";
              const before = isRatio
                ? row.baselineRatio === null || row.baselineRatio === undefined
                  ? "—"
                  : `${row.baselineRatio.toFixed(2)}×`
                : row.baselineCents === null
                  ? "—"
                  : formatCurrencyFromCents(row.baselineCents);
              const after = isRatio
                ? row.whatIfRatio === null || row.whatIfRatio === undefined
                  ? "—"
                  : `${row.whatIfRatio.toFixed(2)}×`
                : row.whatIfCents === null
                  ? "—"
                  : formatCurrencyFromCents(row.whatIfCents);
              const moved = before !== after;
              return (
                <div className="f95-wimetric" key={row.label} data-testid="whatif-metric">
                  <div className="f95-wimetric__label">{row.label}</div>
                  <div className="f95-wimetric__pair">
                    <span className="f95-wimetric__was" title="What the record says today">
                      {before}
                    </span>
                    <span className="f95-wimetric__arrow" aria-hidden="true">
                      →
                    </span>
                    <span
                      className={`f95-wimetric__now${moved ? " is-moved" : ""}`}
                      data-testid="whatif-metric-value"
                    >
                      {after}
                    </span>
                  </div>
                  {row.kind === "money" ? (
                    <div
                      className={`f95-wimetric__delta is-${deltaTone(row.deltaCents)}`}
                      data-testid="whatif-metric-delta"
                    >
                      {deltaText(row.deltaCents, formatCurrencyFromCents)}
                    </div>
                  ) : (
                    <div className="f95-wimetric__delta is-flat">&nbsp;</div>
                  )}
                </div>
              );
            })
          )}

          {result !== null && !result.goalDefined ? (
            // The no-goal path is real and must degrade rather than break. I19 forbids falling
            // back to a parent goal, for the same reason the Forecast Room does not: a silently
            // wrong ratio is worse than an absent one.
            <p className="f95-wipanel__nogoal" data-testid="whatif-no-goal">
              No goal defined for this view, so there is no coverage or gap to move.
            </p>
          ) : null}

          {computing ? (
            <span className="f95-wipanel__working" data-testid="whatif-computing">
              Recomputing…
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
