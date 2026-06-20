import type { HTMLAttributes } from "react";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarKind = "person" | "org";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  src?: string;
  size?: AvatarSize;
  kind?: AvatarKind;
  ringColor?: string;
}

const TINTS = ["#235C86", "#3B7458", "#C8862A", "#4A4F94", "#2F7E8C"] as const;

function tintFor(seed = ""): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length] ?? TINTS[0];
}

function initials(name = ""): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name = "",
  src,
  size = "md",
  kind = "person",
  ringColor,
  className = "",
  ...rest
}: AvatarProps) {
  const cls = [
    "f95-avatar",
    `f95-avatar--${size}`,
    kind === "org" ? "f95-avatar--org" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      style={{ background: src ? undefined : tintFor(name) }}
      title={name}
      {...rest}
    >
      {src ? <img src={src} alt={name} /> : initials(name)}
      {ringColor ? (
        <span
          className="f95-avatar__ring"
          style={{ boxShadow: `0 0 0 2px var(--surface-card), 0 0 0 3.5px ${ringColor}` }}
        />
      ) : null}
    </span>
  );
}
