import "server-only";

import { requireAdmin } from "@/lib/auth/require-admin";
import { isMockAdminMode } from "@/lib/env";
import { mapPostgresError } from "@/lib/errors";
import { MOCK_TRANSACTIONS } from "@/lib/mock-data";
import { getTotalPages, parsePagination } from "@/lib/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PaginatedResult,
  PaymentStatus,
  TransactionItem,
  TransactionType,
} from "@/types/admin";

const VALID_TYPES = new Set<TransactionType>([
  "print_order",
  "membership",
  "drawer_purchase",
]);

const VALID_STATUSES = new Set<PaymentStatus>([
  "pending",
  "success",
  "failed",
  "refunded",
]);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const vnDateIsoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function sanitizeIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!ISO_DATE_REGEX.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

function toVietnamDateIso(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "";
  return vnDateIsoFormatter.format(date);
}

function normalizeMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return { value: raw };
}

function normalizeTransactionType(value: string): TransactionType {
  if (VALID_TYPES.has(value as TransactionType)) {
    return value as TransactionType;
  }
  return "print_order";
}

function normalizePaymentStatus(value: string): PaymentStatus {
  if (VALID_STATUSES.has(value as PaymentStatus)) {
    return value as PaymentStatus;
  }
  return "pending";
}

export interface TransactionQueryParams {
  type?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: string | number;
  pageSize?: string | number;
}

/**
 * Fetches paginated admin transaction reconciliation logs (FR-05.2).
 */
export async function listTransactions(
  params: TransactionQueryParams = {},
): Promise<PaginatedResult<TransactionItem>> {
  await requireAdmin();

  const { page, pageSize, offset, limit } = parsePagination({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
  });

  const rawType = params.type?.trim().toLowerCase() ?? "";
  const typeFilter = VALID_TYPES.has(rawType as TransactionType)
    ? (rawType as TransactionType)
    : null;

  const rawStatus = params.status?.trim().toLowerCase() ?? "";
  const statusFilter = VALID_STATUSES.has(rawStatus as PaymentStatus)
    ? (rawStatus as PaymentStatus)
    : null;

  const searchFilter = params.search?.trim() || null;
  const fromFilter = sanitizeIsoDate(params.from);
  const toFilter = sanitizeIsoDate(params.to);

  if (isMockAdminMode()) {
    let filtered = [...MOCK_TRANSACTIONS];

    if (typeFilter) {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (fromFilter) {
      filtered = filtered.filter((item) => {
        const day = toVietnamDateIso(item.created_at);
        return day !== "" && day >= fromFilter;
      });
    }

    if (toFilter) {
      filtered = filtered.filter((item) => {
        const day = toVietnamDateIso(item.created_at);
        return day !== "" && day <= toFilter;
      });
    }

    if (searchFilter) {
      const needle = searchFilter.toLowerCase();
      filtered = filtered.filter((item) => {
        const orderCode = item.order_code !== null ? String(item.order_code) : "";
        return (
          orderCode.toLowerCase().includes(needle) ||
          (item.payment_gateway_ref ?? "").toLowerCase().includes(needle) ||
          item.display_name.toLowerCase().includes(needle) ||
          item.id.toLowerCase().includes(needle)
        );
      });
    }

    filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const totalCount = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
      items: paged,
      totalCount,
      page,
      pageSize,
      totalPages: getTotalPages(totalCount, pageSize),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_transactions", {
    p_type: typeFilter,
    p_status: statusFilter,
    p_search: searchFilter,
    p_from: fromFilter,
    p_to: toFilter,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;

  const items: TransactionItem[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    type: normalizeTransactionType(row.type),
    amount_vnd: Number(row.amount_vnd ?? 0),
    payment_method: row.payment_method,
    payment_gateway_ref: row.payment_gateway_ref,
    order_code: row.order_code,
    status: normalizePaymentStatus(row.status),
    order_id: row.order_id,
    metadata: normalizeMetadata(row.metadata),
    created_at: row.created_at,
    total_count: Number(row.total_count ?? totalCount),
  }));

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: getTotalPages(totalCount, pageSize),
  };
}
