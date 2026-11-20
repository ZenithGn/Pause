"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, ExternalLink, Package } from "lucide-react";
import {
  Button,
  DataTable,
  DateRangePicker,
  EmptyState,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusChip,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { formatDateTime, formatNumber, formatVnd } from "@/lib/format";
import type { OrderStatus, OrderStatusCount, OrderSummary } from "@/types/admin";
import { exportFilteredOrdersCsvAction } from "../actions";
import { buildOrdersCsv } from "../csv";
import type { OrderSortOption } from "../schemas";
import {
  getPaymentMethodLabel,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from "../status-machine";
import { SafeOrderImage } from "./SafeOrderImage";
import styles from "./OrdersListView.module.css";

export interface OrdersListViewProps {
  orders: OrderSummary[];
  statusCounts: OrderStatusCount[];
  totalCount: number;
  page: number;
  pageSize: number;
  activeStatus?: OrderStatus;
  searchQuery?: string;
  fromDate?: string;
  toDate?: string;
  sort: OrderSortOption;
}

const SORT_OPTIONS: Array<{ value: OrderSortOption; label: string }> = [
  { value: "created_at.desc", label: "Mới nhất" },
  { value: "created_at.asc", label: "Cũ nhất" },
  { value: "total_price_vnd.desc", label: "Giá trị cao nhất" },
  { value: "total_price_vnd.asc", label: "Giá trị thấp nhất" },
  { value: "status.asc", label: "Trạng thái (A–Z)" },
  { value: "status.desc", label: "Trạng thái (Z–A)" },
];

function triggerCsvDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function OrdersListView({
  orders,
  statusCounts,
  totalCount,
  page,
  pageSize,
  activeStatus,
  searchQuery,
  fromDate,
  toDate,
  sort,
}: OrdersListViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [, startTransition] = useTransition();

  const countMap = useMemo(() => {
    const map = new Map<OrderStatus, number>();
    for (const status of ORDER_STATUSES) map.set(status, 0);
    for (const item of statusCounts) {
      map.set(item.status, item.count);
    }
    return map;
  }, [statusCounts]);

  const totalAllStatuses = useMemo(
    () => statusCounts.reduce((sum, entry) => sum + entry.count, 0),
    [statusCounts],
  );

  const hasActiveFilters = Boolean(
    activeStatus ||
      searchQuery ||
      fromDate ||
      toDate ||
      (sort && sort !== "created_at.desc"),
  );

  const updateQueryParams = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleStatusTabClick = (nextStatus?: OrderStatus) => {
    updateQueryParams((params) => {
      if (nextStatus) {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }
    });
  };

  const handleSortSelect = (nextSort: string) => {
    updateQueryParams((params) => {
      if (nextSort && nextSort !== "created_at.desc") {
        params.set("sort", nextSort);
      } else {
        params.delete("sort");
      }
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (pageSize !== 20) {
        params.set("pageSize", String(pageSize));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const handleExportCsv = async () => {
    if (totalCount === 0) {
      toast.info("Không có đơn hàng nào để xuất CSV.");
      return;
    }

    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const statusSuffix = activeStatus ?? "tat-ca";
    const filename = `pause-don-hang-${statusSuffix}-${todayStr}.csv`;

    // If every filtered row is already on this page, build CSV directly in browser.
    if (orders.length >= totalCount) {
      const csv = buildOrdersCsv(orders);
      triggerCsvDownload(csv, filename);
      toast.success(`Đã xuất ${formatNumber(orders.length)} đơn hàng ra tệp CSV.`);
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportFilteredOrdersCsvAction({
        q: searchQuery,
        status: activeStatus,
        from: fromDate,
        to: toDate,
        sort,
      });

      if (!result.ok) {
        toast.error("Xuất CSV thất bại", result.message);
        return;
      }

      triggerCsvDownload(result.data.csv, filename);
      if (result.data.truncated) {
        toast.warning(
          `Đã xuất ${formatNumber(result.data.count)} đơn hàng đầu tiên.`,
          "Danh sách vượt quá giới hạn 5.000 dòng mỗi lần xuất.",
        );
      } else {
        toast.success(`Đã xuất ${formatNumber(result.data.count)} đơn hàng ra tệp CSV.`);
      }
    } catch {
      toast.error("Không thể xuất tệp CSV. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const columns: DataTableColumn<OrderSummary>[] = [
    {
      key: "short_code",
      header: "Mã đơn",
      render: (row) => (
        <div className={styles.orderCodeCell}>
          <div className={styles.thumbWrap}>
            <SafeOrderImage
              src={row.preview_url}
              alt={`Preview đơn #${row.short_code}`}
              className={styles.thumbImg}
              fallbackText="Ảnh"
            />
          </div>
          <div>
            <Link
              href={`/admin/orders/${row.id}`}
              className={styles.codeLink}
              onClick={(event) => event.stopPropagation()}
            >
              #{row.short_code}
            </Link>
            <p className={styles.subText}>SL: {row.quantity}</p>
          </div>
        </div>
      ),
    },
    {
      key: "customer_name",
      header: "Khách hàng",
      render: (row) => (
        <div>
          <p className={styles.primaryText}>{row.customer_name}</p>
          <p className={styles.subText}>{row.shipping_phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "template_name",
      header: "Template",
      render: (row) => <span>{row.template_name || "—"}</span>,
    },
    {
      key: "total_price_vnd",
      header: "Tổng tiền",
      align: "right",
      sortable: true,
      render: (row) => (
        <span className={styles.amountCell}>{formatVnd(row.total_price_vnd)}</span>
      ),
    },
    {
      key: "payment_method",
      header: "Phương thức TT",
      render: (row) => <span>{getPaymentMethodLabel(row.payment_method)}</span>,
    },
    {
      key: "payment_status",
      header: "TT thanh toán",
      render: (row) => (
        <StatusChip status={row.payment_status ?? "pending"} />
      ),
    },
    {
      key: "status",
      header: "Trạng thái đơn",
      sortable: true,
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "created_at",
      header: "Ngày tạo",
      sortable: true,
      render: (row) => (
        <span className={styles.dateCell}>{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (row) => (
        <Link
          href={`/admin/orders/${row.id}`}
          className={styles.detailLink}
          onClick={(event) => event.stopPropagation()}
        >
          <span>Chi tiết</span>
          <ExternalLink size={13} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Quản lý đơn hàng in"
        description="Theo dõi tiến độ xử lý, in ấn, giao hàng và xuất file in photobooth."
        actions={
          <Button
            variant="outlined"
            leftIcon={<Download size={16} />}
            loading={isExporting}
            disabled={totalCount === 0}
            onClick={() => void handleExportCsv()}
          >
            Xuất CSV
          </Button>
        }
      />

      <div className={styles.tabsScroll}>
        <nav className={styles.tabs} aria-label="Lọc theo trạng thái đơn hàng">
          <button
            type="button"
            className={`${styles.tab} ${!activeStatus ? styles.tabActive : ""}`}
            aria-current={!activeStatus ? "page" : undefined}
            onClick={() => handleStatusTabClick(undefined)}
          >
            <span>Tất cả</span>
            <span className={styles.tabCount}>{formatNumber(totalAllStatuses)}</span>
          </button>

          {ORDER_STATUSES.map((status) => {
            const isActive = activeStatus === status;
            return (
              <button
                key={status}
                type="button"
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleStatusTabClick(status)}
              >
                <span>{ORDER_STATUS_LABELS[status]}</span>
                <span className={styles.tabCount}>
                  {formatNumber(countMap.get(status) ?? 0)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <SearchInput
          className={styles.searchControl}
          placeholder="Tìm mã đơn, tên khách, SĐT..."
          ariaLabel="Tìm kiếm đơn hàng theo mã đơn, tên khách hoặc số điện thoại"
          defaultValue={searchQuery ?? ""}
        />

        <DateRangePicker
          fromValue={fromDate ?? ""}
          toValue={toDate ?? ""}
        />

        <Select
          aria-label="Sắp xếp đơn hàng"
          className={styles.sortControl}
          fullWidth={false}
          value={sort}
          options={SORT_OPTIONS}
          onChange={(event) => handleSortSelect(event.target.value)}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={orders}
        sort={sort}
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        emptyState={
          <EmptyState
            icon={<Package size={24} />}
            title={
              hasActiveFilters
                ? "Không tìm thấy đơn hàng phù hợp"
                : "Chưa có đơn hàng in nào"
            }
            description={
              hasActiveFilters
                ? "Thử thay đổi từ khóa tìm kiếm, khoảng ngày hoặc trạng thái lọc."
                : "Khi người dùng đặt in photobooth từ ứng dụng Pause, đơn hàng sẽ hiển thị tại đây."
            }
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

      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} />
    </div>
  );
}
