import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import type { RevenueSeriesPoint } from "@/types/admin";
import { buildDashboardHref, type DashboardRange } from "../date-range";
import { fetchRevenueSeries } from "../queries";
import { RevenueChartClient } from "./RevenueChartClient";

export async function RevenueChartSection({ range }: { range: DashboardRange }) {
  let series: RevenueSeriesPoint[];
  try {
    series = await fetchRevenueSeries(range);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải chuỗi dữ liệu doanh thu.";
    return (
      <Card>
        <ErrorState
          title="Không thể tải biểu đồ doanh thu"
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

  if (series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Biểu đồ doanh thu</CardTitle>
            <CardDescription>
              Không có dữ liệu doanh thu trong khoảng thời gian đã chọn.
            </CardDescription>
          </div>
        </CardHeader>
        <EmptyState
          title="Chưa có dữ liệu doanh thu"
          description="Hãy mở rộng khoảng thời gian để xem biến động doanh thu in ấn và hội viên."
        />
      </Card>
    );
  }

  return <RevenueChartClient series={series} range={range} />;
}
