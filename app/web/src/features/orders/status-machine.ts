import type { OrderStatus } from "@/types/admin";

/**
 * Canonical order statuses matching print_orders.status CHECK constraint and §5.4.
 */
export const ORDER_STATUSES = [
  "pending",
  "processing",
  "printing",
  "shipping",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[];

/**
 * Strict print order state transition table (§5.4 & admin_update_order_status RPC):
 * - pending    -> processing | cancelled
 * - processing -> printing   | cancelled
 * - printing   -> shipping
 * - shipping   -> completed
 * - completed  -> (terminal)
 * - cancelled  -> (terminal)
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["printing", "cancelled"],
  printing: ["shipping"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  printing: "Đang in",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const ORDER_TRANSITION_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  processing: "Xác nhận xử lý",
  printing: "Chuyển sang Đang in",
  shipping: "Chuyển sang Đang giao",
  completed: "Hoàn thành đơn hàng",
  cancelled: "Hủy đơn hàng",
};

export const ORDER_TRANSITION_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: "Đơn hàng vừa được tạo và chờ xác nhận.",
  processing: "Xác nhận đơn hợp lệ để chuẩn bị xuất file in.",
  printing: "Bắt đầu gửi file in tới xưởng photobooth.",
  shipping: "Đơn in đã hoàn tất và bàn giao cho đơn vị vận chuyển.",
  completed: "Khách hàng đã nhận hàng thành công.",
  cancelled: "Hủy đơn hàng và gửi thông báo kèm lý do tới khách hàng.",
};

export const COVER_TYPE_LABELS: Record<string, string> = {
  soft: "Bìa mềm",
  hard: "Bìa cứng",
};

export const PAPER_TYPE_LABELS: Record<string, string> = {
  standard: "Tiêu chuẩn",
  premium: "Mỹ thuật",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  vietqr_payos: "VietQR / PayOS",
  vietqr: "VietQR",
  cod: "COD (Thanh toán khi nhận hàng)",
  vnpay: "VNPay",
  momo: "MoMo",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  success: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  couple: "Cặp đôi",
  friends: "Bạn bè",
  family: "Gia đình",
  general: "Chung",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function getAllowedNextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[status] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ORDER_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function requiresNote(to: OrderStatus): boolean {
  return to === "cancelled";
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return getAllowedNextStatuses(status).length === 0;
}

export function getCoverTypeLabel(coverType: string | null | undefined): string {
  if (!coverType) return "—";
  return COVER_TYPE_LABELS[coverType.toLowerCase()] ?? coverType;
}

export function getPaperTypeLabel(paperType: string | null | undefined): string {
  if (!paperType) return "—";
  return PAPER_TYPE_LABELS[paperType.toLowerCase()] ?? paperType;
}

export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "COD (Thanh toán khi nhận hàng)";
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? method;
}

export function getPaymentStatusLabel(status: string | null | undefined): string {
  if (!status) return "Chờ thanh toán";
  return PAYMENT_STATUS_LABELS[status.toLowerCase()] ?? status;
}

export function getTemplateCategoryLabel(category: string | null | undefined): string {
  if (!category) return "—";
  return TEMPLATE_CATEGORY_LABELS[category.toLowerCase()] ?? category;
}
