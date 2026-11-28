"use client";

import React from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import {
  Button,
  DataTable,
  EmptyState,
  StatusChip,
  type DataTableColumn,
} from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { UserSummary } from "@/types/admin";
import { UserAvatar } from "./UserAvatar";
import { UserLockButton } from "./UserLockButton";
import { UserTierChip } from "./UserTierChip";
import styles from "./UsersTable.module.css";

export interface UsersTableProps {
  users: UserSummary[];
  currentAdminId: string;
  sort: string;
  hasActiveFilters: boolean;
}

export function UsersTable({
  users,
  currentAdminId,
  sort,
  hasActiveFilters,
}: UsersTableProps) {
  const columns: DataTableColumn<UserSummary>[] = [
    {
      key: "display_name",
      header: "Người dùng",
      sortable: true,
      sortKey: "display_name",
      render: (row) => (
        <div className={styles.userCell}>
          <UserAvatar name={row.display_name} avatarUrl={row.avatar_url} size="sm" />
          <div className={styles.userIdentity}>
            <Link href={`/admin/users/${row.id}`} className={styles.userNameLink}>
              {row.display_name}
            </Link>
            <span className={styles.userEmail} title={row.email ?? undefined}>
              {row.email ?? "Chưa có email"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (row) => (
        <span className={row.phone ? styles.monoText : styles.mutedText}>
          {row.phone ?? "—"}
        </span>
      ),
    },
    {
      key: "tier",
      header: "Gói hội viên",
      render: (row) => <UserTierChip tier={row.tier} />,
    },
    {
      key: "role",
      header: "Vai trò",
      render: (row) => <StatusChip status={row.role} />,
    },
    {
      key: "is_locked",
      header: "Trạng thái",
      render: (row) => (
        <StatusChip status={row.is_locked ? "locked" : "unlocked"} />
      ),
    },
    {
      key: "drawer_count",
      header: "Ngăn kéo",
      sortable: true,
      sortKey: "drawer_count",
      align: "right",
      render: (row) => (
        <span className={styles.nowrap}>{formatNumber(row.drawer_count)}</span>
      ),
    },
    {
      key: "created_at",
      header: "Ngày tạo",
      sortable: true,
      sortKey: "created_at",
      render: (row) => (
        <span className={`${styles.nowrap} ${styles.mutedText}`}>
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: "last_sign_in_at",
      header: "Đăng nhập gần nhất",
      sortable: true,
      sortKey: "last_sign_in_at",
      render: (row) => (
        <span className={`${styles.nowrap} ${styles.mutedText}`}>
          {row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : "Chưa đăng nhập"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (row) => (
        <div className={styles.actionsCell}>
          <Link href={`/admin/users/${row.id}`} className={styles.detailLink}>
            Chi tiết
          </Link>
          <UserLockButton
            userId={row.id}
            displayName={row.display_name}
            role={row.role}
            isLocked={row.is_locked}
            currentAdminId={currentAdminId}
            compact
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey={(row) => row.id}
      sort={sort}
      emptyState={
        <EmptyState
          icon={<Users size={24} />}
          title={
            hasActiveFilters
              ? "Không tìm thấy người dùng phù hợp"
              : "Chưa có người dùng nào"
          }
          description={
            hasActiveFilters
              ? "Hãy thử điều chỉnh từ khóa tìm kiếm hoặc xóa bớt bộ lọc hiện tại."
              : "Hệ thống chưa ghi nhận tài khoản người dùng nào."
          }
          action={
            hasActiveFilters ? (
              <Link href="/admin/users">
                <Button variant="outlined" size="sm">
                  Xóa bộ lọc
                </Button>
              </Link>
            ) : undefined
          }
        />
      }
    />
  );
}
