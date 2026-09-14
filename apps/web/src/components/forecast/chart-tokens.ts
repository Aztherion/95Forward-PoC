/**
 * The design tokens the chart needs, read from CSS at runtime.
 *
 * Recharts styles inline — `stroke`, `fill`, `dot` are props, not classes — so a custom property
 * never reaches it. The alternative is a hex literal in the chart component, which is precisely how
 * a component drifts out of the system: the token changes, the chart does not, and nobody notices
 * because nothing breaks.
 *
 * So the tokens are read from the document root, where they are already defined, and passed down as
 * props. `getComputedStyle().getPropertyValue()` returns a custom property's COMPUTED value, so a
 * chain like `--health-moving → --color-success → --sage-600 → #3b7458` arrives resolved.
 */

/** Every token the chart draws with. One entry here, one `var()` nowhere else. */
export const CHART_TOKEN_NAMES = {
  // Ink for what happened, iris for what the model says. --brand-primary was the first choice and
  // the gallery showed why it was wrong: blue-600 beside iris-600 is two shades of the same blue at
  // 2px, and the legend could not separate them. Iris is also the reserved AI colour, so the
  // simulated line now says what it is.
  actual: "--text-strong",
  mostLikely: "--ai-ink",
  band: "--ai-tint",
  bandStroke: "--ai-border",
  goal: "--text-muted",
  today: "--border-strong",
  axis: "--text-muted",
  grid: "--border-hairline",
  label: "--text-secondary",
  labelStrong: "--text-strong",
  surface: "--surface-card",
} as const;

export type ChartTokenName = keyof typeof CHART_TOKEN_NAMES;
export type ChartTokens = Record<ChartTokenName, string>;

/**
 * Reads every token off `document.documentElement`.
 *
 * Returns null on the server, and null if a token resolves empty — which means the stylesheet has
 * not arrived or a token was renamed. Callers render the frame without the plot rather than
 * drawing a chart in browser defaults, because a forecast in the wrong colours is worse than one
 * that is a frame late.
 */
export function readChartTokens(): ChartTokens | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const computed = window.getComputedStyle(document.documentElement);
  const out = {} as ChartTokens;
  for (const [key, property] of Object.entries(CHART_TOKEN_NAMES)) {
    const value = computed.getPropertyValue(property).trim();
    if (value === "") return null;
    out[key as ChartTokenName] = value;
  }
  return out;
}
