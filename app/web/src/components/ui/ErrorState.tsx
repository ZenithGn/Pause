import React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import styles from "./StateMessage.module.css";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryHref?: string;
  retryLabel?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Không thể tải dữ liệu",
  message = "Đã xảy ra sự cố khi kết nối tới máy chủ. Vui lòng thử lại.",
  onRetry,
  retryHref,
  retryLabel = "Thử lại",
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`${styles.stateBox} ${styles.errorBox} ${className}`} role="alert">
      <div className={`${styles.iconWrap} ${styles.errorIconWrap}`} aria-hidden="true">
        <AlertCircle size={24} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {message ? <p className={styles.description}>{message}</p> : null}
      {onRetry || retryHref || action ? (
        <div className={styles.actions}>
          {onRetry ? (
            <Button variant="outlined" size="sm" leftIcon={<RotateCcw size={15} />} onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {retryHref ? (
            <Link href={retryHref}>
              <Button variant="outlined" size="sm" leftIcon={<RotateCcw size={15} />}>
                {retryLabel}
              </Button>
            </Link>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
