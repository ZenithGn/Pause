import { describe, expect, it, vi } from "vitest";
import {
  expireStalePendingPaymentsSafe,
  isStalePendingPayment,
  PAYMENT_TIMEOUT_MINUTES,
  resolveEffectiveOrderStatus,
  resolveEffectivePaymentStatus,
} from "@/lib/payment-timeout";

describe("payment-timeout helpers", () => {
  const now = Date.parse("2026-11-23T15:00:00.000Z");
  const twentyMinAgo = new Date(now - 20 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();

  it("marks online pending payment older than timeout as stale", () => {
    expect(PAYMENT_TIMEOUT_MINUTES).toBe(15);
    expect(isStalePendingPayment("pending", twentyMinAgo, "vietqr_payos", now)).toBe(true);
    expect(resolveEffectivePaymentStatus("pending", twentyMinAgo, "vietqr_payos", now)).toBe(
      "cancelled",
    );
  });

  it("keeps recent pending payment (< 15m) as pending", () => {
    expect(isStalePendingPayment("pending", fiveMinAgo, "vietqr_payos", now)).toBe(false);
    expect(resolveEffectivePaymentStatus("pending", fiveMinAgo, "vietqr_payos", now)).toBe(
      "pending",
    );
  });

  it("never auto-cancels COD orders or already completed/paid payments", () => {
    expect(isStalePendingPayment("pending", twentyMinAgo, "cod", now)).toBe(false);
    expect(resolveEffectiveOrderStatus("pending", "pending", "cod", twentyMinAgo, now)).toBe(
      "pending",
    );
    expect(resolveEffectivePaymentStatus("success", twentyMinAgo, "vietqr_payos", now)).toBe(
      "success",
    );
  });

  it("auto-cancels stale unpaid online print orders", () => {
    expect(
      resolveEffectiveOrderStatus("pending", "pending", "vietqr_payos", twentyMinAgo, now),
    ).toBe("cancelled");
    expect(
      resolveEffectiveOrderStatus("processing", "pending", "vietqr_payos", twentyMinAgo, now),
    ).toBe("processing");
  });

  it("swallows RPC errors gracefully if migration is not yet applied", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("function does not exist"));
    await expect(expireStalePendingPaymentsSafe({ rpc })).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("expire_stale_pending_payments", {
      p_timeout_minutes: 15,
    });
  });
});
