import "server-only";

import { z } from "zod";
import { isMockAdminMode } from "@/lib/env";
import { ADMIN_ERROR_MESSAGES, mapPostgresError } from "@/lib/errors";
import { MOCK_USERS, getMockUserDetail } from "@/lib/mock-data";
import { getTotalPages } from "@/lib/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminErrorCode,
  MembershipDurationType,
  MembershipStatus,
  OrderStatus,
  PaginatedResult,
  PaymentStatus,
  TransactionItem,
  TransactionType,
  UserDetail,
  UserDrawerStats,
  UserMembershipHistoryItem,
  UserOrdersSummary,
  UserProfileDetail,
  UserRole,
  UserSummary,
} from "@/types/admin";
import type { UsersQueryFilters, UserSortOption } from "./schemas";

export type UsersQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AdminErrorCode; message: string };

export interface UserDetailProfileView extends UserProfileDetail {
  tier: string;
  last_sign_in_at: string | null;
}

export interface UserMembershipHistoryView extends UserMembershipHistoryItem {
  price_vnd?: number;
  duration_type?: MembershipDurationType;
}

export interface UserOrdersSummaryView extends UserOrdersSummary {
  cancelled_orders?: number;
}

export interface UserRecentOrderView {
  id: string;
  short_code: string;
  template_name: string | null;
  quantity: number;
  total_price_vnd: number;
  status: OrderStatus;
  created_at: string;
}

export interface UserDetailView {
  profile: UserDetailProfileView;
  email: string | null;
  memberships: UserMembershipHistoryView[];
  drawer_stats: UserDrawerStats;
  orders_summary: UserOrdersSummaryView;
  recent_orders: UserRecentOrderView[];
  recent_transactions: TransactionItem[];
}

const uuidSchema = z.string().uuid();

function normalizeRole(role: unknown): UserRole {
  return role === "admin" ? "admin" : "user";
}

function normalizeMembershipStatus(status: unknown): MembershipStatus {
  if (status === "active" || status === "expired" || status === "cancelled") {
    return status;
  }
  return "expired";
}

function normalizeOrderStatus(status: unknown): OrderStatus {
  if (
    status === "pending" ||
    status === "processing" ||
    status === "printing" ||
    status === "shipping" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "pending";
}

function normalizePaymentStatus(status: unknown): PaymentStatus {
  if (
    status === "pending" ||
    status === "success" ||
    status === "failed" ||
    status === "refunded" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "pending";
}

function normalizeTransactionType(type: unknown): TransactionType {
  if (type === "print_order" || type === "membership" || type === "drawer_purchase") {
    return type;
  }
  return "print_order";
}

function matchesMockTier(userTier: string, filterTier: UsersQueryFilters["tier"]): boolean {
  if (!filterTier) return true;
  const normalized = userTier.trim().toLowerCase();
  switch (filterTier) {
    case "free":
      return normalized === "free";
    case "go":
      return normalized === "pause go";
    case "plus":
      return normalized === "pause plus";
    case "premium":
      return normalized === "pause premium";
  }
}

function compareMockUsers(a: UserSummary, b: UserSummary, sort: UserSortOption): number {
  switch (sort) {
    case "created_at.asc":
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    case "created_at.desc":
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    case "display_name.asc":
      return a.display_name.localeCompare(b.display_name, "vi");
    case "display_name.desc":
      return b.display_name.localeCompare(a.display_name, "vi");
    case "drawer_count.asc":
      return a.drawer_count - b.drawer_count;
    case "drawer_count.desc":
      return b.drawer_count - a.drawer_count;
    case "last_sign_in_at.asc": {
      if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
      if (!a.last_sign_in_at) return 1;
      if (!b.last_sign_in_at) return -1;
      return new Date(a.last_sign_in_at).getTime() - new Date(b.last_sign_in_at).getTime();
    }
    case "last_sign_in_at.desc": {
      if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
      if (!a.last_sign_in_at) return 1;
      if (!b.last_sign_in_at) return -1;
      return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime();
    }
  }
}

function listMockUsers(filters: UsersQueryFilters): PaginatedResult<UserSummary> {
  const search = filters.q.toLowerCase();

  const filtered = MOCK_USERS.filter((user) => {
    if (search) {
      const haystacks = [user.display_name, user.email ?? "", user.phone ?? ""];
      const matched = haystacks.some((item) => item.toLowerCase().includes(search));
      if (!matched) return false;
    }

    if (!matchesMockTier(user.tier, filters.tier)) {
      return false;
    }

    if (filters.status === "locked" && !user.is_locked) return false;
    if (filters.status === "active" && user.is_locked) return false;
    if (filters.role && user.role !== filters.role) return false;

    return true;
  }).sort((a, b) => compareMockUsers(a, b, filters.sort));

  const totalCount = filtered.length;
  const totalPages = getTotalPages(totalCount, filters.pageSize);
  const safePage = Math.min(filters.page, totalPages);
  const offset = (safePage - 1) * filters.pageSize;
  const items = filtered.slice(offset, offset + filters.pageSize);

  return {
    items,
    totalCount,
    page: safePage,
    pageSize: filters.pageSize,
    totalPages,
  };
}

/**
 * Fetches paginated, filtered user list via RPC admin_list_users (or mock fallback).
 * Uses the authenticated admin's JWT server client (never service role).
 */
export async function listAdminUsers(
  filters: UsersQueryFilters,
): Promise<UsersQueryResult<PaginatedResult<UserSummary>>> {
  if (isMockAdminMode()) {
    return { ok: true, data: listMockUsers(filters) };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_list_users", {
      p_search: filters.q || null,
      p_tier: filters.tier || null,
      p_status: filters.status || null,
      p_role: filters.role || null,
      p_sort: filters.sort || "created_at.desc",
      p_limit: filters.pageSize,
      p_offset: filters.offset,
    });

    if (error) {
      const mapped = mapPostgresError(error);
      return { ok: false, code: mapped.code, message: mapped.message };
    }

    const rows = Array.isArray(data) ? data : [];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
    const totalPages = getTotalPages(totalCount, filters.pageSize);

    const items: UserSummary[] = rows.map((row) => ({
      id: String(row.id),
      display_name: String(row.display_name ?? ""),
      email: row.email ?? null,
      phone: row.phone ?? null,
      avatar_url: row.avatar_url ?? null,
      role: normalizeRole(row.role),
      tier: String(row.tier ?? "Free"),
      is_locked: Boolean(row.is_locked),
      drawer_count: Number(row.drawer_count ?? 0),
      created_at: String(row.created_at),
      last_sign_in_at: row.last_sign_in_at ?? null,
      total_count: Number(row.total_count ?? totalCount),
    }));

    return {
      ok: true,
      data: {
        items,
        totalCount,
        page: Math.min(filters.page, totalPages),
        pageSize: filters.pageSize,
        totalPages,
      },
    };
  } catch (err) {
    const mapped = mapPostgresError(err);
    return { ok: false, code: mapped.code, message: mapped.message };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function deriveMockTier(detail: UserDetail, userId: string): string {
  const fromSummary = MOCK_USERS.find((u) => u.id === userId)?.tier;
  if (fromSummary) return fromSummary;
  const activeMembership = detail.memberships.find(
    (m) => m.status === "active" && new Date(m.expires_at).getTime() > Date.now(),
  );
  return activeMembership?.plan_name ?? "Free";
}

function mapRawUserDetail(rawPayload: unknown): UserDetailView | null {
  const root = asRecord(rawPayload);
  const rawProfile = asRecord(root.profile);

  if (typeof rawProfile.id !== "string" || !rawProfile.id) {
    return null;
  }

  const profileId = rawProfile.id;
  const displayName = String(rawProfile.display_name ?? "");
  const rawMemberships = Array.isArray(root.memberships) ? root.memberships : [];
  const rawDrawerStats = asRecord(root.drawer_stats);
  const rawOrdersSummary = asRecord(root.orders_summary);
  const rawRecentOrders = Array.isArray(root.recent_orders) ? root.recent_orders : [];
  const rawRecentTransactions = Array.isArray(root.recent_transactions)
    ? root.recent_transactions
    : [];

  const activeMembership = rawMemberships.find((item) => {
    const m = asRecord(item);
    return (
      m.status === "active" &&
      typeof m.expires_at === "string" &&
      new Date(m.expires_at).getTime() > Date.now()
    );
  });

  const resolvedTier =
    typeof rawProfile.tier === "string" && rawProfile.tier.trim()
      ? rawProfile.tier
      : activeMembership && typeof asRecord(activeMembership).plan_name === "string"
        ? String(asRecord(activeMembership).plan_name)
        : "Free";

  const profile: UserDetailProfileView = {
    id: profileId,
    display_name: displayName,
    avatar_url: typeof rawProfile.avatar_url === "string" ? rawProfile.avatar_url : null,
    phone: typeof rawProfile.phone === "string" ? rawProfile.phone : null,
    max_drawers: Number(rawProfile.max_drawers ?? 3),
    role: normalizeRole(rawProfile.role),
    is_premium: Boolean(rawProfile.is_premium),
    is_locked: Boolean(rawProfile.is_locked),
    locked_at: typeof rawProfile.locked_at === "string" ? rawProfile.locked_at : null,
    locked_reason: typeof rawProfile.locked_reason === "string" ? rawProfile.locked_reason : null,
    created_at: String(rawProfile.created_at ?? ""),
    updated_at: String(rawProfile.updated_at ?? rawProfile.created_at ?? ""),
    tier: resolvedTier,
    last_sign_in_at:
      typeof rawProfile.last_sign_in_at === "string" ? rawProfile.last_sign_in_at : null,
  };

  const memberships: UserMembershipHistoryView[] = rawMemberships.map((item) => {
    const m = asRecord(item);
    const durationType =
      m.duration_type === "monthly" || m.duration_type === "yearly" ? m.duration_type : undefined;
    return {
      id: String(m.id ?? ""),
      plan_id: String(m.plan_id ?? ""),
      plan_name: String(m.plan_name ?? "—"),
      price_vnd: typeof m.price_vnd === "number" ? m.price_vnd : undefined,
      duration_type: durationType,
      started_at: String(m.started_at ?? ""),
      expires_at: String(m.expires_at ?? ""),
      status: normalizeMembershipStatus(m.status),
      created_at: String(m.created_at ?? m.started_at ?? ""),
    };
  });

  // Aggregate storage stats only — never fetch or return private drawer photos/URLs.
  const drawer_stats: UserDrawerStats = {
    drawer_count: Number(rawDrawerStats.drawer_count ?? 0),
    photo_count: Number(rawDrawerStats.photo_count ?? 0),
    storage_used_bytes: Number(rawDrawerStats.storage_used_bytes ?? 0),
  };

  const orders_summary: UserOrdersSummaryView = {
    total_orders: Number(rawOrdersSummary.total_orders ?? 0),
    total_spent_vnd: Number(rawOrdersSummary.total_spent_vnd ?? 0),
    pending_orders: Number(rawOrdersSummary.pending_orders ?? 0),
    completed_orders: Number(rawOrdersSummary.completed_orders ?? 0),
    cancelled_orders:
      typeof rawOrdersSummary.cancelled_orders === "number"
        ? rawOrdersSummary.cancelled_orders
        : undefined,
  };

  const recent_orders: UserRecentOrderView[] = rawRecentOrders.map((item) => {
    const o = asRecord(item);
    const id = String(o.id ?? "");
    return {
      id,
      short_code:
        typeof o.short_code === "string" && o.short_code
          ? o.short_code
          : id.slice(0, 8).toUpperCase(),
      template_name: typeof o.template_name === "string" ? o.template_name : null,
      quantity: Number(o.quantity ?? 1),
      total_price_vnd: Number(o.total_price_vnd ?? 0),
      status: normalizeOrderStatus(o.status),
      created_at: String(o.created_at ?? ""),
    };
  });

  const recent_transactions: TransactionItem[] = rawRecentTransactions.map((item) => {
    const tx = asRecord(item);
    return {
      id: String(tx.id ?? ""),
      user_id: typeof tx.user_id === "string" ? tx.user_id : profileId,
      display_name: typeof tx.display_name === "string" ? tx.display_name : displayName,
      type: normalizeTransactionType(tx.type),
      amount_vnd: Number(tx.amount_vnd ?? 0),
      payment_method: typeof tx.payment_method === "string" ? tx.payment_method : null,
      payment_gateway_ref:
        typeof tx.payment_gateway_ref === "string" ? tx.payment_gateway_ref : null,
      order_code:
        typeof tx.order_code === "number" || typeof tx.order_code === "string"
          ? tx.order_code
          : null,
      status: normalizePaymentStatus(tx.status),
      order_id: typeof tx.order_id === "string" ? tx.order_id : null,
      metadata: null,
      created_at: String(tx.created_at ?? ""),
    };
  });

  return {
    profile,
    email: typeof root.email === "string" ? root.email : null,
    memberships,
    drawer_stats,
    orders_summary,
    recent_orders,
    recent_transactions,
  };
}

/**
 * Fetches detailed admin view for a single user via RPC admin_get_user_detail (or mock fallback).
 * Returns aggregate storage counts only; strictly excludes private drawer photos.
 */
export async function getAdminUserDetail(
  userId: string,
): Promise<UsersQueryResult<UserDetailView>> {
  if (!uuidSchema.safeParse(userId).success) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: ADMIN_ERROR_MESSAGES.NOT_FOUND,
    };
  }

  if (isMockAdminMode()) {
    const mockDetail = getMockUserDetail(userId);
    if (!mockDetail) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: ADMIN_ERROR_MESSAGES.NOT_FOUND,
      };
    }

    const summary = MOCK_USERS.find((u) => u.id === userId);
    return {
      ok: true,
      data: {
        ...mockDetail,
        profile: {
          ...mockDetail.profile,
          tier: deriveMockTier(mockDetail, userId),
          last_sign_in_at: summary?.last_sign_in_at ?? null,
        },
        recent_orders: mockDetail.recent_orders.map((order) => ({
          id: order.id,
          short_code: order.short_code,
          template_name: order.template_name,
          quantity: order.quantity,
          total_price_vnd: order.total_price_vnd,
          status: order.status,
          created_at: order.created_at,
        })),
      },
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_get_user_detail", {
      p_user_id: userId,
    });

    if (error) {
      const mapped = mapPostgresError(error);
      return { ok: false, code: mapped.code, message: mapped.message };
    }

    const mappedDetail = mapRawUserDetail(data);
    if (!mappedDetail) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: ADMIN_ERROR_MESSAGES.NOT_FOUND,
      };
    }

    return { ok: true, data: mappedDetail };
  } catch (err) {
    const mapped = mapPostgresError(err);
    return { ok: false, code: mapped.code, message: mapped.message };
  }
}
