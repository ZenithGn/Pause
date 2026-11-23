"use client";

import React, { useId } from "react";
import styles from "./FormControls.module.css";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  name,
  id,
  className = "",
  "aria-label": ariaLabel,
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  const toggle = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <div className={`${styles.switchRow} ${disabled ? styles.switchRowDisabled : ""} ${className}`}>
      {name ? <input type="hidden" name={name} value={checked ? "true" : "false"} /> : null}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={toggle}
        className={`${styles.switchTrack} ${checked ? styles.switchTrackChecked : ""}`}
      >
        <span className={styles.switchThumb} aria-hidden="true" />
      </button>
      {label || description ? (
        <label htmlFor={switchId} className={styles.choiceText}>
          {label ? <span className={styles.choiceLabel}>{label}</span> : null}
          {description ? <span className={styles.choiceDescription}>{description}</span> : null}
        </label>
      ) : null}
    </div>
  );
}
