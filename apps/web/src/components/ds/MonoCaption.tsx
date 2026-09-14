import type { HTMLAttributes, ReactNode } from "react";

export type MonoCaptionTone = "muted" | "strong" | "alert" | "quiet";

export interface MonoCaptionProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: MonoCaptionTone;
}

/**
 * `EXCLUDED FROM THE FORECAST · ~30 SEC` · `COUNTS AS QUALIFIED ASKS` ·
 * `$2,700,000 GOAL − $385,200 WON = $2,314,800 BASIS`.
 *
 * Monospace uppercase for consequence lines, column subtitles and inline arithmetic — the three
 * places the war room shows its working. Mono here means the same thing it means on SourceTag:
 * this is evidence, not prose.
 */
export function MonoCaption({
  children,
  tone = "muted",
  className = "",
  ...rest
}: MonoCaptionProps) {
  const cls = ["f95-monocap", tone !== "muted" ? `f95-monocap--${tone}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
