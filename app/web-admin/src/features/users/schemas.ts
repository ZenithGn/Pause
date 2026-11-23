import { z } from "zod";
import { parsePagination, type AllowedPageSize } from "@/lib/pagination";
import type { StatusTone } from "@/components/ui/StatusChip";

export const USER_TIER_FILTERS = ["free", "go", "plus", "premium"] as const;
export type UserTierFilter = (typeof USER_TIER_FILTERS)[number];

export const USER_STATUS_FILTERS = ["active", "locked"] as const;
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number];

export const USER_ROLE_FILTERS = ["user", "admin"] as const;
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number];

export const USER_SORT_OPTIONS = [
  "created_at.desc",
  "created_at.asc",
  "last_sign_in_at.desc",
  "last_sign_in_at.asc",
  "display_name.asc",
  "display_name.desc",
  "drawer_count.desc",
  "drawer_count.asc",
] as const;
export type UserSortOption = (typeof USER_SORT_OPTIONS)[number];

export const DEFAULT_USER_SORT: UserSortOption = "created_at.desc";
export const LOCK_REASON_MAX_LENGTH = 500;

export interface UsersQueryFilters {
  q: string;
  tier: UserTierFilter | "";
  status: UserStatusFilter | "";
  role: UserRoleFilter | "";
  sort: UserSortOption;
  page: number;
  pageSize: AllowedPageSize;
  offset: number;
  limit: number;
}

export const USER_TIER_FILTER_OPTIONS = [
  { value: "", label: "Tất cả gói" },
  { value: "free", label: "Free" },
  { value: "go", label: "PAUSE Go" },
  { value: "plus", label: "PAUSE Plus" },
  { value: "premium", label: "PAUSE Premium" },
];

export const USER_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt động" },
  { value: "locked", label: "Đã khóa" },
];

export const USER_ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "user", label: "Người dùng" },
  { value: "admin", label: "Quản trị viên" },
];

export const USER_SORT_SELECT_OPTIONS: Array<{ value: UserSortOption; label: string }> = [
  { value: "created_at.desc", label: "Mới đăng ký" },
  { value: "created_at.asc", label: "Đăng ký lâu nhất" },
  { value: "last_sign_in_at.desc", label: "Đăng nhập gần nhất" },
  { value: "last_sign_in_at.asc", label: "Đăng nhập cũ nhất" },
  { value: "display_name.asc", label: "Tên A → Z" },
  { value: "display_name.desc", label: "Tên Z → A" },
  { value: "drawer_count.desc", label: "Nhiều ngăn kéo nhất" },
  { value: "drawer_count.asc", label: "Ít ngăn kéo nhất" },
];

export const setUserLockSchema = z
  .object({
    userId: z.string().trim().uuid("ID người dùng không hợp lệ."),
    locked: z.boolean(),
    reason: z
      .string()
      .trim()
      .max(LOCK_REASON_MAX_LENGTH, `Lý do khóa tối đa ${LOCK_REASON_MAX_LENGTH} ký tự.`)
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.locked) {
      const trimmedReason = (data.reason ?? "").trim();
      if (!trimmedReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: "Vui lòng nhập lý do khóa.",
        });
      }
    }
  });

export type SetUserLockInput = z.input<typeof setUserLockSchema>;
export type ParsedSetUserLockInput = z.output<typeof setUserLockSchema>;

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function readSearchParam(params: SearchParamsRecord, key: string): string {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTierFilter(rawTier: string): UserTierFilter | "" {
  const normalized = rawTier.toLowerCase();
  if (normalized === "free") return "free";
  if (normalized === "go" || normalized === "pause go") return "go";
  if (normalized === "plus" || normalized === "pause plus") return "plus";
  if (normalized === "premium" || normalized === "pause premium") return "premium";
  return "";
}

function normalizeStatusFilter(rawStatus: string): UserStatusFilter | "" {
  const normalized = rawStatus.toLowerCase();
  if (normalized === "active" || normalized === "unlocked") return "active";
  if (normalized === "locked") return "locked";
  return "";
}

function normalizeRoleFilter(rawRole: string): UserRoleFilter | "" {
  const normalized = rawRole.toLowerCase();
  if (normalized === "user" || normalized === "admin") return normalized;
  return "";
}

function normalizeSortOption(rawSort: string): UserSortOption {
  return (USER_SORT_OPTIONS as readonly string[]).includes(rawSort)
    ? (rawSort as UserSortOption)
    : DEFAULT_USER_SORT;
}

/**
 * Parses and normalizes URL query params for /admin/users (§5.1).
 */
export function parseUsersSearchParams(searchParams: SearchParamsRecord = {}): UsersQueryFilters {
  const pagination = parsePagination(searchParams);
  const q = readSearchParam(searchParams, "q").slice(0, 120);
  const tier = normalizeTierFilter(readSearchParam(searchParams, "tier"));
  const status = normalizeStatusFilter(readSearchParam(searchParams, "status"));
  const role = normalizeRoleFilter(readSearchParam(searchParams, "role"));
  const sort = normalizeSortOption(readSearchParam(searchParams, "sort"));

  return {
    q,
    tier,
    status,
    role,
    sort,
    page: pagination.page,
    pageSize: pagination.pageSize,
    offset: pagination.offset,
    limit: pagination.limit,
  };
}

export interface UserTierBadgeMeta {
  label: string;
  tone: StatusTone;
}

/**
 * Maps derived tier string from RPC/mock into StatusChip label and MD3 tone.
 */
export function getUserTierBadgeMeta(tier: string | null | undefined): UserTierBadgeMeta {
  const normalized = (tier ?? "Free").trim().toLowerCase();
  if (normalized === "pause premium" || normalized === "premium") {
    return { label: "PAUSE Premium", tone: "primary" };
  }
  if (normalized === "pause plus" || normalized === "plus") {
    return { label: "PAUSE Plus", tone: "warning" };
  }
  if (normalized === "pause go" || normalized === "go") {
    return { label: "PAUSE Go", tone: "info" };
  }
  return { label: "Free", tone: "neutral" };
}

export function formatTransactionTypeLabel(type: string): string {
  switch (type) {
    case "print_order":
      return "Đơn in ảnh";
    case "membership":
      return "Gói hội viên";
    case "drawer_purchase":
      return "Mua thêm ngăn kéo";
    default:
      return type;
  }
}

export function formatPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  const normalized = method.toLowerCase().trim();
  if (normalized === "vietqr_payos" || normalized === "payos") {
    return "VietQR / PayOS";
  }
  if (normalized === "cod") {
    return "COD";
  }
  return method;
}
