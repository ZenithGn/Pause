import React from "react";
import { Card, Skeleton, TableSkeleton } from "@/components/ui";
import styles from "./DashboardSkeletons.module.css";

function KpiCardSkeleton() {
  return (
    <Card>
      <Skeleton width="55%" height={14} />
      <div style={{ marginTop: "var(--space-3)" }}>
        <Skeleton width="72%" height={30} />
      </div>
      <div style={{ marginTop: "var(--space-3)" }}>
        <Skeleton width="48%" height={13} />
      </div>
    </Card>
  );
}

export function KpiSectionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải chỉ số KPI">
      <div className={styles.kpiTopGrid}>
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className={styles.kpiBottomGrid}>
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    </div>
  );
}

export function RevenueChartSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Đang tải biểu đồ doanh thu">
      <div className={styles.cardHeaderSkeleton}>
        <div className={styles.headerText}>
          <Skeleton width={220} height={20} />
          <Skeleton width={320} height={14} />
        </div>
        <Skeleton width={160} height={32} />
      </div>
      <Skeleton variant="rect" height={280} />
    </Card>
  );
}

export function BreakdownCardSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Đang tải thống kê phân bổ">
      <div className={styles.cardHeaderSkeleton}>
        <div className={styles.headerText}>
          <Skeleton width={180} height={20} />
          <Skeleton width={220} height={14} />
        </div>
        <Skeleton width={90} height={16} />
      </div>
      <Skeleton variant="rect" height={16} />
      <div className={styles.rowsStack}>
        {Array.from({ length: 5 }, (_, idx) => (
          <div key={idx} className={styles.rowSkeleton}>
            <Skeleton width="90%" height={20} />
            <Skeleton width="100%" height={8} />
            <Skeleton width="100%" height={16} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function TopTemplatesSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Đang tải top templates">
      <div className={styles.cardHeaderSkeleton}>
        <div className={styles.headerText}>
          <Skeleton width={200} height={20} />
          <Skeleton width={280} height={14} />
        </div>
        <Skeleton width={110} height={16} />
      </div>
      <TableSkeleton rows={5} columns={4} />
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card aria-busy="true" aria-label="Đang tải hoạt động gần đây">
      <div className={styles.cardHeaderSkeleton}>
        <div className={styles.headerText}>
          <Skeleton width={190} height={20} />
          <Skeleton width={260} height={14} />
        </div>
      </div>
      <div className={styles.activityGrid}>
        {Array.from({ length: 3 }, (_, idx) => (
          <div key={idx} className={styles.activityCol}>
            <Skeleton width="55%" height={16} />
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
          </div>
        ))}
      </div>
    </Card>
  );
}
