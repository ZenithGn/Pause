import { z } from "zod";
import type { LayoutConfig, TemplateCategory } from "@/types/admin";

export const TEMPLATE_CATEGORIES = [
  "couple",
  "friends",
  "family",
  "general",
] as const satisfies readonly TemplateCategory[];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  couple: "Cặp đôi",
  friends: "Bạn bè",
  family: "Gia đình",
  general: "Chung",
};

export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Accepts only http(s) URLs or safe base64 PNG/JPEG/WEBP image data URLs.
 * Rejects dangerous protocols such as javascript: or data:text/html.
 */
export function isSafeAssetUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (SAFE_DATA_IMAGE_REGEX.test(trimmed)) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const safeAssetUrlSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập hoặc tải lên đường dẫn ảnh.")
  .refine(isSafeAssetUrl, {
    message: "URL ảnh phải sử dụng giao thức http(s) hợp lệ.",
  });

export const nullableSafeAssetUrlSchema = z
  .union([z.string().trim(), z.null(), z.undefined()])
  .transform((val): string | null => {
    if (!val) return null;
    const trimmed = val.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((val) => val === null || isSafeAssetUrl(val), {
    message: "URL khung ảnh phải sử dụng giao thức http(s) hợp lệ.",
  });

export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_REGEX, "Mã màu phải theo định dạng hex #RRGGBB (ví dụ: #FFFFFF).");

export const layoutSlotSchema = z.object({
  index: z
    .number({ invalid_type_error: "Chỉ số slot phải là số." })
    .int("Chỉ số slot phải là số nguyên.")
    .min(0, "Chỉ số slot không được nhỏ hơn 0."),
  x: z
    .number({ invalid_type_error: "Tọa độ x phải là số." })
    .int("Tọa độ x phải là số nguyên.")
    .min(0, "Tọa độ x phải >= 0."),
  y: z
    .number({ invalid_type_error: "Tọa độ y phải là số." })
    .int("Tọa độ y phải là số nguyên.")
    .min(0, "Tọa độ y phải >= 0."),
  width: z
    .number({ invalid_type_error: "Chiều rộng slot phải là số." })
    .int("Chiều rộng slot phải là số nguyên.")
    .positive("Chiều rộng slot phải > 0."),
  height: z
    .number({ invalid_type_error: "Chiều cao slot phải là số." })
    .int("Chiều cao slot phải là số nguyên.")
    .positive("Chiều cao slot phải > 0."),
});

export const layoutTextSchema = z.object({
  content: z
    .string({ invalid_type_error: "Nội dung chữ phải là chuỗi." })
    .trim()
    .min(1, "Nội dung chữ không được để trống.")
    .max(120, "Nội dung chữ tối đa 120 ký tự."),
  x: z
    .number({ invalid_type_error: "Tọa độ x của chữ phải là số." })
    .int("Tọa độ x của chữ phải là số nguyên.")
    .min(0, "Tọa độ x của chữ phải >= 0."),
  y: z
    .number({ invalid_type_error: "Tọa độ y của chữ phải là số." })
    .int("Tọa độ y của chữ phải là số nguyên.")
    .min(0, "Tọa độ y của chữ phải >= 0."),
  font_size: z
    .number({ invalid_type_error: "Cỡ chữ phải là số." })
    .int("Cỡ chữ phải là số nguyên.")
    .min(8, "Cỡ chữ tối thiểu là 8px.")
    .max(300, "Cỡ chữ tối đa là 300px."),
  color: hexColorSchema,
});

export const layoutConfigSchema = z
  .object({
    width: z
      .number({ invalid_type_error: "Chiều rộng canvas phải là số." })
      .int("Chiều rộng canvas phải là số nguyên.")
      .positive("Chiều rộng canvas phải > 0.")
      .max(10000, "Chiều rộng canvas tối đa 10000px."),
    height: z
      .number({ invalid_type_error: "Chiều cao canvas phải là số." })
      .int("Chiều cao canvas phải là số nguyên.")
      .positive("Chiều cao canvas phải > 0.")
      .max(10000, "Chiều cao canvas tối đa 10000px."),
    background_color: hexColorSchema,
    slots: z
      .array(layoutSlotSchema, {
        invalid_type_error: "Danh sách slots phải là một mảng.",
      })
      .min(1, "Bố cục phải có ít nhất 1 khung ảnh (slot).")
      .max(20, "Tối đa 20 khung ảnh trong một template."),
    texts: z
      .array(layoutTextSchema, {
        invalid_type_error: "Danh sách texts phải là một mảng.",
      })
      .max(20, "Tối đa 20 dòng chữ trong một template.")
      .optional()
      .default([]),
    frame_url: nullableSafeAssetUrlSchema.optional().default(null),
  })
  .superRefine((config, ctx) => {
    const seenIndices = new Set<number>();

    config.slots.forEach((slot, idx) => {
      if (seenIndices.has(slot.index)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots", idx, "index"],
          message: `Chỉ số slot ${slot.index} bị trùng lặp.`,
        });
      } else {
        seenIndices.add(slot.index);
      }

      if (slot.index < 0 || slot.index >= config.slots.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots", idx, "index"],
          message: `Chỉ số slot phải liên tục từ 0 đến ${config.slots.length - 1} (nhận được ${slot.index}).`,
        });
      }

      if (slot.x + slot.width > config.width) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots", idx, "width"],
          message: `Slot #${slot.index + 1} vượt quá chiều rộng canvas (${slot.x + slot.width} > ${config.width}).`,
        });
      }

      if (slot.y + slot.height > config.height) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots", idx, "height"],
          message: `Slot #${slot.index + 1} vượt quá chiều cao canvas (${slot.y + slot.height} > ${config.height}).`,
        });
      }
    });

    for (let expected = 0; expected < config.slots.length; expected += 1) {
      if (!seenIndices.has(expected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots"],
          message: `Thiếu chỉ số slot ${expected}. Chỉ số slot phải liên tục từ 0 đến ${config.slots.length - 1}.`,
        });
        break;
      }
    }

    config.texts.forEach((text, idx) => {
      if (text.x > config.width) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["texts", idx, "x"],
          message: `Chữ #${idx + 1} có tọa độ x vượt quá chiều rộng canvas (${text.x} > ${config.width}).`,
        });
      }
      if (text.y > config.height) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["texts", idx, "y"],
          message: `Chữ #${idx + 1} có tọa độ y vượt quá chiều cao canvas (${text.y} > ${config.height}).`,
        });
      }
    });
  });

export type ValidatedLayoutConfig = z.infer<typeof layoutConfigSchema>;

/**
 * Automatically derives `slot_count` from `layout_config.slots.length` (T-06.D04).
 */
export function computeSlotCount(layoutConfig: Pick<LayoutConfig, "slots">): number {
  return layoutConfig.slots.length;
}

export const templateCategorySchema = z.enum(TEMPLATE_CATEGORIES, {
  errorMap: () => ({
    message: "Danh mục phải thuộc một trong: couple, friends, family, general.",
  }),
});

export const upsertTemplateSchema = z.object({
  id: z.string().uuid("ID template không hợp lệ.").nullish(),
  name: z
    .string()
    .trim()
    .min(2, "Tên template cần ít nhất 2 ký tự.")
    .max(80, "Tên template tối đa 80 ký tự."),
  category: templateCategorySchema,
  preview_url: safeAssetUrlSchema,
  is_premium: z.boolean().default(false),
  is_active: z.boolean().default(true),
  layout_config: layoutConfigSchema,
});

export type UpsertTemplateInput = z.infer<typeof upsertTemplateSchema>;

export const setTemplateActiveSchema = z.object({
  id: z.string().uuid("ID template không hợp lệ."),
  is_active: z.boolean(),
});

export const deleteTemplateSchema = z.object({
  id: z.string().uuid("ID template không hợp lệ."),
});

export const templateImageMetaSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  fileType: z.enum(["image/png", "image/jpeg", "image/webp"], {
    errorMap: () => ({
      message: "Chỉ hỗ trợ định dạng ảnh PNG, JPG hoặc WEBP.",
    }),
  }),
  fileSize: z
    .number()
    .int()
    .positive("Tệp ảnh trống.")
    .max(5 * 1024 * 1024, "Dung lượng ảnh tối đa 5 MB."),
  kind: z.enum(["preview", "frame"]).default("preview"),
});
