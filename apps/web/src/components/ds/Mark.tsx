import type { SVGProps } from "react";

export interface MarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function Mark({ size = 24, ...rest }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="95 Forward mark"
      {...rest}
    >
      <rect width="48" height="48" rx="12" fill="#235C86" />
      <path
        d="M13 31.5 L24 21 L35 31.5"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="13.5" r="3.1" fill="#C8862A" />
    </svg>
  );
}
