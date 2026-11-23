import React from "react";
import { Inbox } from "lucide-react";
import styles from "./StateMessage.module.css";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = "Chưa có dữ liệu",
  description = "Không tìm thấy bản ghi nào phù hợp với điều kiện hiện tại.",
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`${styles.stateBox} ${className}`}>
      <div className={styles.iconWrap} aria-hidden="true">
        {icon ?? <Inbox size={24} />}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.actions}>{action}</div> : null}
    </div>
  );
}
