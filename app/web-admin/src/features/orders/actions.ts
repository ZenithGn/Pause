"use server";

import { revalidatePath } from "next/cache";
import { errorResult, okResult, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isMockAdminMode } from "@/lib/env";
import { ADMIN_ERROR_MESSAGES, mapPostgresError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/admin";
import { buildOrdersCsv } from "./csv";
import {
  listOrders,
  mockUpdateOrderNotes,
  mockUpdateOrderStatus,
} from "./queries";
import {
  orderFilterParamsSchema,
  updateOrderNotesSchema,
  updateOrderStatusSchema,
  type UpdateOrderNotesInput,
  type UpdateOrderStatusInput,
} from "./schemas";
import { ORDER_STATUS_LABELS } from "./status-machine";

export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput,
): Promise<ActionResult<{ status: OrderStatus; updatedAt: string }>> {
  const session = await requireAdmin();

  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstIssue = parsed.error.issues[0]?.message ?? ADMIN_ERROR_MESSAGES.VALIDATION_ERROR;
    return errorResult("VALIDATION_ERROR", firstIssue, fieldErrors);
  }

  const { orderId, newStatus, note } = parsed.data;

  if (isMockAdminMode()) {
    const mockOutcome = mockUpdateOrderStatus(orderId, newStatus, note, {
      id: session.user.id,
      name: session.profile.display_name,
    });
    if (!mockOutcome.ok) {
      return errorResult(mockOutcome.code, ADMIN_ERROR_MESSAGES[mockOutcome.code]);
    }
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");
    return okResult(
      { status: newStatus, updatedAt: mockOutcome.updatedAt },
      `Đã chuyển trạng thái đơn hàng sang "${ORDER_STATUS_LABELS[newStatus]}".`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_note: note,
  });

  if (error) {
    const mapped = mapPostgresError(error);
    return errorResult(mapped.code, mapped.message);
  }

  const updatedRecord =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const updatedAt =
    typeof updatedRecord.updated_at === "string"
      ? updatedRecord.updated_at
      : new Date().toISOString();

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");

  return okResult(
    { status: newStatus, updatedAt },
    `Đã chuyển trạng thái đơn hàng sang "${ORDER_STATUS_LABELS[newStatus]}".`,
  );
}

export async function updateOrderNotesAction(
  input: UpdateOrderNotesInput,
): Promise<ActionResult<{ adminNotes: string | null }>> {
  await requireAdmin();

  const parsed = updateOrderNotesSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstIssue = parsed.error.issues[0]?.message ?? ADMIN_ERROR_MESSAGES.VALIDATION_ERROR;
    return errorResult("VALIDATION_ERROR", firstIssue, fieldErrors);
  }

  const { orderId, adminNotes } = parsed.data;

  if (isMockAdminMode()) {
    const mockOutcome = mockUpdateOrderNotes(orderId, adminNotes);
    if (!mockOutcome.ok) {
      return errorResult(mockOutcome.code, ADMIN_ERROR_MESSAGES[mockOutcome.code]);
    }
    revalidatePath(`/admin/orders/${orderId}`);
    return okResult({ adminNotes: mockOutcome.adminNotes }, "Đã lưu ghi chú nội bộ.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_order_notes", {
    p_order_id: orderId,
    p_admin_notes: adminNotes,
  });

  if (error) {
    const mapped = mapPostgresError(error);
    return errorResult(mapped.code, mapped.message);
  }

  revalidatePath(`/admin/orders/${orderId}`);
  return okResult(
    { adminNotes: adminNotes.length > 0 ? adminNotes : null },
    "Đã lưu ghi chú nội bộ.",
  );
}

export async function exportFilteredOrdersCsvAction(rawFilters: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
}): Promise<ActionResult<{ csv: string; count: number; truncated: boolean }>> {
  await requireAdmin();

  const parsed = orderFilterParamsSchema.safeParse(rawFilters);
  const filters = parsed.success
    ? parsed.data
    : {
        q: undefined,
        status: undefined,
        from: undefined,
        to: undefined,
        sort: "created_at.desc" as const,
      };

  const MAX_EXPORT_ROWS = 5000;
  const BATCH_SIZE = 1000;

  try {
    const firstBatch = await listOrders({
      search: filters.q,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      sort: filters.sort,
      limit: BATCH_SIZE,
      offset: 0,
    });

    const allItems = [...firstBatch.items];
    const totalCount = firstBatch.totalCount;

    while (allItems.length < totalCount && allItems.length < MAX_EXPORT_ROWS) {
      const nextBatch = await listOrders({
        search: filters.q,
        status: filters.status,
        from: filters.from,
        to: filters.to,
        sort: filters.sort,
        limit: BATCH_SIZE,
        offset: allItems.length,
      });

      if (nextBatch.items.length === 0) break;
      allItems.push(...nextBatch.items);
    }

    return okResult({
      csv: buildOrdersCsv(allItems),
      count: allItems.length,
      truncated: totalCount > allItems.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : ADMIN_ERROR_MESSAGES.INTERNAL_ERROR;
    return errorResult("INTERNAL_ERROR", message);
  }
}
