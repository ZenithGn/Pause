"use server";

import { revalidatePath } from "next/cache";
import { errorResult, okResult, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isMockAdminMode } from "@/lib/env";
import { ADMIN_ERROR_MESSAGES, mapPostgresError } from "@/lib/errors";
import { MOCK_USERS } from "@/lib/mock-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setUserLockSchema, type SetUserLockInput } from "./schemas";

export interface SetUserLockResult {
  id: string;
  is_locked: boolean;
  locked_at: string | null;
}

const BAN_DURATION_LOCKED = "876000h";
const BAN_DURATION_UNLOCKED = "none";

function parseLockRpcResult(
  payload: unknown,
  fallbackId: string,
  fallbackLocked: boolean,
): SetUserLockResult {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    return {
      id: typeof record.id === "string" ? record.id : fallbackId,
      is_locked:
        typeof record.is_locked === "boolean" ? record.is_locked : fallbackLocked,
      locked_at: typeof record.locked_at === "string" ? record.locked_at : null,
    };
  }

  return {
    id: fallbackId,
    is_locked: fallbackLocked,
    locked_at: fallbackLocked ? new Date().toISOString() : null,
  };
}

/**
 * Locks or unlocks a non-admin user account in both PostgreSQL (admin_set_user_lock RPC)
 * and Supabase Auth (service-role auth.admin.updateUserById).
 * Automatically rolls back the Postgres RPC if the Supabase Auth ban/unban call fails.
 */
export async function setUserLockAction(
  input: SetUserLockInput,
): Promise<ActionResult<SetUserLockResult>> {
  const session = await requireAdmin();

  const parsed = setUserLockSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const isMissingReason =
      input?.locked === true && !(typeof input.reason === "string" && input.reason.trim());

    if (isMissingReason) {
      return errorResult(
        "LOCK_REASON_REQUIRED",
        fieldErrors.reason?.[0] ?? ADMIN_ERROR_MESSAGES.LOCK_REASON_REQUIRED,
        fieldErrors,
      );
    }

    const firstFieldMessage =
      Object.values(fieldErrors).flat().find(Boolean) ??
      ADMIN_ERROR_MESSAGES.VALIDATION_ERROR;

    return errorResult("VALIDATION_ERROR", firstFieldMessage, fieldErrors);
  }

  const { userId, locked } = parsed.data;
  const normalizedReason = locked ? (parsed.data.reason ?? "").trim() : null;

  if (userId === session.user.id) {
    return errorResult("CANNOT_LOCK_SELF", ADMIN_ERROR_MESSAGES.CANNOT_LOCK_SELF);
  }

  if (session.isMock || isMockAdminMode()) {
    const mockTarget = MOCK_USERS.find((user) => user.id === userId);
    if (!mockTarget) {
      return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
    }
    if (mockTarget.role === "admin") {
      return errorResult("CANNOT_LOCK_ADMIN", ADMIN_ERROR_MESSAGES.CANNOT_LOCK_ADMIN);
    }

    const nowIso = locked ? new Date().toISOString() : null;
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return okResult(
      {
        id: userId,
        is_locked: locked,
        locked_at: nowIso,
      },
      locked
        ? "Đã khóa tài khoản người dùng (chế độ dữ liệu mẫu)."
        : "Đã mở khóa tài khoản người dùng (chế độ dữ liệu mẫu).",
    );
  }

  const supabase = await createSupabaseServerClient();

  // Read previous state before mutating so we can check role and rollback accurately if Auth fails.
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, is_locked, locked_reason")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    const mapped = mapPostgresError(targetError);
    return errorResult(mapped.code, mapped.message);
  }

  if (!targetProfile) {
    return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
  }

  if (targetProfile.role === "admin") {
    return errorResult("CANNOT_LOCK_ADMIN", ADMIN_ERROR_MESSAGES.CANNOT_LOCK_ADMIN);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("admin_set_user_lock", {
    p_user_id: userId,
    p_locked: locked,
    p_reason: normalizedReason,
  });

  if (rpcError) {
    const mapped = mapPostgresError(rpcError);
    return errorResult(mapped.code, mapped.message);
  }

  let authUpdateFailed = false;
  try {
    const adminClient = createSupabaseAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: locked ? BAN_DURATION_LOCKED : BAN_DURATION_UNLOCKED,
    });
    if (authError) {
      authUpdateFailed = true;
    }
  } catch {
    authUpdateFailed = true;
  }

  if (authUpdateFailed) {
    const previousLocked = Boolean(targetProfile.is_locked);
    const previousReason = previousLocked
      ? targetProfile.locked_reason?.trim() || "Hoàn tác trạng thái khóa do lỗi đồng bộ Auth"
      : null;

    const { error: rollbackError } = await supabase.rpc("admin_set_user_lock", {
      p_user_id: userId,
      p_locked: previousLocked,
      p_reason: previousReason,
    });

    if (rollbackError) {
      return errorResult(
        "INTERNAL_ERROR",
        "Không thể đồng bộ trạng thái với Supabase Auth và không thể hoàn tác tự động.",
      );
    }

    return errorResult(
      "INTERNAL_ERROR",
      "Không thể đồng bộ trạng thái khóa với hệ thống xác thực. Trạng thái tài khoản đã được hoàn tác.",
    );
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  return okResult(
    parseLockRpcResult(rpcData, userId, locked),
    locked ? "Đã khóa tài khoản người dùng." : "Đã mở khóa tài khoản người dùng.",
  );
}
