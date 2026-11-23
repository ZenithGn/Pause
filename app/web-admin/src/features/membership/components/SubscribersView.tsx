"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Clock, ExternalLink, Layers } from "lucide-react";
import {
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusChip,
  type DataTableColumn,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type {
  MembershipPlan,
  MembershipSubscriber,
  PaginatedResult,
} from "@/types/admin";
import styles from "./SubscribersView.module.css";

export interface SubscribersViewProps {
  result: PaginatedResult<MembershipSubscriber>;
  plans: MembershipPlan[];
  activeFilters: {
    search: string;
    status: string;
    planId: string;
    expiringWithin7Days: boolean;
  };
}

export function SubscribersView({
  result,
  plans,
  activeFilters,
}: SubscribersViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.set("page", "1");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleStatusChange = (nextStatus: string) => {
    updateParams((params) => {
      if (nextStatus) {
        params.set("status", nextStatus);
        if (nextStatus !== "active") {
          params.delete("expiringWithinDays");
        }
      } else {
        params.delete("status");
      }
    });
  };

  const handlePlanChange = (nextPlanId: string) => {
    updateParams((params) => {
      params.delete("plan_id");
      if (nextPlanId) {
        params.set("plan", nextPlanId);
      } else {
        params.delete("plan");
      }
    });
  };

  const handleToggleExpiring7Days = () => {
    updateParams((params) => {
      if (activeFilters.expiringWithin7Days) {
        params.delete("expiringWithinDays");
      } else {
        params.set("expiringWithinDays", "7");
        const currentStatus = params.get("status");
        if (currentStatus && currentStatus !== "active") {
          params.delete("status");
        }
      }
    });
  };

  const handleResetFilters = () => {
    updateParams((params) => {
      params.delete("q");
      params.delete("search");
      params.delete("status");
      params.delete("plan");
      params.delete("plan_id");
      params.delete("expiringWithinDays");
    });
  };

  const hasActiveFilters = Boolean(
    activeFilters.search ||
      activeFilters.status ||
      activeFilters.planId ||
      activeFilters.expiringWithin7Days,
  );

  const columns: DataTableColumn<MembershipSubscriber>[] = [
    {
      key: "display_name",
      header: "Hội viên",
      render: (row) => (
        <div className={styles.userCell}>
          <Link href={`/admin/users/${row.user_id}`} className={styles.userLink}>
            {row.display_name}
          </Link>
          <span className={styles.userEmail}>{row.email ?? "Chưa có email"}</span>
        </div>
      ),
    },
    {
      key: "plan_name",
      header: "Gói hội viên",
      render: (row) => (
        <StatusChip tone="primary" dot={false} label={row.plan_name} />
      ),
    },
    {
      key: "started_at",
      header: "Ngày bắt đầu",
      render: (row) => (
        <span className={styles.dateCell}>{formatDateTime(row.started_at)}</span>
      ),
    },
    {
      key: "expires_at",
      header: "Ngày hết hạn",
      render: (row) => (
        <span className={styles.dateCell}>{formatDateTime(row.expires_at)}</span>
      ),
    },
    {
      key: "days_left",
      header: "Còn lại",
      render: (row) => {
        if (row.status !== "active") {
          return <span className={styles.muted}>—</span>;
        }
        const isExpiringSoon = row.days_left <= 7;
        return (
          <StatusChip
            tone={isExpiringSoon ? "warning" : "info"}
            dot={isExpiringSoon}
            label={
              row.days_left <= 0
                ? "Hết hạn hôm nay"
                : `Còn ${row.days_left} ngày`
            }
          />
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "actions",
      header: "Hồ sơ",
      align: "right",
      render: (row) => (
        <Link href={`/admin/users/${row.user_id}`}>
          <Button
            variant="text"
            size="sm"
            rightIcon={<ExternalLink size={14} />}
          >
            Xem người dùng
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.stack}>
      <PageHeader
        title="Danh sách hội viên"
        description="Theo dõi gói hội viên đã đăng ký, ngày hết hạn và lọc nhanh các tài khoản sắp hết hạn."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Gói hội viên", href: "/admin/membership/plans" },
          { label: "Hội viên" },
        ]}
        actions={
          <Link href="/admin/membership/plans">
            <Button variant="outlined" leftIcon={<Layers size={16} />}>
              Quản lý gói hội viên
            </Button>
          </Link>
        }
      />

      <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleResetFilters}>
        <div className={styles.searchField}>
          <SearchInput
            paramName="q"
            placeholder="Tìm theo tên hoặc email hội viên..."
            ariaLabel="Tìm kiếm hội viên"
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo trạng thái hội viên"
            value={activeFilters.status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "active", label: "Đang hoạt động" },
              { value: "expired", label: "Hết hạn" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo gói hội viên"
            value={activeFilters.planId}
            disabled={isPending}
            onChange={(e) => handlePlanChange(e.target.value)}
            options={[
              { value: "", label: "Tất cả gói hội viên" },
              ...plans.map((plan) => ({
                value: plan.id,
                label: plan.is_active ? plan.name : `${plan.name} (Ngừng bán)`,
              })),
            ]}
          />
        </div>

        <div className={styles.quickToggleWrap}>
          <Button
            variant={activeFilters.expiringWithin7Days ? "primary" : "outlined"}
            size="md"
            disabled={isPending}
            aria-pressed={activeFilters.expiringWithin7Days}
            leftIcon={<Clock size={15} />}
            onClick={handleToggleExpiring7Days}
          >
            Sắp hết hạn trong 7 ngày
          </Button>
        </div>
      </FilterBar>

      {activeFilters.expiringWithin7Days ? (
        <div className={styles.expiringBanner} role="status">
          <span>
            Đang lọc các hội viên còn hiệu lực sẽ hết hạn trong vòng{" "}
            <strong>7 ngày tới</strong> (sắp xếp hết hạn sớm nhất trước).
          </span>
          <Button variant="text" size="sm" onClick={handleToggleExpiring7Days}>
            Bỏ lọc 7 ngày
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={result.items}
        syncUrl={false}
        loading={isPending}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            title="Không tìm thấy hội viên nào"
            description="Không có đăng ký hội viên nào khớp với điều kiện lọc hiện tại."
            action={
              hasActiveFilters ? (
                <Button variant="outlined" size="sm" onClick={handleResetFilters}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
      />
    </div>
  );
}
