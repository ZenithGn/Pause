import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "./Button";
import styles from "./FilterBar.module.css";

export interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  hasActiveFilters?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  children,
  onReset,
  resetLabel = "Xóa bộ lọc",
  hasActiveFilters = false,
  actions,
  className = "",
}: FilterBarProps) {
  return (
    <div className={`${styles.bar} ${className}`}>
      <div className={styles.fields}>{children}</div>
      {onReset || actions ? (
        <div className={styles.actions}>
          {hasActiveFilters && onReset ? (
            <Button
              variant="text"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={onReset}
            >
              {resetLabel}
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
