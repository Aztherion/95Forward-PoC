import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  selectSize?: "sm" | "md";
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  selectSize = "md",
  id,
  className = "",
  ...rest
}: SelectProps) {
  const fid = id ?? (label ? `f95-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const selectCls = [
    "f95-select__el",
    selectSize === "sm" ? "f95-select__el--sm" : "",
    error ? "f95-select__el--invalid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="f95-field">
      {label ? (
        <label className="f95-field__label" htmlFor={fid}>
          {label}
        </label>
      ) : null}
      <div className="f95-select">
        <select id={fid} className={selectCls} aria-invalid={!!error} {...rest}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} strokeWidth={1.8} className="f95-select__chevron" />
      </div>
      {error ? (
        <span className="f95-field__err">{error}</span>
      ) : hint ? (
        <span className="f95-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
