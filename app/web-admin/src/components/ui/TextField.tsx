import React, { useId } from "react";
import styles from "./FormControls.module.css";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  fullWidth?: boolean;
}

export function TextField({
  label,
  error,
  helperText,
  leftAdornment,
  rightAdornment,
  fullWidth = true,
  required,
  disabled,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = error || helperText ? `${inputId}-desc` : undefined;

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fullWidth : ""} ${className}`}>
      {label ? (
        <label htmlFor={inputId} className={styles.label}>
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
        {leftAdornment ? <span className={styles.adornment}>{leftAdornment}</span> : null}
        <input
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={[
            styles.input,
            leftAdornment ? styles.inputWithLeft : "",
            rightAdornment ? styles.inputWithRight : "",
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {rightAdornment ? <span className={styles.adornment}>{rightAdornment}</span> : null}
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
