"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info, Save } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  PageHeader,
  Select,
  StatusChip,
  Switch,
  TextField,
  Textarea,
  useToast,
} from "@/components/ui";
import { formatDateTime, formatNumber, formatVnd } from "@/lib/format";
import type { MembershipDurationType, MembershipPlan } from "@/types/admin";
import { upsertMembershipPlanAction } from "../actions";
import {
  bytesToGb,
  gbToBytes,
  MEMBERSHIP_DURATION_LABELS,
  membershipPlanFormSchema,
  type MembershipPlanFormValues,
} from "../schemas";
import styles from "./MembershipPlanForm.module.css";

export interface MembershipPlanFormProps {
  mode: "create" | "edit";
  initialPlan?: MembershipPlan;
}

export function MembershipPlanForm({ mode, initialPlan }: MembershipPlanFormProps) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = mode === "edit" && Boolean(initialPlan);

  const [name, setName] = useState<string>(initialPlan?.name ?? "");
  const [description, setDescription] = useState<string>(initialPlan?.description ?? "");
  const [priceVnd, setPriceVnd] = useState<string>(
    initialPlan ? String(initialPlan.price_vnd) : "",
  );
  const [durationType, setDurationType] = useState<MembershipDurationType>(
    initialPlan?.duration_type ?? "yearly",
  );
  const [extraDrawers, setExtraDrawers] = useState<string>(
    initialPlan ? String(initialPlan.extra_drawers) : "0",
  );
  const [storageGb, setStorageGb] = useState<string>(
    initialPlan ? String(bytesToGb(initialPlan.extra_storage_bytes, 4)) : "5",
  );
  const [accessPremiumTemplates, setAccessPremiumTemplates] = useState<boolean>(
    initialPlan ? initialPlan.access_premium_templates : true,
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialPlan ? initialPlan.is_active : true,
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEditValues, setPendingEditValues] =
    useState<MembershipPlanFormValues | null>(null);

  const numericPrice = useMemo(() => {
    const parsed = Number(priceVnd);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
  }, [priceVnd]);

  const numericStorageBytes = useMemo(() => {
    if (storageGb.trim() === "") return null;
    const parsed = Number(storageGb);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return gbToBytes(parsed);
  }, [storageGb]);

  const numericDrawers = useMemo(() => {
    const parsed = Number(extraDrawers);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
  }, [extraDrawers]);

  const getFieldError = (key: string): string | undefined => fieldErrors[key]?.[0];

  const executeSave = async (values: MembershipPlanFormValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await upsertMembershipPlanAction({
        id: isEdit && initialPlan ? initialPlan.id : null,
        name: values.name,
        description: values.description ?? "",
        price_vnd: values.price_vnd,
        duration_type: values.duration_type,
        extra_drawers: values.extra_drawers,
        storage_gb: values.storage_gb,
        access_premium_templates: values.access_premium_templates,
        is_active: values.is_active,
      });

      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setFormError(result.message);
        setPendingEditValues(null);
        toast.error("Không thể lưu gói hội viên", result.message);
        return;
      }

      toast.success(
        result.message ??
          (isEdit
            ? "Đã cập nhật gói hội viên thành công."
            : "Đã tạo gói hội viên mới thành công."),
      );
      setPendingEditValues(null);
      router.push("/admin/membership/plans");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = membershipPlanFormSchema.safeParse({
      id: isEdit && initialPlan ? initialPlan.id : null,
      name,
      description,
      price_vnd: priceVnd,
      duration_type: durationType,
      extra_drawers: extraDrawers,
      storage_gb: storageGb,
      access_premium_templates: accessPremiumTemplates,
      is_active: isActive,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] ? String(issue.path[0]) : "_form";
        if (!nextErrors[key]) nextErrors[key] = [];
        nextErrors[key].push(issue.message);
      }
      setFieldErrors(nextErrors);
      setFormError(parsed.error.issues[0]?.message ?? "Dữ liệu nhập vào chưa hợp lệ.");
      return;
    }

    setFieldErrors({});

    if (isEdit) {
      setPendingEditValues(parsed.data);
      return;
    }

    void executeSave(parsed.data);
  };

  const editChangeSummary = useMemo(() => {
    if (!initialPlan || !pendingEditValues) return [];
    const changes: string[] = [];
    if (pendingEditValues.price_vnd !== initialPlan.price_vnd) {
      changes.push(
        `Giá gói: ${formatVnd(initialPlan.price_vnd)} → ${formatVnd(pendingEditValues.price_vnd)}`,
      );
    }
    if (pendingEditValues.duration_type !== initialPlan.duration_type) {
      changes.push(
        `Chu kỳ: ${MEMBERSHIP_DURATION_LABELS[initialPlan.duration_type]} → ${MEMBERSHIP_DURATION_LABELS[pendingEditValues.duration_type]}`,
      );
    }
    if (pendingEditValues.extra_drawers !== initialPlan.extra_drawers) {
      changes.push(
        `Ngăn kéo thêm: +${formatNumber(initialPlan.extra_drawers)} → +${formatNumber(pendingEditValues.extra_drawers)}`,
      );
    }
    const nextBytes = gbToBytes(pendingEditValues.storage_gb);
    if (nextBytes !== initialPlan.extra_storage_bytes) {
      changes.push(
        `Dung lượng: ${bytesToGb(initialPlan.extra_storage_bytes)} GB → ${pendingEditValues.storage_gb} GB`,
      );
    }
    if (
      pendingEditValues.access_premium_templates !==
      initialPlan.access_premium_templates
    ) {
      changes.push(
        `VIP Templates: ${initialPlan.access_premium_templates ? "Có" : "Không"} → ${pendingEditValues.access_premium_templates ? "Có" : "Không"}`,
      );
    }
    return changes;
  }, [initialPlan, pendingEditValues]);

  return (
    <div className={styles.stack}>
      <PageHeader
        title={isEdit ? `Chỉnh sửa gói: ${initialPlan?.name}` : "Tạo gói hội viên mới"}
        description={
          isEdit
            ? "Cập nhật thông tin hiển thị, giá bán và quyền lợi của gói hội viên."
            : "Thiết lập gói hội viên mới với mức giá, chu kỳ, ngăn kéo thêm và dung lượng đám mây (GB)."
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Gói hội viên", href: "/admin/membership/plans" },
          { label: isEdit ? initialPlan?.name ?? "Chỉnh sửa" : "Tạo gói mới" },
        ]}
        actions={
          <Link href="/admin/membership/plans">
            <Button variant="outlined" leftIcon={<ArrowLeft size={16} />}>
              Quay lại danh sách
            </Button>
          </Link>
        }
      />

      {isEdit && initialPlan ? (
        <div className={styles.noticeBanner} role="note">
          <AlertTriangle size={20} className={styles.noticeIcon} aria-hidden="true" />
          <div className={styles.noticeContent}>
            <p className={styles.noticeTitle}>
              Lưu ý: Thay đổi giá và quyền lợi chỉ áp dụng cho lượt đăng ký mới
            </p>
            <p className={styles.noticeText}>
              Các hội viên đang sử dụng gói này (hiện có{" "}
              <strong>{formatNumber(initialPlan.active_subscriber_count ?? 0)}</strong> hội viên
              đang hoạt động) vẫn giữ nguyên mức giá và quyền lợi đã mua cho đến hết chu kỳ hiện
              tại.
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.layoutGrid}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Thông tin & quyền lợi gói</CardTitle>
              <CardDescription>
                Dung lượng nhập theo đơn vị GB và tự động quy đổi sang bytes (1 GB = 1024³ bytes)
                khi lưu.
              </CardDescription>
            </div>
            {isEdit && initialPlan ? (
              <StatusChip
                tone={isActive ? "success" : "neutral"}
                label={isActive ? "Đang bán" : "Ngừng bán"}
              />
            ) : null}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              {formError ? (
                <div className={styles.formError} role="alert" style={{ marginBottom: 16 }}>
                  {formError}
                </div>
              ) : null}

              <div className={styles.formGrid}>
                <div className={styles.fullSpan}>
                  <TextField
                    label="Tên gói hội viên"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: PAUSE Go, PAUSE Plus, PAUSE Premium"
                    error={getFieldError("name")}
                    maxLength={100}
                  />
                </div>

                <div className={styles.fullSpan}>
                  <Textarea
                    label="Mô tả quyền lợi"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ví dụ: Gói hội viên PAUSE Go: 5GB/năm, 10 ngăn kéo, mở khóa VIP Templates"
                    error={getFieldError("description")}
                    maxLength={500}
                  />
                </div>

                <div>
                  <TextField
                    label="Giá gói (VNĐ)"
                    name="price_vnd"
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={priceVnd}
                    onChange={(e) => setPriceVnd(e.target.value)}
                    placeholder="30000"
                    rightAdornment="VNĐ"
                    error={getFieldError("price_vnd")}
                    helperText={
                      numericPrice !== null
                        ? `Hiển thị cho người dùng: ${formatVnd(numericPrice)}`
                        : "Nhập số nguyên lớn hơn hoặc bằng 0"
                    }
                  />
                </div>

                <div>
                  <Select
                    label="Chu kỳ thanh toán"
                    name="duration_type"
                    required
                    value={durationType}
                    onChange={(e) =>
                      setDurationType(
                        e.target.value === "monthly" ? "monthly" : "yearly",
                      )
                    }
                    error={getFieldError("duration_type")}
                    options={[
                      { value: "yearly", label: "Theo năm (yearly) — Mặc định" },
                      { value: "monthly", label: "Theo tháng (monthly)" },
                    ]}
                  />
                  {durationType === "monthly" ? (
                    <div className={styles.monthlyHint} role="status">
                      <Info size={16} className={styles.noticeIcon} aria-hidden="true" />
                      <span>
                        Lưu ý mô hình kinh doanh: Pause hiện bán gói hội viên theo năm (yearly).
                        Chỉ chọn chu kỳ tháng (monthly) nếu có chiến dịch đặc biệt.
                      </span>
                    </div>
                  ) : null}
                </div>

                <div>
                  <TextField
                    label="Số ngăn kéo thêm"
                    name="extra_drawers"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={extraDrawers}
                    onChange={(e) => setExtraDrawers(e.target.value)}
                    placeholder="10"
                    error={getFieldError("extra_drawers")}
                    helperText="Số ngăn kéo mở rộng thêm so với gói Free mặc định (3 ngăn kéo)."
                  />
                </div>

                <div>
                  <TextField
                    label="Dung lượng lưu trữ (GB)"
                    name="storage_gb"
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={storageGb}
                    onChange={(e) => setStorageGb(e.target.value)}
                    placeholder="5"
                    rightAdornment="GB"
                    error={getFieldError("storage_gb")}
                    helperText={
                      numericStorageBytes !== null
                        ? `Tương đương ${formatNumber(numericStorageBytes)} bytes`
                        : "Nhập số >= 0 (ví dụ: 5, 10, 20 hoặc 0.5)"
                    }
                  />
                </div>

                <div className={`${styles.fullSpan} ${styles.switchSection}`}>
                  <Switch
                    name="access_premium_templates"
                    checked={accessPremiumTemplates}
                    onCheckedChange={setAccessPremiumTemplates}
                    label="Mở khóa kho VIP Templates"
                    description="Cho phép hội viên sử dụng toàn bộ mẫu photobooth trả phí (is_premium = true)."
                  />

                  <Switch
                    name="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    label="Đang mở bán gói này"
                    description="Khi tắt, gói sẽ bị ẩn khỏi màn hình nâng cấp của người dùng mới nhưng vẫn giữ quyền lợi cho hội viên cũ."
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <Link href="/admin/membership/plans">
                  <Button variant="outlined" disabled={isSubmitting}>
                    Hủy
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  leftIcon={<Save size={16} />}
                >
                  {isEdit ? "Lưu thay đổi" : "Tạo gói hội viên"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className={styles.sideCard}>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Xem trước hiển thị</CardTitle>
                <CardDescription>Thông tin tóm tắt của gói khi cấu hình</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className={styles.previewBox}>
                <span className={styles.previewTitle}>
                  {name.trim() || "Tên gói hội viên"}
                </span>
                <span className={styles.previewPrice}>
                  {numericPrice !== null ? formatVnd(numericPrice) : "—"} /{" "}
                  {durationType === "monthly" ? "tháng" : "năm"}
                </span>
                <ul className={styles.previewBullets}>
                  <li>+{formatNumber(numericDrawers)} ngăn kéo lưu trữ</li>
                  <li>
                    Dung lượng đám mây:{" "}
                    {storageGb.trim() !== "" &&
                    Number.isFinite(Number(storageGb)) &&
                    Number(storageGb) >= 0
                      ? `${Number(storageGb)} GB`
                      : "0 GB"}
                  </li>
                  <li>
                    {accessPremiumTemplates
                      ? "Mở khóa toàn bộ VIP Templates"
                      : "Chỉ dùng mẫu cơ bản"}
                  </li>
                  <li>Trạng thái: {isActive ? "Đang mở bán" : "Ngừng bán"}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {isEdit && initialPlan ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Thống kê gói hiện tại</CardTitle>
                  <CardDescription>Số liệu hội viên đang sử dụng gói</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Đang hoạt động</span>
                    <span className={styles.metaValue}>
                      {formatNumber(initialPlan.active_subscriber_count ?? 0)} hội viên
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Tổng lượt đăng ký</span>
                    <span className={styles.metaValue}>
                      {formatNumber(initialPlan.subscriber_count ?? 0)} lượt
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Ngày tạo</span>
                    <span className={styles.metaValue}>
                      {formatDateTime(initialPlan.created_at)}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Link href={`/admin/membership/subscribers?plan=${initialPlan.id}`}>
                    <Button variant="outlined" size="sm" fullWidth>
                      Xem hội viên của gói này
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingEditValues)}
        onClose={() => setPendingEditValues(null)}
        onConfirm={() => {
          if (pendingEditValues) {
            void executeSave(pendingEditValues);
          }
        }}
        loading={isSubmitting}
        title="Xác nhận cập nhật gói hội viên?"
        description="Thay đổi về giá hoặc quyền lợi CHỈ áp dụng cho các lượt đăng ký mới."
        confirmLabel="Xác nhận lưu"
      >
        <div className={styles.confirmNotice}>
          Các hội viên đang hoạt động (
          <strong>{formatNumber(initialPlan?.active_subscriber_count ?? 0)}</strong> tài khoản) sẽ
          tiếp tục giữ nguyên mức giá và quyền lợi tại thời điểm họ đã thanh toán.
        </div>

        {editChangeSummary.length > 0 ? (
          <div>
            <p style={{ fontSize: "var(--text-label-lg)", fontWeight: 600, marginBottom: 6 }}>
              Thay đổi sắp áp dụng:
            </p>
            <ul className={styles.diffList}>
              {editChangeSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
