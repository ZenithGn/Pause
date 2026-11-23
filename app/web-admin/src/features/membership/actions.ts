"use server";

import { revalidatePath } from "next/cache";
import { errorResult, okResult, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isMockAdminMode } from "@/lib/env";
import { ADMIN_ERROR_MESSAGES, mapPostgresError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MembershipDurationType, MembershipPlan } from "@/types/admin";
import {
  deleteMockMembershipPlan,
  getMockMembershipPlanById,
  upsertMockMembershipPlan,
} from "./mock-store";
import {
  membershipPlanFormSchema,
  membershipPlanIdSchema,
  toMembershipPlanRpcPayload,
  toggleMembershipPlanActiveSchema,
  type MembershipPlanFormInput,
} from "./schemas";

function extractFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path[0] ? String(issue.path[0]) : "_form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = [];
    }
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function mapMembershipRpcError(error: unknown): ActionResult<never> {
  const rawMessage =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  if (rawMessage.includes("PLAN_NAME_REQUIRED")) {
    return errorResult("VALIDATION_ERROR", "Vui lòng nhập tên gói hội viên.", {
      name: ["Vui lòng nhập tên gói hội viên."],
    });
  }

  if (rawMessage.includes("INVALID_PLAN_INPUT")) {
    return errorResult("VALIDATION_ERROR", ADMIN_ERROR_MESSAGES.VALIDATION_ERROR);
  }

  const mapped = mapPostgresError(error);
  if (mapped.code === "PLAN_NAME_TAKEN") {
    return errorResult(mapped.code, mapped.message, {
      name: [mapped.message],
    });
  }

  return errorResult(mapped.code, mapped.message);
}

function mapPlanRowFromRpc(raw: unknown): MembershipPlan {
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: row.description === null || row.description === undefined ? null : String(row.description),
    price_vnd: Number(row.price_vnd ?? 0),
    duration_type: (row.duration_type === "monthly" ? "monthly" : "yearly") as MembershipDurationType,
    extra_drawers: Number(row.extra_drawers ?? 0),
    extra_storage_bytes: Number(row.extra_storage_bytes ?? 0),
    access_premium_templates: Boolean(row.access_premium_templates),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function revalidateMembershipPaths(planId?: string | null) {
  revalidatePath("/admin/membership/plans");
  revalidatePath("/admin/membership/subscribers");
  revalidatePath("/admin");
  if (planId) {
    revalidatePath(`/admin/membership/plans/${planId}`);
  }
}

/**
 * Creates or updates a membership plan via admin_upsert_membership_plan.
 */
export async function upsertMembershipPlanAction(
  input: MembershipPlanFormInput,
): Promise<ActionResult<MembershipPlan>> {
  await requireAdmin();

  const parsed = membershipPlanFormSchema.safeParse(input);
  if (!parsed.success) {
    return errorResult(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? ADMIN_ERROR_MESSAGES.VALIDATION_ERROR,
      extractFieldErrors(parsed.error.issues),
    );
  }

  const rpcPayload = toMembershipPlanRpcPayload(parsed.data);
  const isEditing = Boolean(rpcPayload.p_id);

  if (isMockAdminMode()) {
    const result = upsertMockMembershipPlan({
      id: rpcPayload.p_id,
      name: rpcPayload.p_name,
      description: rpcPayload.p_description,
      price_vnd: rpcPayload.p_price_vnd,
      duration_type: rpcPayload.p_duration_type,
      extra_drawers: rpcPayload.p_extra_drawers,
      extra_storage_bytes: rpcPayload.p_extra_storage_bytes,
      access_premium_templates: rpcPayload.p_access_premium_templates,
      is_active: rpcPayload.p_is_active,
    });

    if (result.errorCode === "PLAN_NAME_TAKEN") {
      return errorResult("PLAN_NAME_TAKEN", ADMIN_ERROR_MESSAGES.PLAN_NAME_TAKEN, {
        name: [ADMIN_ERROR_MESSAGES.PLAN_NAME_TAKEN],
      });
    }
    if (result.errorCode === "NOT_FOUND" || !result.plan) {
      return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
    }

    revalidateMembershipPaths(result.plan.id);
    return okResult(
      result.plan,
      isEditing ? "Đã cập nhật gói hội viên thành công." : "Đã tạo gói hội viên mới thành công.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_upsert_membership_plan", rpcPayload);

  if (error) {
    return mapMembershipRpcError(error);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return errorResult("INTERNAL_ERROR", ADMIN_ERROR_MESSAGES.INTERNAL_ERROR);
  }

  const plan = mapPlanRowFromRpc(data);
  revalidateMembershipPaths(plan.id);

  return okResult(
    plan,
    isEditing ? "Đã cập nhật gói hội viên thành công." : "Đã tạo gói hội viên mới thành công.",
  );
}

/**
 * Toggles is_active on an existing membership plan without modifying price or benefits.
 */
export async function toggleMembershipPlanActiveAction(input: {
  id: string;
  is_active: boolean;
}): Promise<ActionResult<MembershipPlan>> {
  await requireAdmin();

  const parsed = toggleMembershipPlanActiveSchema.safeParse(input);
  if (!parsed.success) {
    return errorResult(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? ADMIN_ERROR_MESSAGES.VALIDATION_ERROR,
    );
  }

  const { id, is_active } = parsed.data;

  if (isMockAdminMode()) {
    const existing = getMockMembershipPlanById(id);
    if (!existing) {
      return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
    }

    const updated = upsertMockMembershipPlan({
      id: existing.id,
      name: existing.name,
      description: existing.description,
      price_vnd: existing.price_vnd,
      duration_type: existing.duration_type,
      extra_drawers: existing.extra_drawers,
      extra_storage_bytes: existing.extra_storage_bytes,
      access_premium_templates: existing.access_premium_templates,
      is_active,
    });

    if (!updated.plan) {
      return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
    }

    revalidateMembershipPaths(id);
    return okResult(
      updated.plan,
      is_active ? `Đã mở bán lại gói "${updated.plan.name}".` : `Đã ngừng bán gói "${updated.plan.name}".`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: listData, error: listError } = await supabase.rpc(
    "admin_list_membership_plans",
    { p_include_inactive: true },
  );

  if (listError) {
    return mapMembershipRpcError(listError);
  }

  const existing = (listData ?? []).find((row) => row.id === id);
  if (!existing) {
    return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
  }

  const { data, error } = await supabase.rpc("admin_upsert_membership_plan", {
    p_id: existing.id,
    p_name: existing.name,
    p_description: existing.description,
    p_price_vnd: existing.price_vnd,
    p_duration_type: existing.duration_type,
    p_extra_drawers: existing.extra_drawers,
    p_extra_storage_bytes: existing.extra_storage_bytes,
    p_access_premium_templates: existing.access_premium_templates,
    p_is_active: is_active,
  });

  if (error) {
    return mapMembershipRpcError(error);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return errorResult("INTERNAL_ERROR", ADMIN_ERROR_MESSAGES.INTERNAL_ERROR);
  }

  const plan = mapPlanRowFromRpc(data);
  revalidateMembershipPaths(id);

  return okResult(
    plan,
    is_active ? `Đã mở bán lại gói "${plan.name}".` : `Đã ngừng bán gói "${plan.name}".`,
  );
}

/**
 * Deletes an unused membership plan via admin_delete_membership_plan.
 * Returns PLAN_IN_USE if any membership history references the plan.
 */
export async function deleteMembershipPlanAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = membershipPlanIdSchema.safeParse({ id });
  if (!parsed.success) {
    return errorResult("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? ADMIN_ERROR_MESSAGES.VALIDATION_ERROR);
  }

  if (isMockAdminMode()) {
    const result = deleteMockMembershipPlan(parsed.data.id);
    if (!result.ok) {
      return errorResult(result.errorCode, ADMIN_ERROR_MESSAGES[result.errorCode]);
    }
    revalidateMembershipPaths(parsed.data.id);
    return okResult({ id: parsed.data.id }, "Đã xóa gói hội viên.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_delete_membership_plan", {
    p_id: parsed.data.id,
  });

  if (error) {
    return mapMembershipRpcError(error);
  }

  revalidateMembershipPaths(parsed.data.id);
  return okResult({ id: parsed.data.id }, "Đã xóa gói hội viên.");
}
