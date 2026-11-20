import React, { useId } from "react";
import styles from "./FormControls.module.css";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export function Checkbox({
  label,
  description,
  error,
  id,
  disabled,
  className = "",
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className={`${styles.field} ${className}`}>
      <label
        htmlFor={checkboxId}
        className={`${styles.checkboxRow} ${disabled ? styles.switchRowDisabled : ""}`}
      >
        <input
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          className={styles.checkboxInput}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {label || description ? (
          <span className={styles.choiceText}>
            {label ? <span className={styles.choiceLabel}>{label}</span> : null}
            {description ? <span className={styles.choiceDescription}>{description}</span> : null}
          </span>
        ) : null}
      </label>
      {error ? (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
