import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PrintShippingSlip } from "@/features/orders/components";
import { getOrderDetail } from "@/features/orders/queries";
import type { OrderDetail } from "@/types/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phiếu giao hàng",
};

export default async function AdminOrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let detail: OrderDetail | null = null;
  let loadError: string | null = null;

  try {
    detail = await getOrderDetail(id);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Không thể tải dữ liệu phiếu giao hàng.";
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <PageHeader
          title="In phiếu giao hàng"
          breadcrumbs={[
            { label: "Đơn hàng", href: "/admin/orders" },
            { label: "Phiếu giao hàng" },
          ]}
        />
        <ErrorState
          title="Không thể tải dữ liệu phiếu giao hàng"
          message={loadError}
          retryHref={`/admin/orders/${id}/print`}
        />
      </div>
    );
  }

  if (!detail) {
    notFound();
  }

  return <PrintShippingSlip detail={detail} />;
}
