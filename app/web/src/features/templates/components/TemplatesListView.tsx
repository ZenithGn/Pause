"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Image as ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  IconButton,
  Pagination,
  SearchInput,
  Select,
  StatusChip,
  Switch,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { PaginatedResult, TemplateCategory, TemplateSummary } from "@/types/admin";
import { deleteTemplateAction, setTemplateActiveAction } from "../actions";
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS } from "../schemas";
import styles from "./TemplatesListView.module.css";

type ViewMode = "table" | "grid";

const CATEGORY_FILTER_OPTIONS = [
  { value: "", label: "Tất cả danh mục" },
  ...TEMPLATE_CATEGORIES.map((cat) => ({
    value: cat,
    label: TEMPLATE_CATEGORY_LABELS[cat],
  })),
];

const TIER_FILTER_OPTIONS = [
  { value: "", label: "Tất cả gói" },
  { value: "free", label: "Miễn phí (Free)" },
  { value: "vip", label: "VIP (Premium)" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hiển thị" },
  { value: "inactive", label: "Đang ẩn" },
];

function getCategoryLabel(category: string): string {
  return (
    TEMPLATE_CATEGORY_LABELS[category as TemplateCategory] ?? category
  );
}

function TemplateThumbnail({
  src,
  alt,
  variant = "table",
}: {
  src: string;
  alt: string;
  variant?: "table" | "card";
}) {
  const [broken, setBroken] = useState(false);

  if (variant === "card") {
    if (!src || broken) {
      return <ImageIcon size={32} aria-hidden="true" />;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={styles.cardImg}
        onError={() => setBroken(true)}
      />
    );
  }

  if (!src || broken) {
    return (
      <div className={styles.thumbWrap} aria-hidden="true">
        <ImageIcon size={18} />
      </div>
    );
  }

  return (
    <div className={styles.thumbWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={styles.thumbImg}
        onError={() => setBroken(true)}
      />
    </div>
  );
}

export interface TemplatesListViewProps {
  result: PaginatedResult<TemplateSummary>;
  initialFilters: {
    q: string;
    category: string;
    tier: string;
    status: string;
  };
}

export function TemplatesListView({
  result,
  initialFilters,
}: TemplatesListViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [optimisticActive, setOptimisticActive] = useState<Record<string, boolean>>({});
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<TemplateSummary | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const updateFilterParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("category");
    params.delete("tier");
    params.delete("status");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters = Boolean(
    initialFilters.q ||
      initialFilters.category ||
      initialFilters.tier ||
      initialFilters.status,
  );

  const resolveIsActive = (item: TemplateSummary): boolean =>
    item.id in optimisticActive ? optimisticActive[item.id] : item.is_active;

  const handleToggleActive = async (item: TemplateSummary, nextActive: boolean) => {
    const previous = resolveIsActive(item);
    setOptimisticActive((prev) => ({ ...prev, [item.id]: nextActive }));
    setTogglingIds((prev) => ({ ...prev, [item.id]: true }));

    try {
      const res = await setTemplateActiveAction({
        id: item.id,
        is_active: nextActive,
      });

      if (!res.ok) {
        setOptimisticActive((prev) => ({ ...prev, [item.id]: previous }));
        toast.error("Cập nhật trạng thái thất bại", res.message);
        return;
      }

      toast.success(
        nextActive ? "Đã hiển thị template" : "Đã ẩn template",
        `"${item.name}" ${nextActive ? "đã hiển thị" : "đã được ẩn"} trên ứng dụng Mobile.`,
      );
      router.refresh();
    } catch {
      setOptimisticActive((prev) => ({ ...prev, [item.id]: previous }));
      toast.error(
        "Lỗi kết nối",
        "Không thể cập nhật trạng thái template. Vui lòng thử lại.",
      );
    } finally {
      setTogglingIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || isDeleting) return;
    const target = deleteTarget;

    startDeleteTransition(async () => {
      const res = await deleteTemplateAction({ id: target.id });
      setDeleteTarget(null);

      if (!res.ok) {
        if (res.code === "TEMPLATE_IN_USE") {
          toast.warning(
            "Không thể xóa template đang được sử dụng",
            `Template "${target.name}" đã có người dùng sử dụng. Hãy tắt công tắc Hiển thị (Ẩn template) thay vì xóa.`,
          );
          return;
        }
        toast.error("Xóa template thất bại", res.message);
        return;
      }

      toast.success("Đã xóa template", `Đã xóa "${target.name}" khỏi hệ thống.`);
      router.refresh();
    });
  };

  const columns: DataTableColumn<TemplateSummary>[] = [
    {
      key: "name",
      header: "Template",
      render: (item) => (
        <div className={styles.nameCell}>
          <TemplateThumbnail src={item.preview_url} alt={item.name} />
          <div>
            <Link href={`/admin/templates/${item.id}`} className={styles.nameLink}>
              {item.name}
            </Link>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Danh mục",
      render: (item) => (
        <StatusChip
          tone="neutral"
          dot={false}
          label={getCategoryLabel(item.category)}
        />
      ),
    },
    {
      key: "slot_count",
      header: "Số slot",
      align: "center",
      render: (item) => <span>{item.slot_count} ảnh</span>,
    },
    {
      key: "is_premium",
      header: "Gói",
      render: (item) => (
        <StatusChip
          status={item.is_premium ? "vip" : "free"}
          label={item.is_premium ? "VIP" : "Free"}
        />
      ),
    },
    {
      key: "is_active",
      header: "Hiển thị",
      render: (item) => {
        const checked = resolveIsActive(item);
        return (
          <Switch
            checked={checked}
            disabled={Boolean(togglingIds[item.id])}
            onCheckedChange={(nextVal) => void handleToggleActive(item, nextVal)}
            aria-label={`Chuyển trạng thái hiển thị của ${item.name}`}
            label={checked ? "Hiển thị" : "Đang ẩn"}
          />
        );
      },
    },
    {
      key: "usage_count",
      header: "Lượt dùng",
      align: "right",
      render: (item) => <span>{formatNumber(item.usage_count)}</span>,
    },
    {
      key: "updated_at",
      header: "Cập nhật",
      render: (item) => <span>{formatDateTime(item.updated_at)}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (item) => (
        <div className={styles.rowActions}>
          <Link href={`/admin/templates/${item.id}`}>
            <IconButton aria-label={`Chỉnh sửa ${item.name}`} variant="standard">
              <Pencil size={16} />
            </IconButton>
          </Link>
          <IconButton
            aria-label={`Xóa ${item.name}`}
            variant="danger"
            onClick={() => setDeleteTarget(item)}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      title={
        hasActiveFilters
          ? "Không tìm thấy template phù hợp"
          : "Chưa có template photobooth nào"
      }
      description={
        hasActiveFilters
          ? "Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc hiện tại."
          : "Tạo template photobooth đầu tiên với trình thiết kế bố cục trực quan."
      }
      action={
        hasActiveFilters ? (
          <Button variant="outlined" size="sm" onClick={handleResetFilters}>
            Xóa bộ lọc
          </Button>
        ) : (
          <Link href="/admin/templates/new">
            <Button variant="primary" size="sm" leftIcon={<Plus size={15} />}>
              Tạo template mới
            </Button>
          </Link>
        )
      }
    />
  );

  return (
    <div className={styles.root}>
      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
        actions={
          <div className={styles.viewToggle} role="group" aria-label="Kiểu hiển thị">
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === "table" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
            >
              <List size={14} aria-hidden="true" />
              <span>Bảng</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              <span>Lưới</span>
            </button>
          </div>
        }
      >
        <div className={styles.searchField}>
          <SearchInput
            paramName="q"
            defaultValue={initialFilters.q}
            placeholder="Tìm theo tên template..."
            ariaLabel="Tìm kiếm theo tên template"
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo danh mục"
            value={initialFilters.category}
            options={CATEGORY_FILTER_OPTIONS}
            onChange={(e) => updateFilterParam("category", e.target.value)}
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo gói Free/VIP"
            value={initialFilters.tier}
            options={TIER_FILTER_OPTIONS}
            onChange={(e) => updateFilterParam("tier", e.target.value)}
          />
        </div>

        <div className={styles.filterField}>
          <Select
            aria-label="Lọc theo trạng thái hiển thị"
            value={initialFilters.status}
            options={STATUS_FILTER_OPTIONS}
            onChange={(e) => updateFilterParam("status", e.target.value)}
          />
        </div>
      </FilterBar>

      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={result.items}
          rowKey={(item) => item.id}
          emptyState={emptyState}
        />
      ) : result.items.length === 0 ? (
        emptyState
      ) : (
        <div className={styles.cardGrid}>
          {result.items.map((item) => {
            const checked = resolveIsActive(item);
            return (
              <article key={item.id} className={styles.templateCard}>
                <Link href={`/admin/templates/${item.id}`} className={styles.cardMedia}>
                  <TemplateThumbnail src={item.preview_url} alt={item.name} variant="card" />
                  <div className={styles.cardBadges}>
                    <StatusChip
                      status={item.is_premium ? "vip" : "free"}
                      label={item.is_premium ? "VIP" : "Free"}
                    />
                    <StatusChip
                      tone="neutral"
                      dot={false}
                      label={`${item.slot_count} slot`}
                    />
                  </div>
                </Link>

                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <Link href={`/admin/templates/${item.id}`} className={styles.cardTitle}>
                      {item.name}
                    </Link>
                    <StatusChip
                      tone="neutral"
                      dot={false}
                      label={getCategoryLabel(item.category)}
                    />
                  </div>

                  <div className={styles.cardMeta}>
                    <span>{formatNumber(item.usage_count)} lượt dùng</span>
                    <span>•</span>
                    <span>{formatDateTime(item.updated_at)}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <Switch
                    checked={checked}
                    disabled={Boolean(togglingIds[item.id])}
                    onCheckedChange={(nextVal) =>
                      void handleToggleActive(item, nextVal)
                    }
                    label={checked ? "Hiển thị" : "Đang ẩn"}
                    aria-label={`Chuyển trạng thái hiển thị của ${item.name}`}
                  />

                  <div className={styles.rowActions}>
                    <Link href={`/admin/templates/${item.id}`}>
                      <IconButton aria-label={`Chỉnh sửa ${item.name}`}>
                        <Pencil size={16} />
                      </IconButton>
                    </Link>
                    <IconButton
                      aria-label={`Xóa ${item.name}`}
                      variant="danger"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        loading={isDeleting}
        title="Xác nhận xóa template"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa template "${deleteTarget.name}"? Nếu template đã từng được sử dụng, bạn nên ẩn template thay vì xóa.`
            : undefined
        }
        confirmLabel="Xóa template"
        cancelLabel="Hủy"
      />
    </div>
  );
}
