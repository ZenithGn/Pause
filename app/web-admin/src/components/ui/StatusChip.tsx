import React from "react";
import styles from "./StatusChip.module.css";

export type StatusTone = "neutral" | "primary" | "success" | "warning" | "info" | "error";

interface PresetMapping {
  label: string;
  tone: StatusTone;
}

const PRESET_STATUS_MAP: Record<string, PresetMapping> = {
  // Print orders
  pending: { label: "Chờ xác nhận", tone: "warning" },
  processing: { label: "Đang xử lý", tone: "info" },
  printing: { label: "Đang in", tone: "primary" },
  shipping: { label: "Đang giao", tone: "info" },
  completed: { label: "Hoàn thành", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "error" },
  // Payments
  success: { label: "Thành công", tone: "success" },
  failed: { label: "Thất bại", tone: "error" },
  refunded: { label: "Đã hoàn tiền", tone: "neutral" },
  // Memberships & accounts
  active: { label: "Đang hoạt động", tone: "success" },
  expired: { label: "Hết hạn", tone: "neutral" },
  locked: { label: "Đã khóa", tone: "error" },
  unlocked: { label: "Hoạt động", tone: "success" },
  // Roles & tiers
  admin: { label: "Admin", tone: "primary" },
  user: { label: "Người dùng", tone: "neutral" },
  premium: { label: "VIP", tone: "primary" },
  vip: { label: "VIP", tone: "primary" },
  free: { label: "Miễn phí", tone: "neutral" },
  inactive: { label: "Đang ẩn", tone: "neutral" },
};

export interface StatusChipProps {
  status?: string;
  tone?: StatusTone;
  label?: string;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function StatusChip({
  status,
  tone,
  label,
  size = "sm",
  dot = true,
  className = "",
  children,
}: StatusChipProps) {
  const normalizedKey = status?.toLowerCase().trim() ?? "";
  const preset = PRESET_STATUS_MAP[normalizedKey];

  const resolvedTone: StatusTone = tone ?? preset?.tone ?? "neutral";
  const resolvedContent = children ?? label ?? preset?.label ?? status ?? "—";

  return (
    <span className={`${styles.chip} ${styles[resolvedTone]} ${styles[size]} ${className}`}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      <span>{resolvedContent}</span>
    </span>
  );
}
