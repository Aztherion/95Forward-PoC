import type { HTMLAttributes } from "react";

export type Role = "manager" | "partner";

export interface RoleChipProps extends HTMLAttributes<HTMLSpanElement> {
  role: Role;
  name: string;
}

function initials(name = ""): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function DoorIcon() {
  return (
    <svg
      className="f95-role__ic"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 14h10" />
      <path d="M10 14V3.5a.5.5 0 0 0-.6-.49L5 4v10" />
      <circle cx="6.4" cy="8.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RoleChip({ role = "manager", name = "", className = "", ...rest }: RoleChipProps) {
  const isManager = role === "manager";
  const cls = ["f95-role", `f95-role--${role}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={name} {...rest}>
      {isManager ? <span className="f95-role__av">{initials(name)}</span> : <DoorIcon />}
      <span className="f95-role__txt">
        <span className="f95-role__lbl">{isManager ? "Relationship Mgr" : "Natural Partner"}</span>
        <span className="f95-role__name">{name}</span>
      </span>
    </span>
  );
}
