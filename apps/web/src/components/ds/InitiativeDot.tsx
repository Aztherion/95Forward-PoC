import type { HTMLAttributes, ReactNode } from "react";

/** The keys I18 seeds into `funding_initiatives.colour_key`, plus room for a fifth. */
export const INITIATIVE_COLOUR_KEYS = [
  "initiative-1",
  "initiative-2",
  "initiative-3",
  "initiative-4",
  "initiative-5",
] as const;
export type InitiativeColourKey = (typeof INITIATIVE_COLOUR_KEYS)[number];

function slotFor(colourKey: string | null | undefined): string | null {
  if (!colourKey) return null;
  const match = /^initiative-([1-5])$/.exec(colourKey);
  return match ? match[1]! : null;
}

export interface InitiativeDotProps extends HTMLAttributes<HTMLSpanElement> {
  /** The stored key, not a colour. An unknown or missing key renders the neutral dot. */
  colourKey: string | null | undefined;
  /** The initiative's name, for the accessible label when the dot stands alone. */
  name?: string;
}

/**
 * The categorical dot for a funding initiative.
 *
 * I18 stores a KEY on the initiative and this maps it to a token, so renaming an initiative in the
 * database cannot change its colour and a screen never writes a hue. An unrecognised key falls back
 * to the neutral dot rather than guessing — a wrong colour here would silently re-attribute money
 * on the stage board.
 */
export function InitiativeDot({
  colourKey,
  name,
  className = "",
  ...rest
}: InitiativeDotProps): ReactNode {
  const slot = slotFor(colourKey);
  const cls = ["f95-initdot", slot ? `f95-initdot--${slot}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      data-colour-key={colourKey ?? "none"}
      {...(name ? { role: "img", "aria-label": name, title: name } : { "aria-hidden": true })}
      {...rest}
    />
  );
}

export interface InitiativeChipProps extends HTMLAttributes<HTMLSpanElement> {
  colourKey: string | null | undefined;
  children: ReactNode;
}

/** The dot plus the initiative's name — the chip that sits on a queue card and a stage chip. */
export function InitiativeChip({
  colourKey,
  children,
  className = "",
  ...rest
}: InitiativeChipProps) {
  const cls = ["f95-initchip", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      <InitiativeDot colourKey={colourKey} />
      {children}
    </span>
  );
}
