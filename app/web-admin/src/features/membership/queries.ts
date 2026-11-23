import "server-only";

import { requireAdmin } from "@/lib/auth/require-admin";
import { isMockAdminMode } from "@/lib/env";
import { mapPostgresError } from "@/lib/errors";
import { getTotalPages, parsePagination } from "@/lib/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MembershipDurationType,
  MembershipPlan,
  MembershipStatus,
  MembershipSubscriber,
  PaginatedResult,
} from "@/types/admin";
import {
  getMockMembershipPlanById,
  getMockMembershipPlans,
  getMockSubscribers,
} from "./mock-store";
import { UUID_REGEX } from "./schemas";

function normalizeDurationType(value: string): MembershipDurationType {
  return value === "monthly" ? "monthly" : "yearly";
}

function normalizeMembershipStatus(value: string): MembershipStatus {
  if (value === "expired" || value === "cancelled") {
    return value;
  }
  return "active";
}

function mapPlanRow(row: {
  id: string;
  name: string;
  description: string | null;
  price_vnd: number;
  duration_type: string;
  extra_drawers: number;
  extra_storage_bytes: number;
  access_premium_templates: boolean;
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
  active_subscriber_count?: number;
}): MembershipPlan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price_vnd: Number(row.price_vnd ?? 0),
    duration_type: normalizeDurationType(row.duration_type),
    extra_drawers: Number(row.extra_drawers ?? 0),
    extra_storage_bytes: Number(row.extra_storage_bytes ?? 0),
    access_premium_templates: Boolean(row.access_premium_templates),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    subscriber_count: Number(row.subscriber_count ?? 0),
    active_subscriber_count: Number(row.active_subscriber_count ?? 0),
  };
}

/**
 * Fetches membership plans with total and active subscriber counts.
 */
export async function listMembershipPlans(options?: {
  includeInactive?: boolean;
}): Promise<MembershipPlan[]> {
  await requireAdmin();
  const includeInactive = options?.includeInactive ?? true;

  if (isMockAdminMode()) {
    return getMockMembershipPlans(includeInactive);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_membership_plans", {
    p_include_inactive: includeInactive,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  return (data ?? []).map(mapPlanRow);
}

/**
 * Fetches a single membership plan by ID (including inactive plans and subscriber stats).
 */
export async function getMembershipPlanById(id: string): Promise<MembershipPlan | null> {
  await requireAdmin();

  if (!UUID_REGEX.test(id)) {
    return null;
  }

  if (isMockAdminMode()) {
    return getMockMembershipPlanById(id);
  }

  const plans = await listMembershipPlans({ includeInactive: true });
  return plans.find((plan) => plan.id === id) ?? null;
}

export interface SubscriberQueryParams {
  search?: string;
  status?: string;
  planId?: string;
  expiringWithinDays?: number | null;
  page?: string | number;
  pageSize?: string | number;
}

const VALID_STATUSES = new Set<MembershipStatus>(["active", "expired", "cancelled"]);

/**
 * Fetches paginated membership subscribers filtered by status, plan, expiry window, and search.
 */
export async function listMembershipSubscribers(
  params: SubscriberQueryParams = {},
): Promise<PaginatedResult<MembershipSubscriber>> {
  await requireAdmin();

  const { page, pageSize, offset, limit } = parsePagination({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
  });

  const normalizedSearch = params.search?.trim() || "";
  const rawStatus = params.status?.trim().toLowerCase() ?? "";
  const statusFilter = VALID_STATUSES.has(rawStatus as MembershipStatus)
    ? (rawStatus as MembershipStatus)
    : null;

  const rawPlanId = params.planId?.trim() ?? "";
  if (rawPlanId && !UUID_REGEX.test(rawPlanId)) {
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }
  const planIdFilter = rawPlanId || null;

  const expiringWithinDays =
    typeof params.expiringWithinDays === "number" &&
    Number.isFinite(params.expiringWithinDays) &&
    params.expiringWithinDays >= 0
      ? Math.floor(params.expiringWithinDays)
      : null;

  if (isMockAdminMode()) {
    const plans = getMockMembershipPlans(true);
    const targetPlan = planIdFilter
      ? plans.find((plan) => plan.id === planIdFilter)
      : undefined;

    let filtered = getMockSubscribers();

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (planIdFilter) {
      filtered = filtered.filter(
        (item) =>
          item.plan_id === planIdFilter ||
          (targetPlan !== undefined &&
            item.plan_name.toLowerCase() === targetPlan.name.toLowerCase()),
      );
    }

    if (expiringWithinDays !== null) {
      filtered = filtered.filter(
        (item) =>
          item.status === "active" &&
          item.days_left > 0 &&
          item.days_left <= expiringWithinDays,
      );
      filtered.sort((a, b) => a.days_left - b.days_left);
    }

    if (normalizedSearch) {
      const needle = normalizedSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.display_name.toLowerCase().includes(needle) ||
          (item.email ?? "").toLowerCase().includes(needle),
      );
    }

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
  const { data, error } = await supabase.rpc("admin_list_memberships", {
    p_status: statusFilter,
    p_plan_id: planIdFilter,
    p_expiring_within_days: expiringWithinDays,
    p_search: normalizedSearch || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(mapPostgresError(error).message);
  }

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
  const items: MembershipSubscriber[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    email: row.email,
    plan_name: row.plan_name,
    started_at: row.started_at,
    expires_at: row.expires_at,
    days_left: Number(row.days_left ?? 0),
    status: normalizeMembershipStatus(row.status),
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
