"use client";

import React, { useTransition } from "react";
import { LogOut, Menu } from "lucide-react";
import { signOutAdminAction } from "@/app/(admin-auth)/admin/login/actions";
import { Button, StatusChip } from "@/components/ui";
import styles from "./AdminHeader.module.css";

export interface AdminHeaderProps {
  displayName: string;
  email: string | null;
  isMock?: boolean;
  onOpenSidebar: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function AdminHeader({
  displayName,
  email,
  isMock = false,
  onOpenSidebar,
}: AdminHeaderProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOutAdminAction();
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label="Mở menu điều hướng"
          onClick={onOpenSidebar}
        >
          <Menu size={20} />
        </button>

        {isMock ? (
          <StatusChip tone="warning" label="Chế độ dữ liệu mẫu (Mock)" />
        ) : null}
      </div>

      <div className={styles.right}>
        <div className={styles.userCard}>
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(displayName)}
          </span>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{displayName}</span>
            {email ? <span className={styles.userEmail}>{email}</span> : null}
          </div>
        </div>

        <Button
          variant="outlined"
          size="sm"
          loading={isPending}
          leftIcon={<LogOut size={15} />}
          onClick={handleLogout}
        >
          Đăng xuất
        </Button>
      </div>
    </header>
  );
}
