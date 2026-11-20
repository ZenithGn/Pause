"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  StatusChip,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { OrderStatusCount } from "@/types/admin";
import { calculateOrderStatusBreakdown } from "../analytics";
import { formatIsoDateVi, type DashboardRange } from "../date-range";
import styles from "./BreakdownCard.module.css";

export interface OrderStatusClientProps {
  counts: OrderStatusCount[];
  range: DashboardRange;
}

export function OrderStatusClient({ counts, range }: OrderStatusClientProps) {
  const breakdown = useMemo(() => calculateOrderStatusBreakdown(counts), [counts]);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const nonZeroSegments = breakdown.items.filter((item) => item.count > 0);
  const activeItem =
    breakdown.items.find((item) => item.status === hoveredStatus) ?? null;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <CardTitle>Phân bổ trạng thái đơn in</CardTitle>
          <CardDescription>
            Từ {formatIsoDateVi(range.from)} đến {formatIsoDateVi(range.to)}
          </CardDescription>
        </div>

        <Link href="/admin/orders" className={styles.headerLink}>
          <span>Quản lý đơn</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {breakdown.totalOrders === 0 ? (
        <EmptyState
          title="Chưa có đơn hàng trong kỳ"
          description="Không có đơn in nào được tạo trong khoảng thời gian đã chọn."
        />
      ) : (
        <>
          <div className={styles.summaryLine}>
            <span className={styles.heroMetric}>
              {formatNumber(breakdown.totalOrders)} đơn
            </span>
            <span className={styles.heroSub}>Tổng đơn phát sinh trong kỳ</span>
          </div>

          <div
            className={styles.stackedWrapper}
            onMouseLeave={() => setHoveredStatus(null)}
          >
            <div
              className={styles.stackedBar}
              role="img"
              aria-label="Thanh tỷ lệ trạng thái đơn hàng"
            >
              {nonZeroSegments.map((item) => (
                <Link
                  key={item.status}
                  href={item.href}
                  className={styles.segmentLink}
                  style={{
                    width: `${item.widthPercent}%`,
                    backgroundColor: item.color,
                  }}
                  aria-label={`${item.label}: ${item.count} đơn (${item.percentage}%)`}
                  onMouseEnter={() => setHoveredStatus(item.status)}
                  onFocus={() => setHoveredStatus(item.status)}
                />
              ))}
            </div>

            <div className={styles.hoverReadout} aria-live="polite">
              {activeItem ? (
                <>
                  <span
                    className={styles.hoverSwatch}
                    style={{ backgroundColor: activeItem.color }}
                    aria-hidden="true"
                  />
                  <span>{activeItem.label}:</span>
                  <span className={styles.hoverStrong}>
                    {formatNumber(activeItem.count)} đơn (
                    {String(activeItem.percentage).replace(".", ",")}%)
                  </span>
                </>
              ) : (
                <span>Di chuột hoặc chọn từng trạng thái để lọc danh sách đơn hàng.</span>
              )}
            </div>
          </div>

          <div className={styles.rows}>
            {breakdown.items.map((item) => (
              <Link
                key={item.status}
                href={item.href}
                className={styles.rowLink}
                onMouseEnter={() => setHoveredStatus(item.status)}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                <span className={styles.rowIdentity}>
                  <StatusChip status={item.status} size="sm" />
                </span>

                <span className={styles.meterTrack} aria-hidden="true">
                  <span
                    className={styles.meterFill}
                    style={{
                      display: "block",
                      width: `${item.widthPercent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </span>

                <span className={styles.rowMetrics}>
                  <span className={styles.rowCount}>{formatNumber(item.count)}</span>
                  <span className={styles.rowPercent}>
                    {String(item.percentage).replace(".", ",")}%
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
