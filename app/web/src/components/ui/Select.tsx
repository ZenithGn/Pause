import React, { useId } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./FormControls.module.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  fullWidth = true,
  required,
  disabled,
  id,
  className = "",
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = error || helperText ? `${selectId}-desc` : undefined;

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fullWidth : ""} ${className}`}>
      {label ? (
        <label htmlFor={selectId} className={styles.label}>
          <span>{label}</span>
          {required ? (
            <span className={styles.requiredMark} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div
        className={[
          styles.controlWrap,
          error ? styles.controlError : "",
          disabled ? styles.controlDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <select
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={styles.select}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span className={styles.selectArrow} aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </div>

      {error ? (
        <p id={descriptionId} className={styles.errorText} role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={descriptionId} className={styles.helperText}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
