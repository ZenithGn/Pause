"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit2, PauseCircle, PlayCircle, Plus, Trash2, Users } from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  FilterBar,
  PageHeader,
  StatusChip,
  Switch,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { formatNumber, formatVnd } from "@/lib/format";
import type { MembershipPlan } from "@/types/admin";
import {
  deleteMembershipPlanAction,
  toggleMembershipPlanActiveAction,
} from "../actions";
import { formatStorageGb, MEMBERSHIP_DURATION_LABELS } from "../schemas";
import styles from "./PlansView.module.css";

export interface PlansViewProps {
  plans: MembershipPlan[];
  includeInactive: boolean;
}

export function PlansView({ plans, includeInactive }: PlansViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [isFilterPending, startFilterTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MembershipPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inUseTarget, setInUseTarget] = useState<{
    plan: MembershipPlan;
    message: string;
  } | null>(null);
  const [isDeactivatingInUse, setIsDeactivatingInUse] = useState(false);

  const activePlansCount = plans.filter((plan) => plan.is_active).length;
  const totalActiveSubscribers = plans.reduce(
    (sum, plan) => sum + (plan.active_subscriber_count ?? 0),
    0,
  );

  const handleIncludeInactiveChange = (nextValue: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue) {
      params.delete("includeInactive");
    } else {
      params.set("includeInactive", "false");
    }
    const qs = params.toString();
    startFilterTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleToggleActive = async (plan: MembershipPlan) => {
    setTogglingId(plan.id);
    try {
      const result = await toggleMembershipPlanActiveAction({
        id: plan.id,
        is_active: !plan.is_active,
      });
      if (!result.ok) {
        toast.error("Không thể cập nhật trạng thái gói", result.message);
        return;
      }
      toast.success(result.message ?? "Đã cập nhật trạng thái gói hội viên.");
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsDeleting(true);
    try {
      const result = await deleteMembershipPlanAction(target.id);
      if (!result.ok) {
        if (result.code === "PLAN_IN_USE") {
          setDeleteTarget(null);
          setInUseTarget({ plan: target, message: result.message });
          return;
        }
        toast.error("Không thể xóa gói hội viên", result.message);
        return;
      }

      toast.success(result.message ?? `Đã xóa gói "${target.name}".`);
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInUse = async () => {
    if (!inUseTarget) return;
    setIsDeactivatingInUse(true);
    try {
      const result = await toggleMembershipPlanActiveAction({
        id: inUseTarget.plan.id,
        is_active: false,
      });
      if (!result.ok) {
        toast.error("Không thể ngừng bán gói", result.message);
        return;
      }
      toast.success(
        result.message ?? `Đã chuyển gói "${inUseTarget.plan.name}" sang trạng thái ngừng bán.`,
      );
      setInUseTarget(null);
      router.refresh();
    } finally {
      setIsDeactivatingInUse(false);
    }
  };

  const columns: DataTableColumn<MembershipPlan>[] = [
    {
      key: "name",
      header: "Tên gói",
      render: (row) => (
        <div className={styles.planNameCell}>
          <Link href={`/admin/membership/plans/${row.id}`} className={styles.planLink}>
            {row.name}
          </Link>
          {row.description ? (
            <span className={styles.planDesc} title={row.description}>
              {row.description}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "price_vnd",
      header: "Giá gói",
      align: "right",
      render: (row) => (
        <div className={styles.priceCell}>
          <span className={styles.priceAmount}>{formatVnd(row.price_vnd)}</span>
          <span className={styles.priceCycle}>
            / {row.duration_type === "monthly" ? "tháng" : "năm"}
          </span>
        </div>
      ),
    },
    {
      key: "duration_type",
      header: "Chu kỳ",
      render: (row) => (
        <StatusChip
          tone={row.duration_type === "yearly" ? "info" : "warning"}
          dot={false}
          label={MEMBERSHIP_DURATION_LABELS[row.duration_type]}
        />
      ),
    },
    {
      key: "benefits",
      header: "Quyền lợi lưu trữ",
      render: (row) => (
        <div className={styles.benefitsCell}>
          <span className={styles.benefitMain}>
            +{formatNumber(row.extra_drawers)} ngăn kéo
          </span>
          <span className={styles.benefitSub}>
            Dung lượng: {formatStorageGb(row.extra_storage_bytes)}
          </span>
        </div>
      ),
    },
    {
      key: "access_premium_templates",
      header: "VIP Templates",
      render: (row) => (
        <StatusChip
          tone={row.access_premium_templates ? "primary" : "neutral"}
          dot={false}
          label={row.access_premium_templates ? "VIP Templates" : "Mẫu cơ bản"}
        />
      ),
    },
    {
      key: "subscribers",
      header: "Hội viên",
      render: (row) => (
        <Link
          href={`/admin/membership/subscribers?plan=${row.id}`}
          className={styles.subscriberLink}
          title="Xem danh sách hội viên thuộc gói này"
        >
          <span className={styles.subscriberActive}>
            {formatNumber(row.active_subscriber_count ?? 0)} đang hoạt động
          </span>
          <span className={styles.subscriberTotal}>
            Tổng lượt: {formatNumber(row.subscriber_count ?? 0)}
          </span>
        </Link>
      ),
    },
    {
      key: "is_active",
      header: "Trạng thái",
      render: (row) => (
        <StatusChip
          tone={row.is_active ? "success" : "neutral"}
          label={row.is_active ? "Đang bán" : "Ngừng bán"}
        />
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (row) => (
        <div className={styles.actionsCell}>
          <Link href={`/admin/membership/plans/${row.id}`} className={styles.actionLink}>
            <Button variant="outlined" size="sm" leftIcon={<Edit2 size={14} />}>
              Sửa
            </Button>
          </Link>

          <Button
            variant="tonal"
            size="sm"
            loading={togglingId === row.id}
            leftIcon={
              row.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />
            }
            onClick={() => void handleToggleActive(row)}
          >
            {row.is_active ? "Ngừng bán" : "Mở bán"}
          </Button>

          <Button
            variant="danger"
            size="sm"
            aria-label={`Xóa gói ${row.name}`}
            leftIcon={<Trash2 size={14} />}
            onClick={() => setDeleteTarget(row)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.stack}>
      <PageHeader
        title="Gói hội viên"
        description="Quản lý bảng giá, dung lượng lưu trữ (GB), số ngăn kéo thêm và quyền truy cập VIP Templates."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Gói hội viên" },
        ]}
        actions={
          <>
            <Link href="/admin/membership/subscribers">
              <Button variant="outlined" leftIcon={<Users size={16} />}>
                Danh sách hội viên
              </Button>
            </Link>
            <Link href="/admin/membership/plans/new">
              <Button variant="primary" leftIcon={<Plus size={16} />}>
                Tạo gói mới
              </Button>
            </Link>
          </>
        }
      />

      <section aria-label="Tổng quan gói hội viên" className={styles.summaryGrid}>
        <Card padding="sm">
          <p className={styles.summaryLabel}>Số gói hiển thị</p>
          <p className={styles.summaryValue}>{formatNumber(plans.length)}</p>
        </Card>
        <Card padding="sm">
          <p className={styles.summaryLabel}>Gói đang mở bán</p>
          <p className={styles.summaryValue}>{formatNumber(activePlansCount)}</p>
        </Card>
        <Card padding="sm">
          <p className={styles.summaryLabel}>Hội viên đang hoạt động</p>
          <p className={styles.summaryValue}>{formatNumber(totalActiveSubscribers)}</p>
        </Card>
      </section>

      <FilterBar
        hasActiveFilters={!includeInactive}
        onReset={() => handleIncludeInactiveChange(true)}
        resetLabel="Hiện tất cả gói"
      >
        <Switch
          checked={includeInactive}
          disabled={isFilterPending}
          onCheckedChange={handleIncludeInactiveChange}
          label="Hiển thị gói đã ngừng bán"
          description="Bao gồm các gói đang tạm ngừng bán (is_active = false)."
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={plans}
        syncUrl={false}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            title="Chưa có gói hội viên nào"
            description={
              includeInactive
                ? "Hãy tạo gói hội viên đầu tiên để người dùng nâng cấp trên ứng dụng Pause."
                : "Không có gói nào đang mở bán. Hãy bật hiển thị gói ngừng bán hoặc tạo gói mới."
            }
            action={
              <Link href="/admin/membership/plans/new">
                <Button variant="primary" size="sm" leftIcon={<Plus size={15} />}>
                  Tạo gói mới
                </Button>
              </Link>
            }
          />
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        title={`Xóa gói "${deleteTarget?.name ?? ""}"?`}
        description="Thao tác này sẽ xóa vĩnh viễn gói khỏi hệ thống. Chỉ xóa được khi gói chưa từng có hội viên đăng ký; nếu đã có người mua, hãy chọn Ngừng bán."
        confirmLabel="Xóa gói"
      />

      <Dialog
        open={Boolean(inUseTarget)}
        onClose={() => (isDeactivatingInUse ? undefined : setInUseTarget(null))}
        closeOnBackdrop={!isDeactivatingInUse}
        size="sm"
        title="Không thể xóa gói đang có hội viên"
        description={inUseTarget?.message}
        footer={
          inUseTarget?.plan.is_active ? (
            <>
              <Button
                variant="outlined"
                disabled={isDeactivatingInUse}
                onClick={() => setInUseTarget(null)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                loading={isDeactivatingInUse}
                leftIcon={<PauseCircle size={15} />}
                onClick={() => void handleDeactivateInUse()}
              >
                Ngừng bán gói này
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setInUseTarget(null)}>
              Đã hiểu
            </Button>
          )
        }
      >
        {inUseTarget ? (
          <div className={styles.inUseNotice}>
            Gói <strong>{inUseTarget.plan.name}</strong> đã có{" "}
            <strong>{formatNumber(inUseTarget.plan.subscriber_count ?? 0)}</strong> lượt đăng ký
            (trong đó{" "}
            <strong>{formatNumber(inUseTarget.plan.active_subscriber_count ?? 0)}</strong> đang
            hoạt động).{" "}
            {inUseTarget.plan.is_active
              ? "Bạn nên chuyển gói sang trạng thái ngừng bán (is_active = false) để ẩn khỏi app mà vẫn bảo toàn lịch sử hội viên."
              : "Gói này hiện đã ở trạng thái ngừng bán nên hội viên mới không thể mua thêm."}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
