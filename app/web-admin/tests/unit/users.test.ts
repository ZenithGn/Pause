import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import { MOCK_USERS } from "@/lib/mock-data";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  isMockAdminMode: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  revalidatePath: vi.fn(),
  routerRefresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.routerRefresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/admin/users",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/env", () => ({
  isMockAdminMode: mocks.isMockAdminMode,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { setUserLockAction } from "@/features/users/actions";
import { UserDetailView } from "@/features/users/components/UserDetailView";
import { UserLockButton } from "@/features/users/components/UserLockButton";
import {
  getAdminUserDetail,
  listAdminUsers,
  type UserDetailView as UserDetailData,
} from "@/features/users/queries";
import {
  getUserTierBadgeMeta,
  LOCK_REASON_MAX_LENGTH,
  parseUsersSearchParams,
  setUserLockSchema,
} from "@/features/users/schemas";

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ADMIN_ID = "00000000-0000-4000-8000-000000000002";
const TARGET_USER_ID = "11111111-1111-4111-8111-111111111101";
const LOCKED_MOCK_USER_ID = "11111111-1111-4111-8111-111111111103";

function createMockSession(isMock = false) {
  return {
    user: { id: ADMIN_ID, email: "admin@pause.vn" },
    profile: {
      id: ADMIN_ID,
      display_name: "Quản trị viên Pause",
      avatar_url: null,
      phone: "0901234567",
      role: "admin" as const,
      is_locked: false,
    },
    isMock,
  };
}

function createSupabaseMocks(
  targetProfile: {
    id: string;
    role: "user" | "admin";
    is_locked: boolean;
    locked_reason: string | null;
  } | null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: targetProfile, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const rpc = vi.fn().mockResolvedValue({
    data: {
      id: targetProfile?.id ?? TARGET_USER_ID,
      is_locked: !(targetProfile?.is_locked ?? false),
      locked_at: "2026-11-20T12:00:00.000Z",
    },
    error: null,
  });

  const updateUserById = vi.fn().mockResolvedValue({
    data: { user: { id: targetProfile?.id ?? TARGET_USER_ID } },
    error: null,
  });

  mocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  mocks.createSupabaseAdminClient.mockReturnValue({
    auth: { admin: { updateUserById } },
  });

  return { from, rpc, updateUserById };
}

describe("FR-06.1 Users Management – Schemas & URL Params", () => {
  it("validates lock payload and enforces mandatory non-empty reason when locking", () => {
    const emptyReason = setUserLockSchema.safeParse({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "",
    });
    expect(emptyReason.success).toBe(false);
    if (!emptyReason.success) {
      expect(emptyReason.error.flatten().fieldErrors.reason?.[0]).toBe(
        "Vui lòng nhập lý do khóa.",
      );
    }

    const whitespaceReason = setUserLockSchema.safeParse({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "    ",
    });
    expect(whitespaceReason.success).toBe(false);

    const tooLongReason = setUserLockSchema.safeParse({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "a".repeat(LOCK_REASON_MAX_LENGTH + 1),
    });
    expect(tooLongReason.success).toBe(false);

    const badUuid = setUserLockSchema.safeParse({
      userId: "not-a-uuid",
      locked: true,
      reason: "Vi phạm quy định",
    });
    expect(badUuid.success).toBe(false);

    const validLock = setUserLockSchema.safeParse({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "  Spam nội dung  ",
    });
    expect(validLock.success).toBe(true);
    if (validLock.success) {
      expect(validLock.data.reason).toBe("Spam nội dung");
    }

    const validUnlock = setUserLockSchema.safeParse({
      userId: TARGET_USER_ID,
      locked: false,
      reason: null,
    });
    expect(validUnlock.success).toBe(true);
  });

  it("normalizes /admin/users searchParams and tier badge metadata", () => {
    expect(
      parseUsersSearchParams({
        q: "  minh anh ",
        tier: "PAUSE Plus",
        status: "locked",
        role: "admin",
        sort: "drawer_count.desc",
        page: "2",
        pageSize: "50",
      }),
    ).toEqual({
      q: "minh anh",
      tier: "plus",
      status: "locked",
      role: "admin",
      sort: "drawer_count.desc",
      page: 2,
      pageSize: 50,
      offset: 50,
      limit: 50,
    });

    expect(
      parseUsersSearchParams({
        tier: "unknown",
        status: "invalid",
        role: "superadmin",
        sort: "bad.sort",
        page: "-3",
        pageSize: "99",
      }),
    ).toEqual({
      q: "",
      tier: "",
      status: "",
      role: "",
      sort: "created_at.desc",
      page: 1,
      pageSize: 20,
      offset: 0,
      limit: 20,
    });

    expect(getUserTierBadgeMeta("Free")).toEqual({ label: "Free", tone: "neutral" });
    expect(getUserTierBadgeMeta("PAUSE Go")).toEqual({ label: "PAUSE Go", tone: "info" });
    expect(getUserTierBadgeMeta("PAUSE Plus")).toEqual({ label: "PAUSE Plus", tone: "warning" });
    expect(getUserTierBadgeMeta("PAUSE Premium")).toEqual({
      label: "PAUSE Premium",
      tone: "primary",
    });
  });
});

describe("FR-06.1 Users Management – Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMockAdminMode.mockReturnValue(false);
  });

  it("filters mock users by search, tier, status, and role", async () => {
    mocks.isMockAdminMode.mockReturnValue(true);

    const bySearch = await listAdminUsers(parseUsersSearchParams({ q: "minh anh" }));
    expect(bySearch.ok).toBe(true);
    if (bySearch.ok) {
      expect(bySearch.data.items).toHaveLength(1);
      expect(bySearch.data.items[0]?.id).toBe(TARGET_USER_ID);
    }

    const lockedOnly = await listAdminUsers(parseUsersSearchParams({ status: "locked" }));
    expect(lockedOnly.ok).toBe(true);
    if (lockedOnly.ok) {
      expect(lockedOnly.data.items.every((u) => u.is_locked)).toBe(true);
      expect(lockedOnly.data.totalCount).toBe(1);
    }

    const detail = await getAdminUserDetail("not-a-uuid");
    expect(detail).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Không tìm thấy dữ liệu.",
    });
  });

  it("calls admin_list_users RPC with normalized arguments", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: TARGET_USER_ID,
          display_name: "Nguyễn Minh Anh",
          email: "minhanh@pause.vn",
          phone: "0912345678",
          avatar_url: null,
          role: "user",
          tier: "PAUSE Plus",
          is_locked: false,
          drawer_count: 8,
          created_at: "2026-10-02T10:30:00.000Z",
          last_sign_in_at: null,
          total_count: 1,
        },
      ],
      error: null,
    });
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc });

    const filters = parseUsersSearchParams({
      q: "minh",
      tier: "plus",
      status: "active",
      role: "user",
      sort: "drawer_count.desc",
      page: "1",
      pageSize: "10",
    });

    const result = await listAdminUsers(filters);
    expect(rpc).toHaveBeenCalledWith("admin_list_users", {
      p_search: "minh",
      p_tier: "plus",
      p_status: "active",
      p_role: "user",
      p_sort: "drawer_count.desc",
      p_limit: 10,
      p_offset: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalCount).toBe(1);
      expect(result.data.items[0]?.tier).toBe("PAUSE Plus");
    }
  });
});

describe("FR-06.1 Users Management – setUserLockAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMockAdminMode.mockReturnValue(false);
    mocks.requireAdmin.mockResolvedValue(createMockSession(false));
  });

  it("calls requireAdmin first and stops if unauthorized", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

    await expect(
      setUserLockAction({
        userId: TARGET_USER_ID,
        locked: true,
        reason: "Vi phạm",
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects locking without a reason with LOCK_REASON_REQUIRED", async () => {
    const result = await setUserLockAction({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "   ",
    });

    expect(result).toEqual({
      ok: false,
      code: "LOCK_REASON_REQUIRED",
      message: "Vui lòng nhập lý do khóa.",
      fieldErrors: {
        reason: ["Vui lòng nhập lý do khóa."],
      },
    });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("blocks self-lock with CANNOT_LOCK_SELF", async () => {
    const result = await setUserLockAction({
      userId: ADMIN_ID,
      locked: true,
      reason: "Tự khóa thử nghiệm",
    });

    expect(result).toEqual({
      ok: false,
      code: "CANNOT_LOCK_SELF",
      message: "Không thể tự khóa tài khoản của bạn.",
    });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("blocks locking another admin with CANNOT_LOCK_ADMIN", async () => {
    const { rpc, updateUserById } = createSupabaseMocks({
      id: OTHER_ADMIN_ID,
      role: "admin",
      is_locked: false,
      locked_reason: null,
    });

    const result = await setUserLockAction({
      userId: OTHER_ADMIN_ID,
      locked: true,
      reason: "Khóa admin khác",
    });

    expect(result).toEqual({
      ok: false,
      code: "CANNOT_LOCK_ADMIN",
      message: "Không thể khóa tài khoản quản trị viên.",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when target profile does not exist", async () => {
    const { rpc } = createSupabaseMocks(null);

    const result = await setUserLockAction({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "Vi phạm",
    });

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Không tìm thấy dữ liệu.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("locks and unlocks user via RPC and Supabase Auth Admin and revalidates paths", async () => {
    const { rpc, updateUserById } = createSupabaseMocks({
      id: TARGET_USER_ID,
      role: "user",
      is_locked: false,
      locked_reason: null,
    });

    const lockResult = await setUserLockAction({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "Spam nội dung",
    });

    expect(lockResult.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("admin_set_user_lock", {
      p_user_id: TARGET_USER_ID,
      p_locked: true,
      p_reason: "Spam nội dung",
    });
    expect(updateUserById).toHaveBeenCalledWith(TARGET_USER_ID, {
      ban_duration: "876000h",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/users/${TARGET_USER_ID}`);

    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(createMockSession(false));
    const unlockMocks = createSupabaseMocks({
      id: TARGET_USER_ID,
      role: "user",
      is_locked: true,
      locked_reason: "Spam nội dung",
    });

    const unlockResult = await setUserLockAction({
      userId: TARGET_USER_ID,
      locked: false,
      reason: null,
    });

    expect(unlockResult.ok).toBe(true);
    expect(unlockMocks.rpc).toHaveBeenCalledWith("admin_set_user_lock", {
      p_user_id: TARGET_USER_ID,
      p_locked: false,
      p_reason: null,
    });
    expect(unlockMocks.updateUserById).toHaveBeenCalledWith(TARGET_USER_ID, {
      ban_duration: "none",
    });
  });

  it("rolls back admin_set_user_lock when locking fails at Supabase Auth Admin", async () => {
    const { rpc, updateUserById } = createSupabaseMocks({
      id: TARGET_USER_ID,
      role: "user",
      is_locked: false,
      locked_reason: null,
    });

    updateUserById.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Auth service unavailable" },
    });

    const result = await setUserLockAction({
      userId: TARGET_USER_ID,
      locked: true,
      reason: "Vi phạm quy định",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INTERNAL_ERROR");
      expect(result.message).toContain("hoàn tác");
    }

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "admin_set_user_lock", {
      p_user_id: TARGET_USER_ID,
      p_locked: true,
      p_reason: "Vi phạm quy định",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "admin_set_user_lock", {
      p_user_id: TARGET_USER_ID,
      p_locked: false,
      p_reason: null,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rolls back admin_set_user_lock with previous reason when unlocking fails at Auth Admin", async () => {
    const { rpc, updateUserById } = createSupabaseMocks({
      id: TARGET_USER_ID,
      role: "user",
      is_locked: true,
      locked_reason: "Lý do khóa cũ",
    });

    updateUserById.mockRejectedValueOnce(new Error("Network error"));

    const result = await setUserLockAction({
      userId: TARGET_USER_ID,
      locked: false,
      reason: null,
    });

    expect(result.ok).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "admin_set_user_lock", {
      p_user_id: TARGET_USER_ID,
      p_locked: false,
      p_reason: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "admin_set_user_lock", {
      p_user_id: TARGET_USER_ID,
      p_locked: true,
      p_reason: "Lý do khóa cũ",
    });
  });

  it("handles mock mode safely without calling live Supabase clients", async () => {
    mocks.isMockAdminMode.mockReturnValue(true);
    mocks.requireAdmin.mockResolvedValue(createMockSession(true));

    const result = await setUserLockAction({
      userId: LOCKED_MOCK_USER_ID,
      locked: false,
      reason: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        id: LOCKED_MOCK_USER_ID,
        is_locked: false,
        locked_at: null,
      });
    }
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/users/${LOCKED_MOCK_USER_ID}`);
  });
});

describe("FR-06.1 Users Management – UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMockAdminMode.mockReturnValue(true);
    mocks.requireAdmin.mockResolvedValue(createMockSession(true));
  });

  it("disables lock button with Vietnamese tooltips for self and admin targets", () => {
    const { rerender } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(UserLockButton, {
          userId: ADMIN_ID,
          displayName: "Quản trị viên Pause",
          role: "admin",
          isLocked: false,
          currentAdminId: ADMIN_ID,
        }),
      ),
    );

    const selfBtn = screen.getByRole("button", {
      name: "Không thể tự khóa tài khoản của bạn.",
    });
    expect(selfBtn).toBeDisabled();

    rerender(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(UserLockButton, {
          userId: OTHER_ADMIN_ID,
          displayName: "Admin Khác",
          role: "admin",
          isLocked: false,
          currentAdminId: ADMIN_ID,
        }),
      ),
    );

    const adminBtn = screen.getByRole("button", {
      name: "Không thể khóa tài khoản quản trị viên.",
    });
    expect(adminBtn).toBeDisabled();
  });

  it("requires lock reason inside ConfirmDialog and submits lock action when valid", async () => {
    const mockTarget = MOCK_USERS.find((u) => u.id === TARGET_USER_ID)!;

    render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(UserLockButton, {
          userId: mockTarget.id,
          displayName: mockTarget.display_name,
          role: "user",
          isLocked: false,
          currentAdminId: ADMIN_ID,
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Khóa" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Confirm without reason -> inline validation error
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận khóa" }));
    expect(screen.getByText("Vui lòng nhập lý do khóa.")).toBeInTheDocument();

    const textarea = screen.getByLabelText(/Lý do khóa tài khoản/i);
    fireEvent.change(textarea, { target: { value: "Vi phạm điều khoản sử dụng" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận khóa" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renders locked badge, aggregate storage stats without private photo URLs, and order/transaction links", () => {
    const detail: UserDetailData = {
      profile: {
        id: LOCKED_MOCK_USER_ID,
        display_name: "Lê Thảo Vy",
        avatar_url: null,
        phone: "0934567890",
        max_drawers: 3,
        role: "user",
        is_premium: false,
        is_locked: true,
        locked_at: "2026-11-12T10:00:00.000Z",
        locked_reason: "Tài khoản phát tán nội dung spam",
        created_at: "2026-11-01T12:00:00.000Z",
        updated_at: "2026-11-12T10:00:00.000Z",
        tier: "Free",
        last_sign_in_at: "2026-11-10T08:00:00.000Z",
      },
      email: "thaovy.le@outlook.com",
      memberships: [],
      drawer_stats: {
        drawer_count: 3,
        photo_count: 42,
        storage_used_bytes: 73_500_000,
      },
      orders_summary: {
        total_orders: 1,
        total_spent_vnd: 120000,
        pending_orders: 1,
        completed_orders: 0,
      },
      recent_orders: [
        {
          id: "33333333-3333-4333-8333-333333333301",
          short_code: "33333301",
          template_name: "Vintage Memories",
          quantity: 2,
          total_price_vnd: 120000,
          status: "pending",
          created_at: "2026-11-20T07:30:00.000Z",
        },
      ],
      recent_transactions: [
        {
          id: "66666666-6666-4666-8666-666666666601",
          user_id: LOCKED_MOCK_USER_ID,
          display_name: "Lê Thảo Vy",
          type: "print_order",
          amount_vnd: 120000,
          payment_method: "vietqr_payos",
          payment_gateway_ref: "PAYOS_842910234",
          order_code: 842910234,
          status: "success",
          order_id: "33333333-3333-4333-8333-333333333301",
          created_at: "2026-11-20T07:31:00.000Z",
        },
      ],
    };

    render(React.createElement(UserDetailView, { detail }));

    expect(screen.getByText("Tài khoản này đang bị khóa")).toBeInTheDocument();
    expect(screen.getAllByText(/Tài khoản phát tán nội dung spam/).length).toBeGreaterThan(0);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("70.1 MB")).toBeInTheDocument();

    // Ensure no private drawer images are rendered
    expect(screen.queryAllByRole("img")).toHaveLength(0);

    const orderLink = screen.getByRole("link", { name: "#33333301" });
    expect(orderLink).toHaveAttribute(
      "href",
      "/admin/orders/33333333-3333-4333-8333-333333333301",
    );

    const txLink = screen.getByRole("link", { name: "Xem lịch sử giao dịch" });
    expect(txLink).toHaveAttribute("href", "/admin/transactions");
  });
});
