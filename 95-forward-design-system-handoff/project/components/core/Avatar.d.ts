import React from "react";

/**
 * Avatar — person, company, or foundation. People are circular; orgs
 * (`kind="org"`) render as rounded-squares so prospect types stay distinct.
 * Falls back to deterministic tinted initials when no `src`.
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  kind?: "person" | "org";
  /** Optional ownership ring (e.g. var(--role-manager) for the RM). */
  ringColor?: string;
}

export function Avatar(props: AvatarProps): JSX.Element;
