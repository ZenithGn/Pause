import React, { useId } from "react";
import styles from "./FormControls.module.css";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export function Textarea({
  label,
  error,
  helperText,
  fullWidth = true,
  required,
  disabled,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const descriptionId = error || helperText ? `${textareaId}-desc` : undefined;

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fullWidth : ""} ${className}`}>
      {label ? (
        <label htmlFor={textareaId} className={styles.label}>
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
        <textarea
          id={textareaId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={styles.textarea}
          {...props}
        />
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
