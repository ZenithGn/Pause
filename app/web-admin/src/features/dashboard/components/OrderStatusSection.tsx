import React from "react";
import { Card, ErrorState } from "@/components/ui";
import type { OrderStatusCount } from "@/types/admin";
import { buildDashboardHref, type DashboardRange } from "../date-range";
import { fetchOrderStatusCounts } from "../queries";
import { OrderStatusClient } from "./OrderStatusClient";

export async function OrderStatusSection({ range }: { range: DashboardRange }) {
  let counts: OrderStatusCount[];
  try {
    counts = await fetchOrderStatusCounts(range);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải phân bổ trạng thái đơn hàng.";
    return (
      <Card>
        <ErrorState
          title="Không thể tải trạng thái đơn hàng"
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

  return <OrderStatusClient counts={counts} range={range} />;
}
