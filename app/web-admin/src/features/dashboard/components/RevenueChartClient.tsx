"use client";

import React, { useMemo, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui";
import { formatNumber, formatVnd } from "@/lib/format";
import type { RevenueSeriesPoint } from "@/types/admin";
import {
  buildRevenueChartModel,
  REVENUE_SERIES_COLORS,
} from "../analytics";
import {
  formatIsoDateVi,
  type DashboardRange,
  type RevenueGranularity,
} from "../date-range";
import styles from "./RevenueChart.module.css";

export interface RevenueChartClientProps {
  series: RevenueSeriesPoint[];
  range: DashboardRange;
}

const GRANULARITY_LABEL: Record<RevenueGranularity, string> = {
  day: "ngày",
  week: "tuần",
  month: "tháng",
};

function buildRoundedTopBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4,
): string {
  if (height <= 0) {
    return `M ${x} ${y} L ${x + width} ${y} Z`;
  }
  const r = Math.min(radius, width / 2, height);
  const bottom = y + height;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${bottom}`,
    "Z",
  ].join(" ");
}

export function RevenueChartClient({ series, range }: RevenueChartClientProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const model = useMemo(
    () => buildRevenueChartModel(series, range.granularity),
    [series, range.granularity],
  );

  const activePoint =
    activeIndex !== null && activeIndex >= 0 && activeIndex < model.points.length
      ? model.points[activeIndex]
      : null;

  const isSingleBucket = model.points.length === 1;
  const isRightHalf =
    activePoint !== null && activePoint.index >= Math.floor(model.points.length / 2);

  return (
    <Card>
      <div className={styles.header}>
        <div>
          <CardTitle>
            Biểu đồ doanh thu theo {GRANULARITY_LABEL[range.granularity]}
          </CardTitle>
          <CardDescription>
            So sánh doanh thu in ấn và gói hội viên (VNĐ) từ{" "}
            {formatIsoDateVi(range.from)} đến {formatIsoDateVi(range.to)}
          </CardDescription>
        </div>

        <div className={styles.viewSwitch} role="group" aria-label="Chế độ hiển thị biểu đồ">
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === "chart" ? styles.viewBtnActive : ""}`}
            aria-pressed={viewMode === "chart"}
            onClick={() => setViewMode("chart")}
          >
            <BarChart3 size={14} aria-hidden="true" />
            <span>Biểu đồ</span>
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === "table" ? styles.viewBtnActive : ""}`}
            aria-pressed={viewMode === "table"}
            onClick={() => setViewMode("table")}
          >
            <Table2 size={14} aria-hidden="true" />
            <span>Bảng số liệu</span>
          </button>
        </div>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryMetrics}>
          <div className={styles.summaryMetric}>
            <span className={styles.metricLabel}>Tổng doanh thu kỳ</span>
            <span className={styles.metricValue}>{formatVnd(model.totalRevenue)}</span>
          </div>
          <div className={styles.summaryMetric}>
            <span className={styles.metricLabel}>
              <span
                className={styles.legendLine}
                style={{ backgroundColor: REVENUE_SERIES_COLORS.print }}
                aria-hidden="true"
              />
              In ấn
            </span>
            <span className={styles.metricValue}>
              {formatVnd(model.totalPrintRevenue)}
            </span>
          </div>
          <div className={styles.summaryMetric}>
            <span className={styles.metricLabel}>
              <span
                className={styles.legendLine}
                style={{ backgroundColor: REVENUE_SERIES_COLORS.membership }}
                aria-hidden="true"
              />
              Hội viên
            </span>
            <span className={styles.metricValue}>
              {formatVnd(model.totalMembershipRevenue)}
            </span>
          </div>
          <div className={styles.summaryMetric}>
            <span className={styles.metricLabel}>Số đơn in tạo mới</span>
            <span className={styles.metricValue}>
              {formatNumber(model.totalOrders)} đơn
            </span>
          </div>
        </div>

        <div className={styles.legend} aria-label="Chú giải chuỗi dữ liệu">
          <span className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ backgroundColor: REVENUE_SERIES_COLORS.print }}
              aria-hidden="true"
            />
            <span>Doanh thu in ấn</span>
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ backgroundColor: REVENUE_SERIES_COLORS.membership }}
              aria-hidden="true"
            />
            <span>Doanh thu hội viên</span>
          </span>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div
          className={styles.chartViewport}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <svg
            viewBox={`0 0 ${model.dimensions.width} ${model.dimensions.height}`}
            className={styles.svg}
            role="img"
            aria-label={`Biểu đồ doanh thu từ ${formatIsoDateVi(range.from)} đến ${formatIsoDateVi(range.to)}`}
          >
            {/* Horizontal hairline gridlines & Y ticks */}
            {model.yTicks.map((tick) => {
              const isBaseline = tick.value === 0;
              return (
                <g key={tick.value}>
                  <line
                    x1={model.plotLeft}
                    x2={model.plotRight}
                    y1={tick.y}
                    y2={tick.y}
                    stroke={isBaseline ? "#cbc5bf" : "#e6e2dd"}
                    strokeWidth={1}
                  />
                  <text
                    x={model.plotLeft - 10}
                    y={tick.y + 4}
                    textAnchor="end"
                    className={styles.axisText}
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* Series marks */}
            {isSingleBucket ? (
              (() => {
                const pt = model.points[0];
                const barWidth = 24;
                const gap = 2;
                const printX = pt.x - barWidth - gap / 2;
                const memberX = pt.x + gap / 2;
                const printHeight = Math.max(0, model.plotBottom - pt.printY);
                const memberHeight = Math.max(0, model.plotBottom - pt.membershipY);

                return (
                  <g>
                    <path
                      d={buildRoundedTopBarPath(printX, pt.printY, barWidth, printHeight)}
                      fill={REVENUE_SERIES_COLORS.print}
                    />
                    <path
                      d={buildRoundedTopBarPath(
                        memberX,
                        pt.membershipY,
                        barWidth,
                        memberHeight,
                      )}
                      fill={REVENUE_SERIES_COLORS.membership}
                    />
                  </g>
                );
              })()
            ) : (
              <g>
                {model.membershipAreaPath ? (
                  <path
                    d={model.membershipAreaPath}
                    fill={REVENUE_SERIES_COLORS.membership}
                    fillOpacity={0.08}
                  />
                ) : null}
                {model.printAreaPath ? (
                  <path
                    d={model.printAreaPath}
                    fill={REVENUE_SERIES_COLORS.print}
                    fillOpacity={0.09}
                  />
                ) : null}

                {model.membershipLinePath ? (
                  <path
                    d={model.membershipLinePath}
                    fill="none"
                    stroke={REVENUE_SERIES_COLORS.membership}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {model.printLinePath ? (
                  <path
                    d={model.printLinePath}
                    fill="none"
                    stroke={REVENUE_SERIES_COLORS.print}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </g>
            )}

            {/* Vertical crosshair on active bucket */}
            {activePoint && !isSingleBucket ? (
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={model.plotTop}
                y2={model.plotBottom}
                stroke="#cbc5bf"
                strokeWidth={1}
              />
            ) : null}

            {/* Point markers with 2px white surface ring */}
            {!isSingleBucket
              ? model.points.map((pt) => {
                  const isActive = activePoint?.index === pt.index;
                  const baseRadius = model.points.length <= 16 ? 4 : 3;
                  const radius = isActive ? 5.5 : baseRadius;

                  return (
                    <g key={pt.bucket}>
                      <circle
                        cx={pt.x}
                        cy={pt.membershipY}
                        r={radius}
                        fill={REVENUE_SERIES_COLORS.membership}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.printY}
                        r={radius}
                        fill={REVENUE_SERIES_COLORS.print}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    </g>
                  );
                })
              : null}

            {/* X-axis tick labels */}
            {model.points.map((pt) =>
              pt.showXAxisLabel ? (
                <text
                  key={`x-${pt.bucket}`}
                  x={pt.x}
                  y={model.plotBottom + 20}
                  textAnchor="middle"
                  className={styles.axisText}
                >
                  {pt.shortLabel}
                </text>
              ) : null,
            )}

            {/* Full-bucket interactive hit targets for pointer & keyboard */}
            {model.points.map((pt) => (
              <rect
                key={`hit-${pt.bucket}`}
                x={pt.hitX}
                y={model.plotTop}
                width={pt.hitWidth}
                height={model.plotHeight}
                fill="transparent"
                className={styles.hitRect}
                tabIndex={0}
                role="button"
                aria-label={`${pt.fullLabel}: In ấn ${formatVnd(pt.printRevenueVnd)}, Hội viên ${formatVnd(pt.membershipRevenueVnd)}, ${pt.orderCount} đơn`}
                onMouseEnter={() => setActiveIndex(pt.index)}
                onFocus={() => setActiveIndex(pt.index)}
                onClick={() => setActiveIndex(pt.index)}
              />
            ))}
          </svg>

          {activePoint ? (
            <div
              className={styles.tooltip}
              role="status"
              style={{
                left: `${Math.min(
                  86,
                  Math.max(12, (activePoint.x / model.dimensions.width) * 100),
                )}%`,
                transform: isRightHalf ? "translateX(-104%)" : "translateX(8%)",
              }}
            >
              <p className={styles.tooltipTitle}>{activePoint.fullLabel}</p>
              <div className={styles.tooltipList}>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipSeriesLabel}>
                    <span
                      className={styles.tooltipStrokeKey}
                      style={{ backgroundColor: REVENUE_SERIES_COLORS.print }}
                      aria-hidden="true"
                    />
                    Doanh thu in ấn
                  </span>
                  <span className={styles.tooltipValue}>
                    {formatVnd(activePoint.printRevenueVnd)}
                  </span>
                </div>

                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipSeriesLabel}>
                    <span
                      className={styles.tooltipStrokeKey}
                      style={{ backgroundColor: REVENUE_SERIES_COLORS.membership }}
                      aria-hidden="true"
                    />
                    Doanh thu hội viên
                  </span>
                  <span className={styles.tooltipValue}>
                    {formatVnd(activePoint.membershipRevenueVnd)}
                  </span>
                </div>

                <div className={`${styles.tooltipRow} ${styles.tooltipDivider}`}>
                  <span className={styles.tooltipSeriesLabel}>Tổng doanh thu</span>
                  <span className={styles.tooltipValue}>
                    {formatVnd(activePoint.totalRevenueVnd)}
                  </span>
                </div>

                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipSeriesLabel}>Số đơn in</span>
                  <span className={styles.tooltipValue}>
                    {formatNumber(activePoint.orderCount)} đơn
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Accessible table twin for screen readers when visual chart is active */}
          <table className="sr-only">
            <caption>Bảng số liệu doanh thu theo {GRANULARITY_LABEL[range.granularity]}</caption>
            <thead>
              <tr>
                <th scope="col">Thời gian</th>
                <th scope="col">Doanh thu in ấn</th>
                <th scope="col">Doanh thu hội viên</th>
                <th scope="col">Tổng doanh thu</th>
                <th scope="col">Số đơn in</th>
              </tr>
            </thead>
            <tbody>
              {model.points.map((pt) => (
                <tr key={`sr-${pt.bucket}`}>
                  <td>{pt.fullLabel}</td>
                  <td>{formatVnd(pt.printRevenueVnd)}</td>
                  <td>{formatVnd(pt.membershipRevenueVnd)}</td>
                  <td>{formatVnd(pt.totalRevenueVnd)}</td>
                  <td>{formatNumber(pt.orderCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Thời gian</th>
                <th scope="col" className={styles.alignRight}>
                  Doanh thu in ấn
                </th>
                <th scope="col" className={styles.alignRight}>
                  Doanh thu hội viên
                </th>
                <th scope="col" className={styles.alignRight}>
                  Tổng doanh thu
                </th>
                <th scope="col" className={styles.alignRight}>
                  Số đơn in
                </th>
              </tr>
            </thead>
            <tbody>
              {model.points.map((pt) => (
                <tr key={`row-${pt.bucket}`}>
                  <td>{pt.fullLabel}</td>
                  <td className={styles.alignRight}>{formatVnd(pt.printRevenueVnd)}</td>
                  <td className={styles.alignRight}>
                    {formatVnd(pt.membershipRevenueVnd)}
                  </td>
                  <td className={styles.alignRight}>
                    <strong>{formatVnd(pt.totalRevenueVnd)}</strong>
                  </td>
                  <td className={styles.alignRight}>{formatNumber(pt.orderCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
