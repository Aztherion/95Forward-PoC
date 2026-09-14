"use client";

import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrencyAbbreviatedFromCents,
  formatCurrencySeriesAbbreviatedFromCents,
} from "@/lib/format";
import { readChartTokens, type ChartTokens } from "./chart-tokens";

export interface ForecastPoint {
  /** Calendar day, `YYYY-MM-DD`. Ordered, ascending. */
  date: string;
  /** Cumulative actual to date, in cents. Null after today — actuals are solid to date only. */
  actualCents?: number | null;
  /** Cumulative simulated totals, in cents. Null before today — the band is forward-looking. */
  mostLikelyCents?: number | null;
  bestCents?: number | null;
  worstCents?: number | null;
  /**
   * The baseline's most-likely, ghosted behind the live one (I31).
   *
   * Only the what-if sandbox supplies it. Two lines together are the whole visual argument there:
   * without the baseline you can see a curve but not what your change did to it.
   */
  baselineMostLikelyCents?: number | null;
}

export interface ForecastChartProps {
  points: readonly ForecastPoint[];
  /** The goal to draw the dashed line at, in cents. Null draws no line — see below. */
  goalCents?: number | null;
  /** `YYYY-MM-DD`. The vertical divider between what happened and what might. */
  todayIso: string;
  /** Plot height in px. The frame reserves this before the plot mounts, so nothing shifts. */
  height?: number;
  /** Required. An SVG chart is silent without one; `.f95-bars` sets the precedent at all 4 sites. */
  ariaLabel: string;
}

interface Row {
  t: number;
  actual: number | null;
  mostLikely: number | null;
  baseline: number | null;
  band: [number, number] | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * `2026-09-12` → a UTC timestamp, parsed as text.
 *
 * The x axis is numeric rather than categorical so the "today" divider lands on the actual day.
 * With a category axis a ReferenceLine has to match an existing category exactly, so a divider on
 * the 12th against monthly points would silently snap to the 1st — or vanish.
 *
 * The columns behind this are Postgres `date`: calendar days with no zone. `new Date(iso)` would
 * introduce one, so the parts are read out and handed to Date.UTC.
 */
function toTime(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

function monthTick(time: number): string {
  return MONTHS[new Date(time).getUTCMonth()] ?? "";
}

/** One tick per month present in the data, so the axis reads Jan–Dec however dense the points are. */
function monthTicks(rows: readonly Row[]): number[] {
  const seen = new Set<string>();
  const ticks: number[] = [];
  for (const row of rows) {
    const date = new Date(row.t);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ticks.push(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  return ticks;
}

function lastDefined(points: readonly ForecastPoint[], key: keyof ForecastPoint): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i]![key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * The BMW cumulative forecast — the one chart in the product.
 *
 * A deliberate exception: `apps/web` had no charting dependency at all, and every "chart" in the
 * app was CSS div bars with no axes, no time dimension and no band. This wraps Recharts so that
 * nothing else in the app imports it, which keeps the exception to one file and means a different
 * library later is one rewrite rather than forty.
 *
 * It is one shape on purpose. "There should be one graph to rule them all" is a stakeholder
 * position, so a general charting abstraction here would be building for a second chart that is
 * explicitly not coming — `docs/design/SCREENS.md` defers alternative chart types.
 *
 * Colours come from `readChartTokens()`, never from literals. Until they arrive the frame renders
 * at full height without the plot: a forecast drawn in browser defaults is worse than one that is
 * a frame late, and reserving the height means nothing moves when it lands.
 */
export function ForecastChart({
  points,
  goalCents = null,
  todayIso,
  height = 280,
  ariaLabel,
}: ForecastChartProps) {
  const [tokens, setTokens] = useState<ChartTokens | null>(null);

  // Recharts measures the DOM, and the tokens live in a stylesheet, so both are client-only.
  useEffect(() => setTokens(readChartTokens()), []);

  const rows: Row[] = points.map((point) => ({
    t: toTime(point.date),
    actual: point.actualCents ?? null,
    mostLikely: point.mostLikelyCents ?? null,
    baseline: point.baselineMostLikelyCents ?? null,
    band:
      typeof point.worstCents === "number" && typeof point.bestCents === "number"
        ? [point.worstCents, point.bestCents]
        : null,
  }));

  const hasBaseline = points.some(
    (p) =>
      typeof p.baselineMostLikelyCents === "number" && Number.isFinite(p.baselineMostLikelyCents),
  );
  const best = lastDefined(points, "bestCents");
  const mostLikely = lastDefined(points, "mostLikelyCents");
  const worst = lastDefined(points, "worstCents");
  const lastTime = rows.length > 0 ? rows[rows.length - 1]!.t : null;

  // One formatting pass over the three end labels together. Formatted separately, Best $2,084,000
  // and Most likely $2,076,000 both render "$2.08M" and the chart asserts a band whose ends are
  // equal — the labels would contradict the line they sit on.
  const [bestText, mostLikelyText, worstText] = formatCurrencySeriesAbbreviatedFromCents([
    best,
    mostLikely,
    worst,
  ]);

  const candidateLabels: { key: string; value: number; text: string; strong: boolean }[] = [];
  if (best !== null)
    candidateLabels.push({ key: "best", value: best, text: `BEST ${bestText}`, strong: false });
  if (mostLikely !== null)
    candidateLabels.push({
      key: "most-likely",
      value: mostLikely,
      text: `MOST LIKELY ${mostLikelyText}`,
      strong: true,
    });
  if (worst !== null)
    candidateLabels.push({ key: "worst", value: worst, text: `WORST ${worstText}`, strong: false });

  /**
   * Drop an end label that would sit on top of another one.
   *
   * The y-domain stretches to include the goal, so when the band is small relative to the goal
   * the three labels compress into the same few pixels and overprint each other. I31 made this
   * routine rather than rare: a what-if that slips everything a quarter collapses the band to a
   * fraction of the goal, and BEST/MOST LIKELY/WORST landed in a single illegible smear at the
   * exact moment the chart most needed to be read.
   *
   * Most likely always survives — it is the line the eye follows and the one the metric panel
   * quotes.
   */
  const domainTop = Math.max(
    goalCents === null ? 0 : goalCents * 1.04,
    ...points.map((p) =>
      Math.max(p.bestCents ?? 0, p.actualCents ?? 0, p.baselineMostLikelyCents ?? 0),
    ),
    1,
  );
  const MIN_LABEL_GAP_PX = 15;
  const placed: number[] = [];
  const endLabels = candidateLabels
    .slice()
    .sort((a, b) => Number(b.strong) - Number(a.strong))
    .filter((label) => {
      const y = (label.value / domainTop) * height;
      if (placed.some((other) => Math.abs(other - y) < MIN_LABEL_GAP_PX)) return false;
      placed.push(y);
      return true;
    });

  const legend = (
    <div className="f95-forecast__legend">
      <span className="f95-forecast__key">
        <span
          className="f95-forecast__swatch"
          style={{ background: "var(--text-strong)" }}
          aria-hidden
        />
        Actual
      </span>
      <span className="f95-forecast__key">
        <span
          className="f95-forecast__swatch"
          style={{ background: "var(--ai-ink)" }}
          aria-hidden
        />
        Most likely
      </span>
      <span className="f95-forecast__key">
        <span
          className="f95-forecast__swatch f95-forecast__swatch--band"
          style={{ background: "var(--ai-tint)", border: "1px solid var(--ai-border)" }}
          aria-hidden
        />
        Best–Worst
      </span>
      <span className="f95-forecast__key">
        <span className="f95-forecast__swatch f95-forecast__swatch--goal" aria-hidden />
        Goal
      </span>
      {hasBaseline ? (
        <span className="f95-forecast__key" data-testid="legend-baseline">
          <span className="f95-forecast__swatch f95-forecast__swatch--baseline" aria-hidden />
          Baseline (today)
        </span>
      ) : null}
    </div>
  );

  if (tokens === null || rows.length === 0) {
    return (
      <div className="f95-forecast" data-testid="forecast-chart">
        <div
          className="f95-forecast__plot f95-forecast__empty"
          style={{ height }}
          role="img"
          aria-label={ariaLabel}
        >
          {rows.length === 0 ? "No forecast for this view yet." : ""}
        </div>
        {legend}
      </div>
    );
  }

  return (
    <div className="f95-forecast" data-testid="forecast-chart">
      <div className="f95-forecast__plot" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={rows} margin={{ top: 16, right: 124, bottom: 4, left: 8 }}>
            <CartesianGrid stroke={tokens.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={monthTicks(rows)}
              tickFormatter={monthTick}
              minTickGap={16}
              tick={{ fill: tokens.axis, fontSize: 11 }}
              stroke={tokens.grid}
              tickLine={false}
            />
            {/* The domain INCLUDES the goal. Recharts scales to the data, and a goal above the
                best case would fall outside it and be clipped — silently removing the one line the
                whole chart is a comparison against. I27 found this with a rep-scoped goal of
                $2.70M against a $1.72M best case: the legend said "Goal" and the plot had none. */}
            <YAxis
              tickFormatter={(value: number) => formatCurrencyAbbreviatedFromCents(value)}
              domain={[
                0,
                (dataMax: number) =>
                  goalCents === null ? dataMax : Math.max(dataMax, goalCents * 1.04),
              ]}
              tick={{ fill: tokens.axis, fontSize: 11 }}
              stroke={tokens.grid}
              tickLine={false}
              width={64}
            />

            {/* The band first, so both lines draw over it. */}
            <Area
              dataKey="band"
              stroke={tokens.bandStroke}
              strokeWidth={1}
              fill={tokens.band}
              fillOpacity={1}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            {/* The baseline ghost, under everything: dashed, thin, muted. It is a reference, not
                a second forecast, and it must never compete with the line it is there to explain. */}
            {hasBaseline ? (
              <Line
                dataKey="baseline"
                stroke={tokens.label}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null}
            <Line
              dataKey="mostLikely"
              stroke={tokens.mostLikely}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="actual"
              stroke={tokens.actual}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Today — where what happened stops and what might begin. */}
            <ReferenceLine x={toTime(todayIso)} stroke={tokens.today} strokeWidth={1} />

            {goalCents !== null ? (
              <ReferenceLine y={goalCents} stroke={tokens.goal} strokeDasharray="5 4">
                <Label
                  value={`GOAL ${formatCurrencyAbbreviatedFromCents(goalCents, { unit: "exact" })}`}
                  position="insideTopRight"
                  fill={tokens.labelStrong}
                  fontSize={11}
                  offset={8}
                />
              </ReferenceLine>
            ) : null}

            {lastTime !== null
              ? endLabels.map((label) => (
                  <ReferenceDot
                    key={label.key}
                    x={lastTime}
                    y={label.value}
                    r={2.5}
                    fill={label.strong ? tokens.mostLikely : tokens.bandStroke}
                    stroke="none"
                  >
                    <Label
                      value={label.text}
                      position="right"
                      offset={8}
                      fill={label.strong ? tokens.labelStrong : tokens.label}
                      fontSize={11}
                    />
                  </ReferenceDot>
                ))
              : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {legend}
    </div>
  );
}
