export function formatCurrencyFromCents(amountCents: number | null | undefined): string {
  if (amountCents === null || amountCents === undefined) return "—";
  const dollars = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface GiftLike {
  amountCents: number;
  giftDate: string;
}

export function lifetimeGivingCents(gifts: readonly GiftLike[]): number {
  return gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
}

export function lastGift(gifts: readonly GiftLike[]): GiftLike | null {
  let latest: GiftLike | null = null;
  for (const gift of gifts) {
    if (latest === null || gift.giftDate > latest.giftDate) {
      latest = gift;
    }
  }
  return latest;
}

export interface DatedLike {
  occurredAt: string | Date;
}

export function latestInteractionDate(interactions: readonly DatedLike[]): Date | null {
  let latest: Date | null = null;
  for (const interaction of interactions) {
    const date =
      interaction.occurredAt instanceof Date
        ? interaction.occurredAt
        : new Date(interaction.occurredAt);
    if (Number.isNaN(date.getTime())) continue;
    if (latest === null || date > latest) latest = date;
  }
  return latest;
}

export function titleCaseFromSnake(value: string): string {
  return value
    .split("_")
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(" ");
}

// -------------------------------------------------------------------------------------------
// Abbreviated currency (I17b)
//
// SCREENS.md is written in abbreviated money throughout — "$1.86M against a $2.70M goal — $845K
// short" — and nothing in the repo could produce those strings. Chart labels and axis ticks have no
// room for "$1,860,000"; `formatCurrencyFromCents` above stays the right answer everywhere else.
//
// Two rules, and the second is why the series function exists:
//
//   PRECISION IS CONSISTENT WITHIN A VIEW. Millions carry two decimals, thousands carry none. That
//   is what keeps "$2.70M" holding its trailing zero beside "$1.86M", and lets "$845K" sit in the
//   same sentence without reading as a different kind of number.
//
//   ABBREVIATION MUST NEVER MAKE TWO FIGURES CONTRADICT. Best $2,084,000 and Most likely $2,076,000
//   both render "$2.08M" at two decimals — the chart then asserts a band whose ends are equal, and
//   a reader who trusts the label concludes the simulation is broken. A single call cannot see
//   that; a series can, and raises precision until distinct inputs stay distinct in the same order.
//
// Input is exact integer cents, like every other money value in the system. The metrics services
// deliberately do no rounding; all of it happens here.
// -------------------------------------------------------------------------------------------

/** `auto` picks the tier by magnitude; the rest force one, for axis ticks that must share a unit. */
export type CurrencyUnit = "auto" | "exact" | "K" | "M" | "B";

export interface AbbreviatedCurrencyOptions {
  unit?: CurrencyUnit;
  /** Absolute override of the tier default (M/B → 2, K → 0). `exact` is always whole dollars. */
  decimals?: number;
  /** Added to whichever precision applies. The series function's only lever. */
  extraDecimals?: number;
}

interface Tier {
  readonly suffix: string;
  readonly divisor: number;
  readonly decimals: number;
}

const TIER_K: Tier = { suffix: "K", divisor: 1_000, decimals: 0 };
const TIER_M: Tier = { suffix: "M", divisor: 1_000_000, decimals: 2 };
const TIER_B: Tier = { suffix: "B", divisor: 1_000_000_000, decimals: 2 };
const FORCED: Readonly<Record<"K" | "M" | "B", Tier>> = { K: TIER_K, M: TIER_M, B: TIER_B };

function tierFor(absDollars: number): Tier | null {
  if (absDollars >= TIER_B.divisor) return TIER_B;
  if (absDollars >= TIER_M.divisor) return TIER_M;
  if (absDollars >= TIER_K.divisor) return TIER_K;
  return null;
}

function groupWhole(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * `$1.86M` · `$945K` · `$0`. Null → `—`, matching `formatCurrencyFromCents`.
 *
 * A value that rounds up through its own ceiling is promoted rather than printed as `$1,000K`.
 */
export function formatCurrencyAbbreviatedFromCents(
  amountCents: number | null | undefined,
  options: AbbreviatedCurrencyOptions = {},
): string {
  if (amountCents === null || amountCents === undefined || !Number.isFinite(amountCents))
    return "—";

  const absCents = Math.abs(Math.round(amountCents));
  const sign = amountCents < 0 ? "-" : "";
  const extra = options.extraDecimals ?? 0;
  const requested = options.unit ?? "auto";

  // Rounding happens in integer space, on the exact cents. `(2.025).toFixed(2)` is "2.02" — 2.025
  // has no binary representation and lands just below the half — so $2,025,000 would render
  // "$2.02M" beside a table that says $2,025,000. Scaling the integer instead is exact.
  const render = (divisor: number, dp: number): string => {
    const d = clampDecimals(dp);
    const pow = 10 ** d;
    const units = Math.round((absCents * pow) / (100 * divisor));
    const int = Math.trunc(units / pow);
    const grouped = groupWhole(int);
    if (d === 0) return grouped;
    return `${grouped}.${String(units - int * pow).padStart(d, "0")}`;
  };

  if (requested === "exact") return `${sign}$${render(1, options.decimals ?? 0)}`;

  let tier = requested === "auto" ? tierFor(absCents / 100) : FORCED[requested];
  if (tier === null) return `${sign}$${render(1, options.decimals ?? 0)}`;

  // "$1,000K" reads as a typo, so a value that rounds up through its own ceiling moves to the next
  // tier — but only when the tier was ours to choose. A caller who forced "K" for a shared axis
  // gets the unit they asked for, however it rounds.
  if (requested === "auto") {
    const next = tier === TIER_K ? TIER_M : tier === TIER_M ? TIER_B : null;
    if (next !== null) {
      const d = clampDecimals(options.decimals ?? tier.decimals + extra);
      const pow = 10 ** d;
      const units = Math.round((absCents * pow) / (100 * tier.divisor));
      if (units >= (next.divisor / tier.divisor) * pow) tier = next;
    }
  }

  return `${sign}$${render(tier.divisor, options.decimals ?? tier.decimals + extra)}${tier.suffix}`;
}

function clampDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(6, Math.trunc(value)));
}

/**
 * The same formatter over figures that will be read together — a BMW band, a legend, a
 * reconciliation line.
 *
 * Raises precision across the whole set only as far as it must to keep two promises: two different
 * amounts never render as the same string, and the rendered order matches the real order. Nulls
 * keep their `—` and take no part in the decision.
 *
 * It will spend at most two extra digits doing so. Past that the abbreviation has stopped
 * abbreviating — "$2.000000M" is longer than the number it stands for — so it falls back to exact
 * dollars, which always separates them.
 */
export function formatCurrencySeriesAbbreviatedFromCents(
  amountsCents: readonly (number | null | undefined)[],
  options: AbbreviatedCurrencyOptions = {},
): string[] {
  for (let extra = 0; extra <= 2; extra += 1) {
    const rendered = amountsCents.map((cents) =>
      formatCurrencyAbbreviatedFromCents(cents, {
        ...options,
        extraDecimals: (options.extraDecimals ?? 0) + extra,
      }),
    );
    if (isFaithful(amountsCents, rendered)) return rendered;
  }
  return amountsCents.map((cents) => formatCurrencyAbbreviatedFromCents(cents, { unit: "exact" }));
}

/** Distinct amounts render distinctly, and rendering preserves the real ordering. */
function isFaithful(
  amounts: readonly (number | null | undefined)[],
  rendered: readonly string[],
): boolean {
  const byAmount = new Map<number, string>();
  for (let i = 0; i < amounts.length; i += 1) {
    const amount = amounts[i];
    if (amount === null || amount === undefined || !Number.isFinite(amount)) continue;
    byAmount.set(amount, rendered[i]!);
  }
  const pairs = [...byAmount.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < pairs.length; i += 1) {
    if (pairs[i]![1] === pairs[i - 1]![1]) return false;
  }
  return true;
}
