import type { Metadata } from "next";
import { ErrorState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OrdersListView } from "@/features/orders/components";
import {
  getOrderStatusCounts,
  listOrders,
  parseOrdersSearchParams,
} from "@/features/orders/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng in",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const resolvedParams = await searchParams;
  const parsed = parseOrdersSearchParams(resolvedParams);

  try {
    const [ordersResult, statusCounts] = await Promise.all([
      listOrders({
        status: parsed.status,
        search: parsed.q,
        from: parsed.from,
        to: parsed.to,
        sort: parsed.sort,
        limit: parsed.pagination.limit,
        offset: parsed.pagination.offset,
      }),
      getOrderStatusCounts({
        from: parsed.from,
        to: parsed.to,
      }),
    ]);

    return (
      <OrdersListView
        orders={ordersResult.items}
        statusCounts={statusCounts}
        totalCount={ordersResult.totalCount}
        page={parsed.pagination.page}
        pageSize={parsed.pagination.pageSize}
        activeStatus={parsed.status}
        searchQuery={parsed.q}
        fromDate={parsed.from}
        toDate={parsed.to}
        sort={parsed.sort}
      />
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách đơn hàng từ máy chủ.";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <PageHeader
          title="Quản lý đơn hàng in"
          description="Theo dõi tiến độ xử lý, in ấn, giao hàng và xuất file in photobooth."
        />
        <ErrorState
          title="Không thể tải danh sách đơn hàng"
          message={message}
          retryHref="/admin/orders"
        />
      </div>
    );
  }
}
