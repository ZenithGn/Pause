import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Crown,
  Minus,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Card, ErrorState, StatusChip } from "@/components/ui";
import { formatNumber, formatVnd } from "@/lib/format";
import { calculatePercentageDelta, type PercentageDeltaResult } from "../analytics";
import {
  buildDashboardHref,
  formatIsoDateVi,
  getVietnamTodayIso,
  type DashboardRange,
} from "../date-range";
import { fetchDashboardKpis, type DashboardKpiSnapshot } from "../queries";
import styles from "./KpiSummarySection.module.css";

function DeltaBadge({
  delta,
  periodLabel,
}: {
  delta: PercentageDeltaResult;
  periodLabel: string;
}) {
  const toneClass =
    delta.direction === "up"
      ? styles.deltaUp
      : delta.direction === "down"
        ? styles.deltaDown
        : styles.deltaFlat;

  const Icon =
    delta.direction === "up"
      ? TrendingUp
      : delta.direction === "down"
        ? TrendingDown
        : Minus;

  const label =
    delta.percent === null
      ? "Mới phát sinh"
      : `${delta.percent > 0 ? "+" : ""}${String(delta.percent).replace(".", ",")}%`;

  return (
    <span className={styles.cardBottom}>
      <span className={`${styles.deltaPill} ${toneClass}`}>
        <Icon size={13} aria-hidden="true" />
        <span>{label}</span>
      </span>
      <span className={styles.metaText}>so với {periodLabel}</span>
    </span>
  );
}

export async function KpiSummarySection({ range }: { range: DashboardRange }) {
  let snapshot: DashboardKpiSnapshot;
  try {
    snapshot = await fetchDashboardKpis(range);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải số liệu tổng quan từ hệ thống.";
    return (
      <Card>
        <ErrorState
          title="Không thể tải chỉ số KPI"
          message={message}
          retryHref={buildDashboardHref({
            preset: range.preset,
            from: range.from,
            to: range.to,
            granularity: range.granularity,
          })}
        />
      </Card>
    );
  }

  const { current, previous } = snapshot;
  const todayVn = getVietnamTodayIso();
  const currentMonthLabel = `${todayVn.slice(5, 7)}/${todayVn.slice(0, 4)}`;
  const periodCompareLabel = `${range.dayCount} ngày trước`;

  const rangeRevenueDelta = calculatePercentageDelta(
    current.revenue_range_vnd,
    previous.revenue_range_vnd,
  );
  const newUsersDelta = calculatePercentageDelta(
    current.new_users,
    previous.new_users,
  );

  const memberRate =
    current.total_users > 0
      ? Math.round((current.active_members / current.total_users) * 1000) / 10
      : 0;

  return (
    <section aria-label="Chỉ số tổng quan KPI" className={styles.section}>
      <div className={styles.topGrid}>
        <Link
          href={`/admin/transactions?from=${range.from}&to=${range.to}&status=success`}
          className={styles.kpiLink}
        >
          <Card className={styles.kpiCard}>
            <div className={styles.cardTop}>
              <span className={styles.label}>Doanh thu khoảng chọn</span>
              <span className={styles.iconBadge} aria-hidden="true">
                <Wallet size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatVnd(current.revenue_range_vnd)}</p>
            <DeltaBadge delta={rangeRevenueDelta} periodLabel={periodCompareLabel} />
          </Card>
        </Link>

        <Link href="/admin/transactions?status=success" className={styles.kpiLink}>
          <Card className={styles.kpiCard}>
            <div className={styles.cardTop}>
              <span className={styles.label}>Doanh thu tháng này</span>
              <span
                className={`${styles.iconBadge} ${styles.iconBadgeSuccess}`}
                aria-hidden="true"
              >
                <TrendingUp size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatVnd(current.revenue_month_vnd)}</p>
            <div className={styles.cardBottom}>
              <span className={styles.metaText}>
                Tháng {currentMonthLabel} (GMT+7)
              </span>
              <span className={styles.actionHint}>
                Giao dịch <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>

        <Link
          href={`/admin/orders?from=${todayVn}&to=${todayVn}`}
          className={styles.kpiLink}
        >
          <Card className={styles.kpiCard}>
            <div className={styles.cardTop}>
              <span className={styles.label}>Đơn hàng hôm nay</span>
              <span
                className={`${styles.iconBadge} ${styles.iconBadgeInfo}`}
                aria-hidden="true"
              >
                <ShoppingBag size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatNumber(current.orders_today)}</p>
            <div className={styles.cardBottom}>
              <span className={styles.metaText}>Ngày {formatIsoDateVi(todayVn)}</span>
              <span className={styles.actionHint}>
                Xem đơn <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>

        <Link href="/admin/orders?status=pending" className={styles.kpiLink}>
          <Card
            className={`${styles.kpiCard} ${
              current.pending_orders > 0 ? styles.kpiCardAlert : ""
            }`}
          >
            <div className={styles.cardTop}>
              <span className={styles.label}>Đơn chờ xác nhận</span>
              <span
                className={`${styles.iconBadge} ${styles.iconBadgeWarning}`}
                aria-hidden="true"
              >
                <Clock size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatNumber(current.pending_orders)}</p>
            <div className={styles.cardBottom}>
              {current.pending_orders > 0 ? (
                <StatusChip tone="warning" label="Cần xử lý" size="sm" />
              ) : (
                <StatusChip tone="success" label="Đã xử lý hết" size="sm" />
              )}
              <span
                className={`${styles.actionHint} ${
                  current.pending_orders > 0 ? styles.actionHintWarning : ""
                }`}
              >
                Xử lý ngay <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      <div className={styles.bottomGrid}>
        <Link href="/admin/users" className={styles.kpiLink}>
          <Card className={styles.kpiCard}>
            <div className={styles.cardTop}>
              <span className={styles.label}>Tổng người dùng</span>
              <span className={styles.iconBadge} aria-hidden="true">
                <Users size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatNumber(current.total_users)}</p>
            <div className={styles.cardBottom}>
              <span className={styles.metaText}>Tài khoản toàn hệ thống</span>
              <span className={styles.actionHint}>
                Danh sách <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>

        <Link href="/admin/users" className={styles.kpiLink}>
          <Card className={styles.kpiCard}>
            <div className={styles.cardTop}>
              <span className={styles.label}>Người dùng mới</span>
              <span
                className={`${styles.iconBadge} ${styles.iconBadgeInfo}`}
                aria-hidden="true"
              >
                <UserPlus size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatNumber(current.new_users)}</p>
            <DeltaBadge delta={newUsersDelta} periodLabel={periodCompareLabel} />
          </Card>
        </Link>

        <Link
          href="/admin/membership/subscribers?status=active"
          className={styles.kpiLink}
        >
          <Card className={styles.kpiCard}>
            <div className={styles.cardTop}>
              <span className={styles.label}>Hội viên đang hoạt động</span>
              <span
                className={`${styles.iconBadge} ${styles.iconBadgeSuccess}`}
                aria-hidden="true"
              >
                <Crown size={17} />
              </span>
            </div>
            <p className={styles.value}>{formatNumber(current.active_members)}</p>
            <div className={styles.cardBottom}>
              <span className={styles.metaText}>
                {String(memberRate).replace(".", ",")}% tổng người dùng
              </span>
              <span className={styles.actionHint}>
                Hội viên <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </section>
  );
}
