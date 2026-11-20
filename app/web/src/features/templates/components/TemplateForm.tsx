"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Select,
  StatusChip,
  Switch,
  TextField,
  useToast,
} from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { LayoutConfig, TemplateCategory, TemplateDetail } from "@/types/admin";
import { deleteTemplateAction, upsertTemplateAction } from "../actions";
import { buildLayoutFromPreset } from "../layout";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  upsertTemplateSchema,
} from "../schemas";
import { TemplateImageUploader } from "./TemplateImageUploader";
import { VisualLayoutEditor } from "./VisualLayoutEditor";
import styles from "./TemplateForm.module.css";

const CATEGORY_OPTIONS = TEMPLATE_CATEGORIES.map((value) => ({
  value,
  label: TEMPLATE_CATEGORY_LABELS[value],
}));

export interface TemplateFormProps {
  initialTemplate?: TemplateDetail | null;
}

export function TemplateForm({ initialTemplate = null }: TemplateFormProps) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(initialTemplate);

  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [category, setCategory] = useState<TemplateCategory>(
    (TEMPLATE_CATEGORIES.includes(initialTemplate?.category as TemplateCategory)
      ? initialTemplate?.category
      : "general") as TemplateCategory,
  );
  const [isPremium, setIsPremium] = useState<boolean>(
    initialTemplate?.is_premium ?? false,
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialTemplate?.is_active ?? true,
  );
  const [previewUrl, setPreviewUrl] = useState<string>(
    initialTemplate?.preview_url ?? "",
  );
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    () => initialTemplate?.layout_config ?? buildLayoutFromPreset("duo-2"),
  );

  const [jsonHasErrors, setJsonHasErrors] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleFrameUrlChange = (nextFrameUrl: string) => {
    const normalized = nextFrameUrl.trim() ? nextFrameUrl.trim() : null;
    setLayoutConfig((prev) => ({
      ...prev,
      frame_url: normalized,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setFormError(null);
    setFieldErrors({});

    if (jsonHasErrors) {
      const msg =
        "Cấu hình JSON đang có lỗi. Vui lòng sửa các dòng báo lỗi trước khi lưu.";
      setFormError(msg);
      toast.error("Cấu hình bố cục chưa hợp lệ", msg);
      return;
    }

    const payload = {
      id: initialTemplate?.id ?? null,
      name: name.trim(),
      category,
      preview_url: previewUrl.trim(),
      is_premium: isPremium,
      is_active: isActive,
      layout_config: layoutConfig,
    };

    const parsed = upsertTemplateSchema.safeParse(payload);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors(flattened);
      const firstIssue =
        parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin đã nhập.";
      setFormError(firstIssue);
      toast.error("Dữ liệu chưa hợp lệ", firstIssue);
      return;
    }

    startSaveTransition(async () => {
      const result = await upsertTemplateAction(parsed.data);
      if (!result.ok) {
        setFormError(result.message);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        toast.error("Lưu template thất bại", result.message);
        return;
      }

      toast.success(
        isEdit ? "Đã cập nhật template" : "Đã tạo template mới",
        result.message,
      );

      if (isEdit) {
        router.refresh();
      } else {
        router.push("/admin/templates");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!initialTemplate || isDeleting) return;

    startDeleteTransition(async () => {
      const result = await deleteTemplateAction({ id: initialTemplate.id });
      setDeleteDialogOpen(false);

      if (!result.ok) {
        if (result.code === "TEMPLATE_IN_USE") {
          toast.warning(
            "Không thể xóa template đang được sử dụng",
            "Template đã được người dùng tạo photobooth. Hãy tắt nút Hiển thị (Ẩn template) thay vì xóa.",
          );
          return;
        }
        toast.error("Xóa template thất bại", result.message);
        return;
      }

      toast.success("Đã xóa template", result.message);
      router.push("/admin/templates");
      router.refresh();
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {initialTemplate ? (
        <div className={styles.metaBanner}>
          <div className={styles.metaStats}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Trạng thái hiện tại</span>
              <div>
                <StatusChip
                  status={isActive ? "active" : "inactive"}
                  label={isActive ? "Hiển thị" : "Đang ẩn"}
                />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Lượt sử dụng</span>
              <span className={styles.metaValue}>
                {formatNumber(initialTemplate.usage_count)} lượt
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Số slot</span>
              <span className={styles.metaValue}>
                {layoutConfig.slots.length} slot
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Cập nhật gần nhất</span>
              <span className={styles.metaValue}>
                {formatDateTime(initialTemplate.updated_at)}
              </span>
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 size={15} />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isSaving || isDeleting}
          >
            Xóa template
          </Button>
        </div>
      ) : null}

      {formError ? (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className={styles.topGrid}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Thông tin cơ bản</CardTitle>
              <CardDescription>
                Tên hiển thị, phân loại chủ đề và quyền truy cập gói hội viên.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className={styles.fieldStack}>
              <TextField
                label="Tên template"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: [] }));
                  }
                }}
                placeholder="Ví dụ: Classic White, Vintage Memories..."
                error={fieldErrors.name?.[0]}
                helperText="Tên template phải là duy nhất trong hệ thống."
              />

              <Select
                label="Danh mục (Category)"
                required
                value={category}
                options={CATEGORY_OPTIONS}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                error={fieldErrors.category?.[0]}
              />

              <div className={styles.switchBox}>
                <Switch
                  checked={isPremium}
                  onCheckedChange={setIsPremium}
                  label="Template VIP (Premium)"
                  description="Bật để chỉ cho phép hội viên PAUSE Go / Plus / Premium sử dụng."
                />
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  label="Hiển thị trên ứng dụng Mobile"
                  description="Tắt để ẩn template khỏi danh sách chọn mẫu mới mà không ảnh hưởng đơn cũ."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Hình ảnh &amp; Khung overlay</CardTitle>
              <CardDescription>
                Tải lên Cloudinary (pause/templates) hoặc Supabase Storage, hoặc dán URL ảnh.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className={styles.fieldStack}>
              <TemplateImageUploader
                label="Ảnh xem trước (preview_url)"
                kind="preview"
                required
                value={previewUrl}
                onChange={(nextUrl) => {
                  setPreviewUrl(nextUrl);
                  if (fieldErrors.preview_url) {
                    setFieldErrors((prev) => ({ ...prev, preview_url: [] }));
                  }
                }}
                error={fieldErrors.preview_url?.[0]}
                helperText="Hiển thị trên thẻ chọn mẫu trong app Mobile."
              />

              <TemplateImageUploader
                label="Ảnh khung PNG trong suốt (frame_url – tùy chọn)"
                kind="frame"
                nullable
                value={layoutConfig.frame_url ?? ""}
                onChange={handleFrameUrlChange}
                placeholder="Để trống nếu không dùng ảnh khung overlay..."
                helperText="Ảnh khung được phủ lên trên các slot ảnh theo kích thước canvas."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Thiết kế bố cục (layout_config)</CardTitle>
            <CardDescription>
              Chỉnh sửa trực quan các slot ảnh &amp; chữ, áp dụng preset nhanh, chỉnh JSON
              nâng cao hoặc xem thử giống trên Mobile.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <VisualLayoutEditor
            value={layoutConfig}
            onChange={(next) => {
              setLayoutConfig(next);
              if (fieldErrors.layout_config) {
                setFieldErrors((prev) => ({ ...prev, layout_config: [] }));
              }
            }}
            templateName={name || "Mẫu mới"}
            onJsonErrorChange={(hasErr) => setJsonHasErrors(hasErr)}
            error={fieldErrors.layout_config?.[0]}
          />
        </CardContent>
      </Card>

      <div className={styles.footerBar}>
        <Link href="/admin/templates">
          <Button variant="outlined" leftIcon={<ArrowLeft size={16} />} disabled={isSaving}>
            Quay lại danh sách
          </Button>
        </Link>

        <div className={styles.footerActions}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSaving}
            leftIcon={<Save size={16} />}
          >
            {isSaving
              ? "Đang lưu..."
              : isEdit
                ? "Lưu thay đổi"
                : "Tạo template"}
          </Button>
        </div>
      </div>

      {initialTemplate ? (
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          variant="danger"
          loading={isDeleting}
          title="Xác nhận xóa template"
          description={`Bạn có chắc muốn xóa vĩnh viễn template "${initialTemplate.name}"? Nếu template đã từng được sử dụng, hệ thống sẽ từ chối xóa để bảo vệ dữ liệu đơn hàng.`}
          confirmLabel="Xóa template"
          cancelLabel="Hủy"
        />
      ) : null}
    </form>
  );
}
