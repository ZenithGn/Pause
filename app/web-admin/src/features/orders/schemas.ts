import { z } from "zod";
import { ORDER_STATUSES } from "./status-machine";

export const ORDER_SORT_OPTIONS = [
  "created_at.desc",
  "created_at.asc",
  "total_price_vnd.desc",
  "total_price_vnd.asc",
  "status.asc",
  "status.desc",
] as const;

export type OrderSortOption = (typeof ORDER_SORT_OPTIONS)[number];

export const orderStatusSchema = z.enum(ORDER_STATUSES, {
  errorMap: () => ({ message: "Trạng thái đơn hàng không hợp lệ." }),
});

export const orderIdSchema = z
  .string()
  .trim()
  .uuid("Mã đơn hàng không đúng định dạng UUID.");

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const orderFilterParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, "Từ khóa tìm kiếm tối đa 120 ký tự.")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  status: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val.toLowerCase() : undefined))
    .pipe(orderStatusSchema.optional()),
  from: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && ISO_DATE_REGEX.test(val) ? val : undefined)),
  to: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && ISO_DATE_REGEX.test(val) ? val : undefined)),
  sort: z
    .string()
    .trim()
    .optional()
    .transform((val): OrderSortOption =>
      (ORDER_SORT_OPTIONS as readonly string[]).includes(val ?? "")
        ? (val as OrderSortOption)
        : "created_at.desc",
    ),
});

export const updateOrderStatusSchema = z
  .object({
    orderId: orderIdSchema,
    newStatus: orderStatusSchema,
    note: z
      .string()
      .trim()
      .max(500, "Ghi chú chuyển trạng thái tối đa 500 ký tự.")
      .optional()
      .nullable()
      .transform((val) => {
        const trimmed = val?.trim() ?? "";
        return trimmed.length > 0 ? trimmed : null;
      }),
  })
  .superRefine((data, ctx) => {
    if (data.newStatus === "cancelled" && !data.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Vui lòng nhập lý do hủy đơn.",
      });
    }
  });

export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;
export type ParsedUpdateOrderStatusInput = z.output<typeof updateOrderStatusSchema>;

export const updateOrderNotesSchema = z.object({
  orderId: orderIdSchema,
  adminNotes: z
    .string()
    .trim()
    .max(2000, "Ghi chú nội bộ tối đa 2000 ký tự."),
});

export type UpdateOrderNotesInput = z.input<typeof updateOrderNotesSchema>;
export type ParsedUpdateOrderNotesInput = z.output<typeof updateOrderNotesSchema>;
