import React, { Suspense } from "react";
import type { Metadata } from "next";
import {
  Card,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
  StatusChip,
  TableSkeleton,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatNumber } from "@/lib/format";
import { UsersFilters, UsersTable } from "@/features/users/components";
import { listAdminUsers } from "@/features/users/queries";
import { DEFAULT_USER_SORT, parseUsersSearchParams } from "@/features/users/schemas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý người dùng",
};

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    requireAdmin(),
    searchParams,
  ]);

  const filters = parseUsersSearchParams(resolvedSearchParams);
  const result = await listAdminUsers(filters);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.tier ||
      filters.status ||
      filters.role ||
      filters.sort !== DEFAULT_USER_SORT,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title="Quản lý người dùng"
        description="Theo dõi danh sách tài khoản, hạng hội viên, số ngăn kéo và khóa hoặc mở khóa người dùng."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Người dùng" },
        ]}
        actions={
          result.ok ? (
            <StatusChip
              tone="neutral"
              dot={false}
              size="md"
              label={`Tổng: ${formatNumber(result.data.totalCount)} tài khoản`}
            />
          ) : null
        }
      />

      <Suspense
        fallback={
          <Card padding="sm">
            <Skeleton width="100%" height={48} />
          </Card>
        }
      >
        <UsersFilters
          initialFilters={{
            q: filters.q,
            tier: filters.tier,
            status: filters.status,
            role: filters.role,
            sort: filters.sort,
          }}
        />
      </Suspense>

      {!result.ok ? (
        <ErrorState
          title="Không thể tải danh sách người dùng"
          message={result.message}
          retryHref="/admin/users"
        />
      ) : (
        <>
          <Suspense
            fallback={
              <Card padding="none">
                <TableSkeleton rows={6} columns={8} />
              </Card>
            }
          >
            <UsersTable
              users={result.data.items}
              currentAdminId={session.user.id}
              sort={filters.sort}
              hasActiveFilters={hasActiveFilters}
            />
          </Suspense>

          {result.data.totalCount > 0 ? (
            <Suspense fallback={<Skeleton width="100%" height={40} />}>
              <Pagination
                page={result.data.page}
                pageSize={result.data.pageSize}
                totalCount={result.data.totalCount}
              />
            </Suspense>
          ) : null}
        </>
      )}
    </div>
  );
}
