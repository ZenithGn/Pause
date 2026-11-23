import React, { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader, StatusChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  BreakdownCardSkeleton,
  DashboardFilterBar,
  DashboardWidgetErrorBoundary,
  KpiSectionSkeleton,
  KpiSummarySection,
  MembershipDistributionSection,
  OrderStatusSection,
  RecentActivitySection,
  RecentActivitySkeleton,
  RevenueChartSection,
  RevenueChartSkeleton,
  TopTemplatesSection,
  TopTemplatesSkeleton,
} from "@/features/dashboard/components";
import styles from "@/features/dashboard/components/DashboardLayout.module.css";
import {
  getVietnamTodayIso,
  parseDashboardSearchParams,
} from "@/features/dashboard/date-range";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard quản trị | Pause Admin",
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, resolvedParams] = await Promise.all([
    requireAdmin(),
    searchParams,
  ]);

  const now = new Date();
  const todayVn = getVietnamTodayIso(now);
  const range = parseDashboardSearchParams(resolvedParams, now);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard thống kê"
        description={`Xin chào ${session.profile.display_name}. Theo dõi người dùng, đơn in, doanh thu và hiệu suất template theo thời gian thực.`}
        actions={
          session.isMock ? (
            <StatusChip tone="warning" label="Mock Preview Mode" size="md" />
          ) : (
            <StatusChip tone="success" label="Dữ liệu trực tiếp" size="md" />
          )
        }
      />

      <DashboardFilterBar range={range} todayVn={todayVn} />

      <DashboardWidgetErrorBoundary title="Không thể tải chỉ số KPI">
        <Suspense fallback={<KpiSectionSkeleton />}>
          <KpiSummarySection range={range} />
        </Suspense>
      </DashboardWidgetErrorBoundary>

      <DashboardWidgetErrorBoundary title="Không thể tải biểu đồ doanh thu">
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueChartSection range={range} />
        </Suspense>
      </DashboardWidgetErrorBoundary>

      <div className={styles.twoColumn}>
        <DashboardWidgetErrorBoundary title="Không thể tải phân bổ trạng thái đơn in">
          <Suspense fallback={<BreakdownCardSkeleton />}>
            <OrderStatusSection range={range} />
          </Suspense>
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary title="Không thể tải phân bố gói hội viên">
          <Suspense fallback={<BreakdownCardSkeleton />}>
            <MembershipDistributionSection range={range} />
          </Suspense>
        </DashboardWidgetErrorBoundary>
      </div>

      <DashboardWidgetErrorBoundary title="Không thể tải Top 5 Template">
        <Suspense fallback={<TopTemplatesSkeleton />}>
          <TopTemplatesSection range={range} />
        </Suspense>
      </DashboardWidgetErrorBoundary>

      <DashboardWidgetErrorBoundary title="Không thể tải hoạt động gần đây">
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivitySection range={range} />
        </Suspense>
      </DashboardWidgetErrorBoundary>
    </div>
  );
}
