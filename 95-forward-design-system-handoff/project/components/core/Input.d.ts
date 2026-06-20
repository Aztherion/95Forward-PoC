import React from "react";

/**
 * Input — labelled text field. Hints and empties are written as invitations,
 * not warnings. `ai` marks a provisional copilot-proposed value (tinted iris).
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Appends a quiet "· optional" to the label. */
  optional?: boolean;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  /** Mark the value as AI-proposed (provisional, iris-tinted). */
  ai?: boolean;
}

export function Input(props: InputProps): JSX.Element;
