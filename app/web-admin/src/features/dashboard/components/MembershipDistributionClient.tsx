"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardDescription, CardTitle, EmptyState } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { MembershipDistributionItem } from "@/types/admin";
import { calculateMembershipDistribution } from "../analytics";
import styles from "./BreakdownCard.module.css";

export interface MembershipDistributionClientProps {
  items: MembershipDistributionItem[];
}

export function MembershipDistributionClient({
  items,
}: MembershipDistributionClientProps) {
  const distribution = useMemo(
    () => calculateMembershipDistribution(items),
    [items],
  );
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const nonZeroSegments = distribution.items.filter((item) => item.active_count > 0);
  const activeItem =
    distribution.items.find((item) => item.plan_name === hoveredPlan) ?? null;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <CardTitle>Phân bố hội viên theo gói</CardTitle>
          <CardDescription>
            Tỷ lệ người dùng gói trả phí và gói miễn phí (Free) hiện tại
          </CardDescription>
        </div>

        <Link href="/admin/membership/plans" className={styles.headerLink}>
          <span>Quản lý gói</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {distribution.totalUsers === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu người dùng"
          description="Chưa có tài khoản nào được ghi nhận trên hệ thống."
        />
      ) : (
        <>
          <div className={styles.summaryLine}>
            <span className={styles.heroMetric}>
              {String(distribution.paidRatePercent).replace(".", ",")}% trả phí
            </span>
            <span className={styles.heroSub}>
              {formatNumber(distribution.paidUsers)} /{" "}
              {formatNumber(distribution.totalUsers)} người dùng
            </span>
          </div>

          <div
            className={styles.stackedWrapper}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <div
              className={styles.stackedBar}
              role="img"
              aria-label="Thanh tỷ lệ phân bố gói hội viên"
            >
              {nonZeroSegments.map((item) => (
                <Link
                  key={item.plan_name}
                  href={item.href}
                  className={styles.segmentLink}
                  style={{
                    width: `${item.widthPercent}%`,
                    backgroundColor: item.color,
                  }}
                  aria-label={`${item.plan_name}: ${item.active_count} người dùng (${item.percentage}%)`}
                  onMouseEnter={() => setHoveredPlan(item.plan_name)}
                  onFocus={() => setHoveredPlan(item.plan_name)}
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
                  <span>{activeItem.plan_name}:</span>
                  <span className={styles.hoverStrong}>
                    {formatNumber(activeItem.active_count)} người dùng (
                    {String(activeItem.percentage).replace(".", ",")}%)
                  </span>
                </>
              ) : (
                <span>
                  Đã bao gồm tài khoản Free và các gói hội viên đang còn hạn.
                </span>
              )}
            </div>
          </div>

          <div className={styles.rows}>
            {distribution.items.map((item) => (
              <Link
                key={item.plan_name}
                href={item.href}
                className={styles.rowLink}
                onMouseEnter={() => setHoveredPlan(item.plan_name)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                <span className={styles.rowIdentity}>
                  <span
                    className={styles.swatchDot}
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className={styles.planLabel}>{item.plan_name}</span>
                  <span className={styles.planTag}>
                    {item.isFree ? "Miễn phí" : "Trả phí"}
                  </span>
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
                  <span className={styles.rowCount}>
                    {formatNumber(item.active_count)}
                  </span>
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
