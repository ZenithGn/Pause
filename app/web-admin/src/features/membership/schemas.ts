import { z } from "zod";
import type { MembershipDurationType, MembershipStatus } from "@/types/admin";

/** 1 GiB in bytes (1024^3) matching Pause storage strategy & mock fixtures. */
export const BYTES_PER_GB = 1024 ** 3;

export const MAX_PRICE_VND = 2_000_000_000;
export const MAX_EXTRA_DRAWERS = 100_000;
export const MAX_STORAGE_GB = 100_000;

/**
 * Converts gigabytes (GiB) to exact integer bytes (GB * 1024^3).
 */
export function gbToBytes(gb: number): number {
  if (!Number.isFinite(gb) || gb < 0) {
    throw new RangeError("Dung lượng (GB) phải là số không âm hợp lệ.");
  }
  return Math.round(gb * BYTES_PER_GB);
}

/**
 * Converts bytes to gigabytes (bytes / 1024^3) rounded cleanly for form display.
 */
export function bytesToGb(bytes: number, decimals = 2): number {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError("Dung lượng (bytes) phải là số không âm hợp lệ.");
  }
  if (bytes === 0) return 0;
  const clampedDecimals = Math.max(0, Math.min(decimals, 6));
  const factor = 10 ** clampedDecimals;
  return Math.round((bytes / BYTES_PER_GB) * factor) / factor;
}

/**
 * Formats byte count in GB for membership plan display (e.g. "5 GB", "0 GB").
 */
export function formatStorageGb(
  bytes: number | null | undefined,
  decimals = 2,
): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return "0 GB";
  }
  return `${bytesToGb(bytes, decimals)} GB`;
}

function preprocessNumericInput(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    return Number(trimmed);
  }
  return value;
}

function preprocessBooleanInput(value: unknown): unknown {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return value;
}

export const membershipDurationSchema = z.enum(["yearly", "monthly"], {
  errorMap: () => ({ message: "Chu kỳ gói chỉ hỗ trợ theo năm hoặc theo tháng." }),
});

export const membershipPlanFormSchema = z.object({
  id: z
    .string()
    .uuid("ID gói hội viên không hợp lệ.")
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  name: z
    .string({ required_error: "Vui lòng nhập tên gói hội viên." })
    .trim()
    .min(1, "Vui lòng nhập tên gói hội viên.")
    .max(100, "Tên gói hội viên không được vượt quá 100 ký tự."),
  description: z
    .string()
    .trim()
    .max(500, "Mô tả gói không được vượt quá 500 ký tự.")
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  price_vnd: z.preprocess(
    preprocessNumericInput,
    z
      .number({
        required_error: "Vui lòng nhập giá gói (VNĐ).",
        invalid_type_error: "Giá gói phải là một số hợp lệ.",
      })
      .finite("Giá gói không hợp lệ.")
      .int("Giá gói phải là số nguyên (VNĐ).")
      .min(0, "Giá gói phải lớn hơn hoặc bằng 0 VNĐ.")
      .max(MAX_PRICE_VND, "Giá gói vượt quá giới hạn cho phép."),
  ),
  duration_type: membershipDurationSchema.default("yearly"),
  extra_drawers: z.preprocess(
    preprocessNumericInput,
    z
      .number({
        required_error: "Vui lòng nhập số ngăn kéo thêm.",
        invalid_type_error: "Số ngăn kéo thêm phải là một số hợp lệ.",
      })
      .finite("Số ngăn kéo thêm không hợp lệ.")
      .int("Số ngăn kéo thêm phải là số nguyên.")
      .min(0, "Số ngăn kéo thêm phải lớn hơn hoặc bằng 0.")
      .max(MAX_EXTRA_DRAWERS, "Số ngăn kéo thêm vượt quá giới hạn cho phép."),
  ),
  storage_gb: z.preprocess(
    preprocessNumericInput,
    z
      .number({
        required_error: "Vui lòng nhập dung lượng lưu trữ (GB).",
        invalid_type_error: "Dung lượng (GB) phải là một số hợp lệ.",
      })
      .finite("Dung lượng (GB) không hợp lệ.")
      .min(0, "Dung lượng lưu trữ phải lớn hơn hoặc bằng 0 GB.")
      .max(MAX_STORAGE_GB, "Dung lượng lưu trữ vượt quá giới hạn cho phép."),
  ),
  access_premium_templates: z
    .preprocess(preprocessBooleanInput, z.boolean())
    .default(true),
  is_active: z.preprocess(preprocessBooleanInput, z.boolean()).default(true),
});

export type MembershipPlanFormInput = z.input<typeof membershipPlanFormSchema>;
export type MembershipPlanFormValues = z.output<typeof membershipPlanFormSchema>;

export interface MembershipPlanRpcPayload {
  p_id: string | null;
  p_name: string;
  p_description: string | null;
  p_price_vnd: number;
  p_duration_type: MembershipDurationType;
  p_extra_drawers: number;
  p_extra_storage_bytes: number;
  p_access_premium_templates: boolean;
  p_is_active: boolean;
}

/**
 * Converts validated membership plan form values into the exact RPC argument shape
 * expected by public.admin_upsert_membership_plan.
 */
export function toMembershipPlanRpcPayload(
  values: MembershipPlanFormValues,
): MembershipPlanRpcPayload {
  return {
    p_id: values.id,
    p_name: values.name,
    p_description: values.description,
    p_price_vnd: values.price_vnd,
    p_duration_type: values.duration_type,
    p_extra_drawers: values.extra_drawers,
    p_extra_storage_bytes: gbToBytes(values.storage_gb),
    p_access_premium_templates: values.access_premium_templates,
    p_is_active: values.is_active,
  };
}

export const membershipPlanIdSchema = z.object({
  id: z.string().uuid("ID gói hội viên không hợp lệ."),
});

export const toggleMembershipPlanActiveSchema = z.object({
  id: z.string().uuid("ID gói hội viên không hợp lệ."),
  is_active: z.boolean(),
});

export const MEMBERSHIP_DURATION_LABELS: Record<MembershipDurationType, string> = {
  yearly: "Theo năm",
  monthly: "Theo tháng",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Đang hoạt động",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
};

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
