import "server-only";

import { isMockAdminMode } from "@/lib/env";
import { mapPostgresError } from "@/lib/errors";
import {
  MOCK_DASHBOARD_STATS,
  MOCK_MEMBERSHIP_DISTRIBUTION,
  MOCK_ORDER_STATUS_COUNTS,
  MOCK_ORDERS,
  MOCK_REVENUE_SERIES,
  MOCK_TOP_TEMPLATES,
  MOCK_TRANSACTIONS,
  MOCK_USERS,
} from "@/lib/mock-data";
import {
  expireStalePendingPaymentsSafe,
  resolveEffectiveOrderStatus,
  resolveEffectivePaymentStatus,
} from "@/lib/payment-timeout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  MembershipDistributionItem,
  OrderStatus,
  OrderStatusCount,
  OrderSummary,
  RevenueSeriesPoint,
  TopTemplateStat,
  TransactionItem,
  UserSummary,
} from "@/types/admin";
import {
  enumerateIsoDates,
  getIsoWeekBucketStart,
  type DashboardRange,
  type RevenueGranularity,
} from "./date-range";

export interface DashboardKpiSnapshot {
  current: DashboardStats;
  previous: DashboardStats;
}

export interface RecentActivitySnapshot {
  recentOrders: OrderSummary[];
  recentTransactions: TransactionItem[];
  recentUsers: UserSummary[];
  partialWarnings: string[];
}

function normalizeDashboardStats(raw: unknown): DashboardStats {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    total_users: Number(obj.total_users ?? 0) || 0,
    new_users: Number(obj.new_users ?? 0) || 0,
    orders_today: Number(obj.orders_today ?? 0) || 0,
    pending_orders: Number(obj.pending_orders ?? 0) || 0,
    revenue_month_vnd: Number(obj.revenue_month_vnd ?? 0) || 0,
    revenue_range_vnd: Number(obj.revenue_range_vnd ?? 0) || 0,
    active_members: Number(obj.active_members ?? 0) || 0,
  };
}

function buildMockDailySeries(from: string, to: string): RevenueSeriesPoint[] {
  const mockByBucket = new Map(
    MOCK_REVENUE_SERIES.map((point) => [point.bucket, point] as const),
  );
  const dates = enumerateIsoDates(from, to, 180);

  return dates.map((isoDate, index) => {
    const exact = mockByBucket.get(isoDate);
    if (exact) return exact;

    // Deterministic synthetic pattern for dates outside the 7-day baseline fixture
    const template = MOCK_REVENUE_SERIES[index % MOCK_REVENUE_SERIES.length];
    const factor = 0.72 + ((index * 17) % 11) * 0.05;
    return {
      bucket: isoDate,
      print_revenue_vnd: Math.round((template.print_revenue_vnd * factor) / 1000) * 1000,
      membership_revenue_vnd:
        Math.round((template.membership_revenue_vnd * factor) / 1000) * 1000,
      order_count: Math.max(1, Math.round(template.order_count * factor)),
    };
  });
}

function aggregateMockSeries(
  daily: RevenueSeriesPoint[],
  granularity: RevenueGranularity,
): RevenueSeriesPoint[] {
  if (granularity === "day") return daily;

  const grouped = new Map<string, RevenueSeriesPoint>();
  for (const point of daily) {
    const bucketKey =
      granularity === "week"
        ? getIsoWeekBucketStart(point.bucket)
        : `${point.bucket.slice(0, 7)}-01`;

    const existing = grouped.get(bucketKey);
    if (existing) {
      existing.print_revenue_vnd += point.print_revenue_vnd;
      existing.membership_revenue_vnd += point.membership_revenue_vnd;
      existing.order_count += point.order_count;
    } else {
      grouped.set(bucketKey, {
        bucket: bucketKey,
        print_revenue_vnd: point.print_revenue_vnd,
        membership_revenue_vnd: point.membership_revenue_vnd,
        order_count: point.order_count,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export async function fetchDashboardKpis(
  range: DashboardRange,
): Promise<DashboardKpiSnapshot> {
  if (isMockAdminMode()) {
    const mockSeries = buildMockDailySeries(range.from, range.to);
    const rangeSum = mockSeries.reduce(
      (sum, row) => sum + row.print_revenue_vnd + row.membership_revenue_vnd,
      0,
    );
    const scaledNewUsers = Math.max(
      1,
      Math.round((MOCK_DASHBOARD_STATS.new_users / 30) * range.dayCount),
    );
    const current: DashboardStats = {
      ...MOCK_DASHBOARD_STATS,
      new_users: range.preset === "30d" ? MOCK_DASHBOARD_STATS.new_users : scaledNewUsers,
      revenue_range_vnd:
        range.preset === "7d" ? MOCK_DASHBOARD_STATS.revenue_range_vnd : rangeSum,
    };
    const previous: DashboardStats = {
      ...current,
      new_users: Math.max(0, Math.round(current.new_users * 0.84)),
      revenue_range_vnd: Math.round(current.revenue_range_vnd * 0.88),
    };
    return { current, previous };
  }

  const supabase = await createSupabaseServerClient();
  await expireStalePendingPaymentsSafe(supabase);

  const [currentRes, prevRes] = await Promise.all([
    supabase.rpc("admin_dashboard_stats", {
      p_from: range.from,
      p_to: range.to,
    }),
    supabase.rpc("admin_dashboard_stats", {
      p_from: range.prevFrom,
      p_to: range.prevTo,
    }),
  ]);

  if (currentRes.error) {
    throw new Error(mapPostgresError(currentRes.error).message);
  }

  const current = normalizeDashboardStats(currentRes.data);
  const previous = prevRes.error
    ? { ...current, new_users: 0, revenue_range_vnd: 0 }
    : normalizeDashboardStats(prevRes.data);

  return { current, previous };
}

export async function fetchRevenueSeries(
  range: DashboardRange,
): Promise<RevenueSeriesPoint[]> {
  if (isMockAdminMode()) {
    const daily = buildMockDailySeries(range.from, range.to);
    return aggregateMockSeries(daily, range.granularity);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_revenue_series", {
    p_from: range.from,
    p_to: range.to,
    p_granularity: range.granularity,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  return (data ?? []).map((row) => ({
    bucket: String(row.bucket),
    print_revenue_vnd: Number(row.print_revenue_vnd ?? 0) || 0,
    membership_revenue_vnd: Number(row.membership_revenue_vnd ?? 0) || 0,
    order_count: Number(row.order_count ?? 0) || 0,
  }));
}

export async function fetchOrderStatusCounts(
  range: DashboardRange,
): Promise<OrderStatusCount[]> {
  if (isMockAdminMode()) {
    return MOCK_ORDER_STATUS_COUNTS;
  }

  const supabase = await createSupabaseServerClient();
  await expireStalePendingPaymentsSafe(supabase);

  const { data, error } = await supabase.rpc("admin_order_status_counts", {
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  return (data ?? []).map((row) => ({
    status: row.status as OrderStatus,
    count: Number(row.count ?? 0) || 0,
  }));
}

export async function fetchMembershipDistribution(): Promise<
  MembershipDistributionItem[]
> {
  if (isMockAdminMode()) {
    return MOCK_MEMBERSHIP_DISTRIBUTION;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_membership_distribution");

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  return (data ?? []).map((row) => ({
    plan_name: String(row.plan_name ?? "Free"),
    active_count: Number(row.active_count ?? 0) || 0,
  }));
}

export async function fetchTopTemplates(
  range: DashboardRange,
  limit = 5,
): Promise<TopTemplateStat[]> {
  if (isMockAdminMode()) {
    return MOCK_TOP_TEMPLATES.slice(0, limit);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_top_templates", {
    p_from: range.from,
    p_to: range.to,
    p_limit: limit,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  return (data ?? []).map((row) => ({
    template_id: String(row.template_id),
    name: String(row.name),
    preview_url: String(row.preview_url ?? ""),
    order_count: Number(row.order_count ?? 0) || 0,
    revenue_vnd: Number(row.revenue_vnd ?? 0) || 0,
  }));
}

export async function fetchRecentActivity(): Promise<RecentActivitySnapshot> {
  if (isMockAdminMode()) {
    return {
      recentOrders: [...MOCK_ORDERS]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 4),
      recentTransactions: [...MOCK_TRANSACTIONS]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 4),
      recentUsers: [...MOCK_USERS]
        .filter((u) => u.role === "user")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 4),
      partialWarnings: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  await expireStalePendingPaymentsSafe(supabase);

  const [ordersRes, txRes, usersRes] = await Promise.allSettled([
    supabase.rpc("admin_list_orders", {
      p_sort: "created_at.desc",
      p_limit: 4,
      p_offset: 0,
    }),
    supabase.rpc("admin_list_transactions", {
      p_limit: 4,
      p_offset: 0,
    }),
    supabase.rpc("admin_list_users", {
      p_role: "user",
      p_sort: "created_at.desc",
      p_limit: 4,
      p_offset: 0,
    }),
  ]);

  const partialWarnings: string[] = [];
  let failureCount = 0;

  let recentOrders: OrderSummary[] = [];
  if (ordersRes.status === "fulfilled" && !ordersRes.value.error) {
    recentOrders = (ordersRes.value.data ?? []).map((row) => ({
      id: row.id,
      short_code: row.short_code,
      user_id: row.user_id,
      customer_name: row.customer_name,
      shipping_phone: row.shipping_phone,
      template_name: row.template_name,
      preview_url: row.preview_url,
      quantity: Number(row.quantity ?? 0) || 0,
      total_price_vnd: Number(row.total_price_vnd ?? 0) || 0,
      status: resolveEffectiveOrderStatus(
        row.status as OrderStatus,
        row.payment_status,
        row.payment_method,
        row.created_at,
      ),
      payment_status:
        row.payment_status === "pending" &&
        resolveEffectiveOrderStatus(
          row.status as OrderStatus,
          row.payment_status,
          row.payment_method,
          row.created_at,
        ) === "cancelled"
          ? "cancelled"
          : row.payment_status,
      payment_method: row.payment_method,
      created_at: row.created_at,
    }));
  } else {
    failureCount += 1;
    partialWarnings.push("Không thể tải đơn hàng gần đây.");
  }

  let recentTransactions: TransactionItem[] = [];
  if (txRes.status === "fulfilled" && !txRes.value.error) {
    recentTransactions = (txRes.value.data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      display_name: row.display_name,
      type: row.type as TransactionItem["type"],
      amount_vnd: Number(row.amount_vnd ?? 0) || 0,
      payment_method: row.payment_method,
      payment_gateway_ref: row.payment_gateway_ref,
      order_code: row.order_code,
      status: resolveEffectivePaymentStatus(
        row.status as TransactionItem["status"],
        row.created_at,
        row.payment_method,
      ),
      order_id: row.order_id,
      created_at: row.created_at,
    }));
  } else {
    failureCount += 1;
    partialWarnings.push("Không thể tải giao dịch gần đây.");
  }

  let recentUsers: UserSummary[] = [];
  if (usersRes.status === "fulfilled" && !usersRes.value.error) {
    recentUsers = (usersRes.value.data ?? []).map((row) => ({
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      phone: row.phone,
      avatar_url: row.avatar_url,
      role: row.role as UserSummary["role"],
      tier: row.tier,
      is_locked: Boolean(row.is_locked),
      drawer_count: Number(row.drawer_count ?? 0) || 0,
      created_at: row.created_at,
      last_sign_in_at: row.last_sign_in_at,
    }));
  } else {
    failureCount += 1;
    partialWarnings.push("Không thể tải người dùng mới.");
  }

  if (failureCount === 3) {
    throw new Error("Không thể tải dữ liệu hoạt động gần đây.");
  }

  return {
    recentOrders,
    recentTransactions,
    recentUsers,
    partialWarnings,
  };
}
