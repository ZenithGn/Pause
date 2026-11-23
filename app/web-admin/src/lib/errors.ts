import type { AdminErrorCode } from "@/types/admin";

/**
 * Exact Vietnamese UI error messages matching §5.3 of fr-06-admin-task-breakdown.md.
 */
export const ADMIN_ERROR_MESSAGES: Record<AdminErrorCode, string> = {
  ADMIN_REQUIRED: "Bạn không có quyền quản trị.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  CANNOT_LOCK_SELF: "Không thể tự khóa tài khoản của bạn.",
  CANNOT_LOCK_ADMIN: "Không thể khóa tài khoản quản trị viên.",
  LOCK_REASON_REQUIRED: "Vui lòng nhập lý do khóa.",
  INVALID_STATUS_TRANSITION: "Không thể chuyển sang trạng thái này.",
  CANCEL_NOTE_REQUIRED: "Vui lòng nhập lý do hủy đơn.",
  TEMPLATE_NAME_TAKEN: "Tên template đã tồn tại.",
  TEMPLATE_IN_USE: "Template đã được sử dụng, hãy ẩn thay vì xóa.",
  INVALID_LAYOUT_CONFIG: "Cấu hình bố cục không hợp lệ.",
  PLAN_NAME_TAKEN: "Tên gói đã tồn tại.",
  PLAN_IN_USE: "Gói đã có hội viên, hãy ngừng bán thay vì xóa.",
  VALIDATION_ERROR: "Dữ liệu nhập vào không hợp lệ.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  INTERNAL_ERROR: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
};

const POSTGRES_KNOWN_CODES = new Set<AdminErrorCode>([
  "ADMIN_REQUIRED",
  "NOT_FOUND",
  "CANNOT_LOCK_SELF",
  "CANNOT_LOCK_ADMIN",
  "LOCK_REASON_REQUIRED",
  "INVALID_STATUS_TRANSITION",
  "CANCEL_NOTE_REQUIRED",
  "TEMPLATE_NAME_TAKEN",
  "TEMPLATE_IN_USE",
  "INVALID_LAYOUT_CONFIG",
  "PLAN_NAME_TAKEN",
  "PLAN_IN_USE",
]);

interface PostgresErrorLike {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export interface MappedAdminError {
  code: AdminErrorCode;
  message: string;
}

/**
 * Maps PostgreSQL / Supabase RPC exceptions into standardized AdminErrorCode + Vietnamese messages.
 */
export function mapPostgresError(error: unknown): MappedAdminError {
  if (!error) {
    return {
      code: "INTERNAL_ERROR",
      message: ADMIN_ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }

  const errObj =
    typeof error === "string"
      ? ({ message: error } as PostgresErrorLike)
      : (error as PostgresErrorLike);

  const rawMessage = (errObj.message ?? "").trim();

  // Direct match or embedded token (e.g. "P0001: TEMPLATE_NAME_TAKEN")
  for (const code of POSTGRES_KNOWN_CODES) {
    if (rawMessage === code || rawMessage.includes(code)) {
      return {
        code,
        message: ADMIN_ERROR_MESSAGES[code],
      };
    }
  }

  // Fallback for standard PostgreSQL SQLSTATE codes
  if (errObj.code === "23505") {
    const details = `${rawMessage} ${errObj.details ?? ""}`.toLowerCase();
    if (details.includes("template")) {
      return {
        code: "TEMPLATE_NAME_TAKEN",
        message: ADMIN_ERROR_MESSAGES.TEMPLATE_NAME_TAKEN,
      };
    }
    if (details.includes("plan") || details.includes("membership_plans")) {
      return {
        code: "PLAN_NAME_TAKEN",
        message: ADMIN_ERROR_MESSAGES.PLAN_NAME_TAKEN,
      };
    }
  }

  if (errObj.code === "42501") {
    return {
      code: "ADMIN_REQUIRED",
      message: ADMIN_ERROR_MESSAGES.ADMIN_REQUIRED,
    };
  }

  if (errObj.code === "PGRST116") {
    return {
      code: "NOT_FOUND",
      message: ADMIN_ERROR_MESSAGES.NOT_FOUND,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: ADMIN_ERROR_MESSAGES.INTERNAL_ERROR,
  };
}
