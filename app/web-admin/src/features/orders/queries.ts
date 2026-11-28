import "server-only";

import { mapPostgresError } from "@/lib/errors";
import { isMockAdminMode } from "@/lib/env";
import {
  getMockOrderDetail,
  MOCK_ORDER_STATUS_COUNTS,
  MOCK_ORDERS,
} from "@/lib/mock-data";
import { parsePagination, type ParsedPagination } from "@/lib/pagination";
import {
  expireStalePendingPaymentsSafe,
  resolveEffectiveOrderStatus,
  resolveEffectivePaymentStatus,
} from "@/lib/payment-timeout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LayoutConfig,
  OrderDetail,
  OrderSlotPhoto,
  OrderStatus,
  OrderStatusCount,
  OrderSummary,
  PrintOrderStatusHistoryItem,
  TransactionItem,
} from "@/types/admin";
import {
  orderFilterParamsSchema,
  orderIdSchema,
  type OrderSortOption,
} from "./schemas";
import {
  canTransition,
  isOrderStatus,
  ORDER_STATUSES,
  requiresNote,
} from "./status-machine";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export interface ParsedOrdersQuery {
  q?: string;
  status?: OrderStatus;
  from?: string;
  to?: string;
  sort: OrderSortOption;
  pagination: ParsedPagination;
}

export interface ListOrdersParams {
  status?: OrderStatus;
  search?: string;
  from?: string;
  to?: string;
  sort?: OrderSortOption;
  limit?: number;
  offset?: number;
}

export interface ListOrdersResult {
  items: OrderSummary[];
  totalCount: number;
}

const vnIsoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toVietnamDateString(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return vnIsoDateFormatter.format(parsed);
}

function readSingleParam(params: SearchParamsRecord, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

export function parseOrdersSearchParams(searchParams: SearchParamsRecord): ParsedOrdersQuery {
  const pagination = parsePagination(searchParams);
  const parsed = orderFilterParamsSchema.safeParse({
    q: readSingleParam(searchParams, "q"),
    status: readSingleParam(searchParams, "status"),
    from: readSingleParam(searchParams, "from"),
    to: readSingleParam(searchParams, "to"),
    sort: readSingleParam(searchParams, "sort"),
  });

  if (!parsed.success) {
    return {
      sort: "created_at.desc",
      pagination,
    };
  }

  return {
    ...parsed.data,
    pagination,
  };
}

// In-memory store for interactive mock mode previews (never active in real Supabase mode).
const mockOrderDetailStore = new Map<string, OrderDetail>();
const mockStatusDelta = new Map<OrderStatus, number>();

function getMockDetailFromStore(orderId: string): OrderDetail | null {
  const existing = mockOrderDetailStore.get(orderId);
  if (existing) return existing;

  const base = getMockOrderDetail(orderId);
  if (!base) return null;

  const cloned = structuredClone(base);
  mockOrderDetailStore.set(orderId, cloned);
  return cloned;
}

function getEffectiveMockOrderSummaries(): OrderSummary[] {
  return MOCK_ORDERS.map((order) => {
    const overridden = mockOrderDetailStore.get(order.id);
    if (!overridden) return order;
    return {
      ...order,
      status: overridden.order.status,
    };
  });
}

function sortMockOrders(items: OrderSummary[], sort: OrderSortOption): OrderSummary[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "created_at.asc":
        return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
      case "total_price_vnd.asc":
        return a.total_price_vnd - b.total_price_vnd || b.created_at.localeCompare(a.created_at);
      case "total_price_vnd.desc":
        return b.total_price_vnd - a.total_price_vnd || b.created_at.localeCompare(a.created_at);
      case "status.asc":
        return a.status.localeCompare(b.status) || b.created_at.localeCompare(a.created_at);
      case "status.desc":
        return b.status.localeCompare(a.status) || b.created_at.localeCompare(a.created_at);
      case "created_at.desc":
      default:
        return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
    }
  });
  return copy;
}

export function mockUpdateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note: string | null,
  actor: { id: string; name: string },
): { ok: true; updatedAt: string } | { ok: false; code: "NOT_FOUND" | "INVALID_STATUS_TRANSITION" | "CANCEL_NOTE_REQUIRED" } {
  const detail = getMockDetailFromStore(orderId);
  if (!detail) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const currentStatus = detail.order.status;
  if (!canTransition(currentStatus, newStatus)) {
    return { ok: false, code: "INVALID_STATUS_TRANSITION" };
  }

  if (requiresNote(newStatus) && (!note || note.trim().length === 0)) {
    return { ok: false, code: "CANCEL_NOTE_REQUIRED" };
  }

  const nowIso = new Date().toISOString();
  detail.order.status = newStatus;
  detail.order.updated_at = nowIso;
  detail.status_history.push({
    id: `mock-hist-${Date.now()}`,
    order_id: orderId,
    from_status: currentStatus,
    to_status: newStatus,
    changed_by: actor.id,
    changed_by_name: actor.name,
    note: note?.trim() ? note.trim() : null,
    created_at: nowIso,
  });

  mockStatusDelta.set(currentStatus, (mockStatusDelta.get(currentStatus) ?? 0) - 1);
  mockStatusDelta.set(newStatus, (mockStatusDelta.get(newStatus) ?? 0) + 1);

  return { ok: true, updatedAt: nowIso };
}

export function mockUpdateOrderNotes(
  orderId: string,
  adminNotes: string,
): { ok: true; adminNotes: string | null } | { ok: false; code: "NOT_FOUND" } {
  const detail = getMockDetailFromStore(orderId);
  if (!detail) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const normalized = adminNotes.trim().length > 0 ? adminNotes.trim() : null;
  detail.order.admin_notes = normalized;
  detail.order.updated_at = new Date().toISOString();
  return { ok: true, adminNotes: normalized };
}

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const limit = Math.max(1, Math.min(params.limit ?? 20, 1000));
  const offset = Math.max(0, params.offset ?? 0);
  const sort: OrderSortOption = params.sort ?? "created_at.desc";

  if (isMockAdminMode()) {
    const query = params.search?.trim().toLowerCase() ?? "";
    const filtered = getEffectiveMockOrderSummaries().filter((order) => {
      if (params.status && order.status !== params.status) return false;

      if (params.from || params.to) {
        const vnDate = toVietnamDateString(order.created_at);
        if (params.from && vnDate < params.from) return false;
        if (params.to && vnDate > params.to) return false;
      }

      if (query) {
        const matches =
          order.id.toLowerCase().includes(query) ||
          order.short_code.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.shipping_phone.toLowerCase().includes(query) ||
          order.template_name.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });

    const sorted = sortMockOrders(filtered, sort);
    return {
      items: sorted.slice(offset, offset + limit),
      totalCount: sorted.length,
    };
  }

  const supabase = await createSupabaseServerClient();
  await expireStalePendingPaymentsSafe(supabase);

  const { data, error } = await supabase.rpc("admin_list_orders", {
    p_status: params.status ?? null,
    p_search: params.search?.trim() ? params.search.trim() : null,
    p_from: params.from ?? null,
    p_to: params.to ?? null,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  const rows = Array.isArray(data) ? data : [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  const items: OrderSummary[] = rows.map((row) => {
    const rawOrderStatus = isOrderStatus(row.status) ? row.status : "pending";
    const effectiveOrderStatus = resolveEffectiveOrderStatus(
      rawOrderStatus,
      row.payment_status,
      row.payment_method,
      row.created_at,
    );
    const effectivePaymentStatus =
      row.payment_status === "pending" &&
      effectiveOrderStatus === "cancelled"
        ? "cancelled"
        : row.payment_status;

    return {
      id: row.id,
      short_code: row.short_code,
      user_id: row.user_id,
      customer_name: row.customer_name,
      shipping_phone: row.shipping_phone,
      template_name: row.template_name ?? "—",
      preview_url: row.preview_url,
      quantity: Number(row.quantity ?? 1),
      total_price_vnd: Number(row.total_price_vnd ?? 0),
      status: effectiveOrderStatus,
      payment_status: effectivePaymentStatus,
      payment_method: row.payment_method,
      created_at: row.created_at,
      total_count: Number(row.total_count ?? 0),
    };
  });

  return { items, totalCount };
}

export async function getOrderStatusCounts(params: {
  from?: string;
  to?: string;
} = {}): Promise<OrderStatusCount[]> {
  if (isMockAdminMode()) {
    if (!params.from && !params.to) {
      return MOCK_ORDER_STATUS_COUNTS.map((entry) => ({
        status: entry.status,
        count: Math.max(0, entry.count + (mockStatusDelta.get(entry.status) ?? 0)),
      }));
    }

    const filtered = getEffectiveMockOrderSummaries().filter((order) => {
      const vnDate = toVietnamDateString(order.created_at);
      if (params.from && vnDate < params.from) return false;
      if (params.to && vnDate > params.to) return false;
      return true;
    });

    const countMap = new Map<OrderStatus, number>();
    for (const status of ORDER_STATUSES) countMap.set(status, 0);
    for (const order of filtered) {
      countMap.set(order.status, (countMap.get(order.status) ?? 0) + 1);
    }

    return ORDER_STATUSES.map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));
  }

  const supabase = await createSupabaseServerClient();
  await expireStalePendingPaymentsSafe(supabase);

  const { data, error } = await supabase.rpc("admin_order_status_counts", {
    p_from: params.from ?? null,
    p_to: params.to ?? null,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  const countMap = new Map<OrderStatus, number>();
  for (const status of ORDER_STATUSES) countMap.set(status, 0);

  if (Array.isArray(data)) {
    for (const row of data) {
      if (typeof row.status === "string" && isOrderStatus(row.status)) {
        countMap.set(row.status, Number(row.count ?? 0));
      }
    }
  }

  return ORDER_STATUSES.map((status) => ({
    status,
    count: countMap.get(status) ?? 0,
  }));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  width: 1200,
  height: 1800,
  background_color: "#FFFFFF",
  slots: [],
  texts: [],
  frame_url: null,
};

function normalizeOrderDetail(raw: unknown): OrderDetail {
  const root = asRecord(raw);
  const orderObj = asRecord(root.order);
  const customerObj = asRecord(root.customer);
  const itemObj = asRecord(root.photobooth_item);
  const templateObj = asRecord(root.template);

  const rawStatus = asString(orderObj.status, "pending");
  const status: OrderStatus = isOrderStatus(rawStatus) ? rawStatus : "pending";
  const customerName = asString(customerObj.display_name, asString(orderObj.shipping_name, "Khách hàng"));
  const orderId = asString(orderObj.id);

  const rawSlotPhotos = Array.isArray(root.slot_photos) ? root.slot_photos : [];
  const slotPhotos: OrderSlotPhoto[] = rawSlotPhotos
    .map((entry): OrderSlotPhoto => {
      const slot = asRecord(entry);
      return {
        slot_index: asNumber(slot.slot_index, 0),
        original_url: asString(slot.original_url),
        thumbnail_url: asNullableString(slot.thumbnail_url),
        width: asNullableNumber(slot.width),
        height: asNullableNumber(slot.height),
      };
    })
    .sort((a, b) => a.slot_index - b.slot_index);

  const rawTransactions = Array.isArray(root.transactions) ? root.transactions : [];
  const transactions: TransactionItem[] = rawTransactions.map((entry) => {
    const tx = asRecord(entry);
    const txType = asString(tx.type, "print_order");
    const txStatus = asString(tx.status, "pending");
    return {
      id: asString(tx.id),
      user_id: asString(tx.user_id, asString(orderObj.user_id)),
      display_name: asString(tx.display_name, customerName),
      type:
        txType === "membership" || txType === "drawer_purchase"
          ? txType
          : "print_order",
      amount_vnd: asNumber(tx.amount_vnd, 0),
      payment_method: asNullableString(tx.payment_method),
      payment_gateway_ref: asNullableString(tx.payment_gateway_ref),
      order_code:
        typeof tx.order_code === "number" || typeof tx.order_code === "string"
          ? tx.order_code
          : null,
      status: resolveEffectivePaymentStatus(
        txStatus === "success" ||
          txStatus === "failed" ||
          txStatus === "refunded" ||
          txStatus === "cancelled"
          ? txStatus
          : "pending",
        asString(tx.created_at),
        asNullableString(tx.payment_method),
      ),
      order_id: asNullableString(tx.order_id),
      metadata:
        tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
          ? (tx.metadata as Record<string, unknown>)
          : null,
      created_at: asString(tx.created_at),
    };
  });

  const rawHistory = Array.isArray(root.status_history) ? root.status_history : [];
  const statusHistory: PrintOrderStatusHistoryItem[] = rawHistory.map((entry) => {
    const h = asRecord(entry);
    const rawFrom = asNullableString(h.from_status);
    const rawTo = asString(h.to_status, status);
    return {
      id: asString(h.id),
      order_id: asString(h.order_id, orderId),
      from_status: rawFrom && isOrderStatus(rawFrom) ? rawFrom : null,
      to_status: isOrderStatus(rawTo) ? rawTo : status,
      changed_by: asNullableString(h.changed_by),
      changed_by_name: asNullableString(h.changed_by_name),
      note: asNullableString(h.note),
      created_at: asString(h.created_at),
    };
  });

  const layoutConfig =
    templateObj.layout_config &&
    typeof templateObj.layout_config === "object" &&
    !Array.isArray(templateObj.layout_config)
      ? (templateObj.layout_config as LayoutConfig)
      : DEFAULT_LAYOUT_CONFIG;

  const rawOrderStatus: OrderStatus = isOrderStatus(asString(orderObj.status))
    ? (asString(orderObj.status) as OrderStatus)
    : "pending";
  const effectiveDetailStatus: OrderStatus =
    rawOrderStatus === "pending" &&
    transactions.length > 0 &&
    transactions.every((tx) => tx.status === "cancelled")
      ? "cancelled"
      : rawOrderStatus;

  return {
    order: {
      id: orderId,
      short_code: asString(orderObj.short_code, orderId.slice(0, 8).toUpperCase()),
      user_id: asString(orderObj.user_id),
      photobooth_item_id: asString(orderObj.photobooth_item_id),
      quantity: asNumber(orderObj.quantity, 1),
      unit_price_vnd: asNumber(orderObj.unit_price_vnd, 0),
      total_price_vnd: asNumber(orderObj.total_price_vnd, 0),
      shipping_name: asString(orderObj.shipping_name),
      shipping_phone: asString(orderObj.shipping_phone),
      shipping_address: asString(orderObj.shipping_address),
      note: asNullableString(orderObj.note),
      cover_type: asString(orderObj.cover_type, "soft"),
      paper_type: asString(orderObj.paper_type, "standard"),
      status: effectiveDetailStatus,
      admin_notes: asNullableString(orderObj.admin_notes),
      created_at: asString(orderObj.created_at),
      updated_at: asString(orderObj.updated_at, asString(orderObj.created_at)),
    },
    customer: {
      id: asString(customerObj.id, asString(orderObj.user_id)),
      display_name: customerName,
      email: asNullableString(customerObj.email),
      phone: asNullableString(customerObj.phone),
      avatar_url: asNullableString(customerObj.avatar_url),
    },
    photobooth_item: {
      id: asString(itemObj.id, asString(orderObj.photobooth_item_id)),
      template_id: asString(itemObj.template_id, asString(templateObj.id)),
      preview_url: asNullableString(itemObj.preview_url),
      status: asString(itemObj.status, "ordered"),
      created_at: asString(itemObj.created_at, asString(orderObj.created_at)),
    },
    template: {
      id: asString(templateObj.id),
      name: asString(templateObj.name, "Template không xác định"),
      category: asString(templateObj.category, "general"),
      preview_url: asString(templateObj.preview_url),
      slot_count: asNumber(templateObj.slot_count, slotPhotos.length),
      layout_config: layoutConfig,
    },
    slot_photos: slotPhotos,
    transactions,
    status_history: statusHistory,
  };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const idCheck = orderIdSchema.safeParse(orderId);
  if (!idCheck.success) {
    return null;
  }

  if (isMockAdminMode()) {
    return getMockDetailFromStore(idCheck.data);
  }

  const supabase = await createSupabaseServerClient();
  await expireStalePendingPaymentsSafe(supabase);

  const { data, error } = await supabase.rpc("admin_get_order_detail", {
    p_order_id: idCheck.data,
  });

  if (error) {
    const mapped = mapPostgresError(error);
    if (mapped.code === "NOT_FOUND") {
      return null;
    }
    throw new Error(mapped.message);
  }

  if (!data) {
    return null;
  }

  return normalizeOrderDetail(data);
}
