import type { OrderStatus, PaymentStatus } from "@/types/admin";

/**
 * Online payments (VietQR / PayOS / VNPay / MoMo) expire if left unpaid past this window.
 */
export const PAYMENT_TIMEOUT_MINUTES = 15;
const PAYMENT_TIMEOUT_MS = PAYMENT_TIMEOUT_MINUTES * 60 * 1000;

export function isStalePendingPayment(
  status: string | null | undefined,
  createdAt: string | null | undefined,
  paymentMethod?: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!status || status.trim().toLowerCase() !== "pending") return false;
  if (paymentMethod && paymentMethod.trim().toLowerCase() === "cod") return false;
  if (!createdAt) return false;

  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return false;

  return nowMs - createdMs >= PAYMENT_TIMEOUT_MS;
}

export function resolveEffectivePaymentStatus(
  status: PaymentStatus,
  createdAt: string | null | undefined,
  paymentMethod?: string | null,
  nowMs: number = Date.now(),
): PaymentStatus {
  if (isStalePendingPayment(status, createdAt, paymentMethod, nowMs)) {
    return "cancelled";
  }
  return status;
}

export function resolveEffectiveOrderStatus(
  orderStatus: OrderStatus,
  paymentStatus: string | null | undefined,
  paymentMethod: string | null | undefined,
  createdAt: string | null | undefined,
  nowMs: number = Date.now(),
): OrderStatus {
  if (
    orderStatus === "pending" &&
    isStalePendingPayment(paymentStatus, createdAt, paymentMethod, nowMs)
  ) {
    return "cancelled";
  }
  return orderStatus;
}

interface RpcCapableClient {
  rpc: (
    fn: "expire_stale_pending_payments",
    args?: { p_timeout_minutes?: number },
  ) => PromiseLike<{ data: unknown; error: unknown }>;
}

/**
 * Best-effort server call to persist auto-cancellation for stale unpaid online
 * transactions and their linked pending print orders. Never throws if the
 * migration has not yet been applied on the remote Supabase instance.
 */
export async function expireStalePendingPaymentsSafe(
  supabase: RpcCapableClient,
  timeoutMinutes: number = PAYMENT_TIMEOUT_MINUTES,
): Promise<void> {
  try {
    await supabase.rpc("expire_stale_pending_payments", {
      p_timeout_minutes: timeoutMinutes,
    });
  } catch {
    // Non-fatal fallback: UI-side staleness normalization still displays cancelled status.
  }
}
