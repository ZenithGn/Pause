"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Eye } from "lucide-react";
import {
  Button,
  DataTable,
  DateRangePicker,
  Dialog,
  EmptyState,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusChip,
  useToast,
  type DataTableColumn,
  type StatusTone,
} from "@/components/ui";
import { formatDateTime, formatVnd } from "@/lib/format";
import type {
  PaginatedResult,
  PaymentStatus,
  TransactionItem,
  TransactionType,
} from "@/types/admin";
import styles from "./TransactionsView.module.css";

const TX_TYPE_LABELS: Record<TransactionType, { label: string; tone: StatusTone }> = {
  print_order: { label: "Đơn hàng in", tone: "info" },
  membership: { label: "Gói hội viên", tone: "primary" },
  drawer_purchase: { label: "Mua ngăn kéo", tone: "neutral" },
};

const TX_STATUS_CONFIG: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Chờ thanh toán", tone: "warning" },
  success: { label: "Thành công", tone: "success" },
  failed: { label: "Thất bại", tone: "error" },
  refunded: { label: "Đã hoàn tiền", tone: "neutral" },
};

function formatPaymentMethod(method: string | null): string {
  if (!method) return "—";
  const normalized = method.trim().toLowerCase();
  if (normalized === "vietqr_payos") return "VietQR / PayOS";
  if (normalized === "vietqr") return "VietQR";
  if (normalized === "cod") return "COD";
  return method;
}

export interface TransactionsViewProps {
  result: PaginatedResult<TransactionItem>;
  activeFilters: {
    search: string;
    type: string;
    status: string;
    from: string;
    to: string;
  };
}

export function TransactionsView({ result, activeFilters }: TransactionsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.set("page", "1");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleTypeChange = (nextType: string) => {
    updateParams((params) => {
      if (nextType) {
        params.set("type", nextType);
      } else {
        params.delete("type");
      }
    });
  };

  const handleStatusChange = (nextStatus: string) => {
    updateParams((params) => {
      if (nextStatus) {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }
    });
  };

  const handleResetFilters = () => {
    updateParams((params) => {
      params.delete("q");
      params.delete("search");
      params.delete("type");
      params.delete("status");
      params.delete("from");
      params.delete("to");
    });
  };

  const handleCopyJson = async (metadata: Record<string, unknown> | null | undefined) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metadata ?? null, null, 2));
      toast.success("Đã sao chép metadata JSON.");
    } catch {
      toast.error("Không thể sao chép vào clipboard.");
    }
  };

  const hasActiveFilters = Boolean(
    activeFilters.search ||
      activeFilters.type ||
      activeFilters.status ||
      activeFilters.from ||
      activeFilters.to,
  );

  const columns: DataTableColumn<TransactionItem>[] = [
    {
      key: "order_code",
      header: "Mã giao dịch",
      render: (row) => (
        <div className={styles.codeCell}>
          <span className={styles.orderCode}>
            {row.order_code !== null && row.order_code !== undefined
              ? `#${row.order_code}`
              : "—"}
          </span>
          <span className={styles.txIdSub} title={row.id}>
            {row.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: "display_name",
      header: "Người dùng",
      render: (row) => (
        <Link href={`/admin/users/${row.user_id}`} className={styles.userLink}>
          {row.display_name}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Loại giao dịch",
      render: (row) => {
        const typeMeta = TX_TYPE_LABELS[row.type];
        return <StatusChip tone={typeMeta.tone} dot={false} label={typeMeta.label} />;
      },
    },
    {
      key: "amount_vnd",
      header: "Số tiền",
      align: "right",
      render: (row) => <span className={styles.amount}>{formatVnd(row.amount_vnd)}</span>,
    },
    {
      key: "payment_gateway_ref",
      header: "Cổng & Mã tham chiếu",
      render: (row) => (
        <div className={styles.gatewayCell}>
          <span className={styles.gatewayMethod}>
            {formatPaymentMethod(row.payment_method)}
          </span>
          <span className={styles.gatewayRef}>
            {row.payment_gateway_ref ?? "Chưa có mã gateway"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => {
        const statusMeta = TX_STATUS_CONFIG[row.status];
        return <StatusChip tone={statusMeta.tone} label={statusMeta.label} />;
      },
    },
    {
      key: "created_at",
      header: "Thời gian",
      render: (row) => (
        <span className={styles.dateCell}>{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (row) => (
        <div className={styles.actionsCell}>
          <Button
            variant="outlined"
            size="sm"
            leftIcon={<Eye size={14} />}
            onClick={() => setSelectedTx(row)}
          >
            Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.stack}>
      <PageHeader
        title="Lịch sử giao dịch & đối soát"
        description="Tra cứu toàn bộ giao dịch thanh toán đơn in, gói hội viên và ngăn kéo qua VietQR / PayOS."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Giao dịch" },
        ]}
      />

      <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleResetFilters}>
        <div className={styles.searchField}>
          <SearchInput
            paramName="q"
            placeholder="Tìm order_code, mã gateway, tên hoặc email..."
            ariaLabel="Tìm kiếm giao dịch"
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo loại giao dịch"
            value={activeFilters.type}
            disabled={isPending}
            onChange={(e) => handleTypeChange(e.target.value)}
            options={[
              { value: "", label: "Tất cả loại" },
              { value: "print_order", label: "Đơn hàng in" },
              { value: "membership", label: "Gói hội viên" },
              { value: "drawer_purchase", label: "Mua ngăn kéo" },
            ]}
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo trạng thái giao dịch"
            value={activeFilters.status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "pending", label: "Chờ thanh toán" },
              { value: "success", label: "Thành công" },
              { value: "failed", label: "Thất bại" },
              { value: "refunded", label: "Đã hoàn tiền" },
            ]}
          />
        </div>

        <div className={styles.dateFilterWrap}>
          <DateRangePicker
            fromValue={activeFilters.from}
            toValue={activeFilters.to}
            showPresets
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={result.items}
        syncUrl={false}
        loading={isPending}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            title="Không tìm thấy giao dịch nào"
            description="Không có giao dịch nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm hiện tại."
            action={
              hasActiveFilters ? (
                <Button variant="outlined" size="sm" onClick={handleResetFilters}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
      />

      <Dialog
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        size="lg"
        title={
          selectedTx
            ? `Chi tiết giao dịch ${
                selectedTx.order_code !== null && selectedTx.order_code !== undefined
                  ? `#${selectedTx.order_code}`
                  : selectedTx.id.slice(0, 8).toUpperCase()
              }`
            : "Chi tiết giao dịch"
        }
        description={
          selectedTx ? `ID: ${selectedTx.id} • ${formatDateTime(selectedTx.created_at)}` : undefined
        }
        footer={
          <Button variant="primary" onClick={() => setSelectedTx(null)}>
            Đóng
          </Button>
        }
      >
        {selectedTx ? (
          <>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Khách hàng</span>
                <span className={styles.detailValue}>{selectedTx.display_name}</span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Trạng thái</span>
                <div>
                  <StatusChip
                    tone={TX_STATUS_CONFIG[selectedTx.status].tone}
                    label={TX_STATUS_CONFIG[selectedTx.status].label}
                  />
                </div>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Loại giao dịch</span>
                <span className={styles.detailValue}>
                  {TX_TYPE_LABELS[selectedTx.type].label}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Số tiền</span>
                <span className={styles.detailValue}>
                  {formatVnd(selectedTx.amount_vnd)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Mã đơn cổng thanh toán (order_code)</span>
                <span className={`${styles.detailValue} ${styles.mono}`}>
                  {selectedTx.order_code ?? "—"}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Mã tham chiếu gateway</span>
                <span className={`${styles.detailValue} ${styles.mono}`}>
                  {selectedTx.payment_gateway_ref ?? "—"}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phương thức</span>
                <span className={styles.detailValue}>
                  {formatPaymentMethod(selectedTx.payment_method)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Thời gian tạo</span>
                <span className={styles.detailValue}>
                  {formatDateTime(selectedTx.created_at)}
                </span>
              </div>
            </div>

            <div className={styles.linksRow}>
              <Link href={`/admin/users/${selectedTx.user_id}`}>
                <Button variant="outlined" size="sm" rightIcon={<ExternalLink size={14} />}>
                  Xem hồ sơ người dùng
                </Button>
              </Link>

              {selectedTx.order_id ? (
                <Link href={`/admin/orders/${selectedTx.order_id}`}>
                  <Button variant="tonal" size="sm" rightIcon={<ExternalLink size={14} />}>
                    Xem đơn hàng in
                  </Button>
                </Link>
              ) : null}
            </div>

            <div className={styles.jsonSection}>
              <div className={styles.jsonHeader}>
                <span className={styles.jsonTitle}>Payload Metadata (JSON)</span>
                <Button
                  variant="text"
                  size="sm"
                  leftIcon={<Copy size={14} />}
                  onClick={() => void handleCopyJson(selectedTx.metadata)}
                >
                  Sao chép JSON
                </Button>
              </div>
              <pre className={styles.jsonPre}>
                {selectedTx.metadata
                  ? JSON.stringify(selectedTx.metadata, null, 2)
                  : "null"}
              </pre>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
