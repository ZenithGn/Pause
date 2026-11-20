import React from "react";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rect" | "circle";
  className?: string;
}

export function Skeleton({
  width = "100%",
  height,
  variant = "text",
  className = "",
}: SkeletonProps) {
  const resolvedHeight =
    height ?? (variant === "circle" ? width : variant === "rect" ? 96 : 14);

  return (
    <span
      aria-hidden="true"
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof resolvedHeight === "number" ? `${resolvedHeight}px` : resolvedHeight,
      }}
    />
  );
}

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className={styles.tableSkeleton} aria-busy="true" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className={styles.tableRow}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} height={18} />
          ))}
        </div>
      ))}
    </div>
  );
}
