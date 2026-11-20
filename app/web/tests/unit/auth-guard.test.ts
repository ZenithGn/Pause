// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`) as Error & {
      digest?: string;
    };
    err.digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  }),
  isMockAdminMode: vi.fn(),
  hasPublicSupabaseEnv: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/env", () => ({
  isMockAdminMode: mocks.isMockAdminMode,
  hasPublicSupabaseEnv: mocks.hasPublicSupabaseEnv,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import {
  signInAdminAction,
  signOutAdminAction,
} from "@/app/(admin-auth)/admin/login/actions";
import { requireAdmin } from "@/lib/auth/require-admin";
import { MOCK_ADMIN_SESSION } from "@/lib/mock-data";
import { middleware } from "@/middleware";

function createSupabaseAuthMock(options: {
  user?: { id: string; email?: string | null } | null;
  authError?: { message: string } | null;
  signInUser?: { id: string; email?: string | null } | null;
  signInError?: { message: string } | null;
  isAdminResult?: boolean | null;
  rpcError?: { message: string } | null;
  profile?: {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
    phone?: string | null;
    role: "user" | "admin";
    is_locked: boolean;
  } | null;
}) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: options.user ?? null },
    error: options.authError ?? null,
  });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: options.signInUser ?? null },
    error: options.signInError ?? null,
  });
  const rpc = vi.fn().mockResolvedValue({
    data: options.isAdminResult ?? false,
    error: options.rpcError ?? null,
  });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.profile ?? null,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return {
    auth: { getUser, signOut, signInWithPassword },
    rpc,
    from,
    signOut,
  };
}

describe("FR-06 Auth Guard – requireAdmin()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMockAdminMode.mockReturnValue(false);
    mocks.hasPublicSupabaseEnv.mockReturnValue(true);
  });

  it("returns MOCK_ADMIN_SESSION with isMock=true only when mock mode is explicitly enabled", async () => {
    mocks.isMockAdminMode.mockReturnValue(true);

    const session = await requireAdmin();

    expect(session.isMock).toBe(true);
    expect(session.user).toEqual(MOCK_ADMIN_SESSION.user);
    expect(session.profile).toEqual(MOCK_ADMIN_SESSION.profile);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("signs out and redirects to ?error=forbidden when unauthenticated", async () => {
    const client = createSupabaseAuthMock({ user: null });
    mocks.createSupabaseServerClient.mockResolvedValue(client);

    await expect(requireAdmin()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/login?error=forbidden",
    );

    expect(client.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login?error=forbidden");
  });

  it("signs out and redirects to ?error=forbidden for authenticated non-admin user", async () => {
    const client = createSupabaseAuthMock({
      user: { id: "user-1", email: "linh@pause.app" },
      isAdminResult: false,
      profile: {
        id: "user-1",
        display_name: "Ngọc Linh",
        avatar_url: null,
        phone: null,
        role: "user",
        is_locked: false,
      },
    });
    mocks.createSupabaseServerClient.mockResolvedValue(client);

    await expect(requireAdmin()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/login?error=forbidden",
    );

    expect(client.rpc).toHaveBeenCalledWith("is_admin");
    expect(client.signOut).toHaveBeenCalledTimes(1);
  });

  it("signs out and redirects to ?error=locked for locked admin account", async () => {
    const client = createSupabaseAuthMock({
      user: { id: "admin-locked", email: "locked-admin@pause.app" },
      isAdminResult: false,
      profile: {
        id: "admin-locked",
        display_name: "Locked Admin",
        avatar_url: null,
        phone: null,
        role: "admin",
        is_locked: true,
      },
    });
    mocks.createSupabaseServerClient.mockResolvedValue(client);

    await expect(requireAdmin()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/login?error=locked",
    );

    expect(client.signOut).toHaveBeenCalledTimes(1);
  });

  it("returns active admin session when user, RPC is_admin(), and unlocked profile succeed", async () => {
    const client = createSupabaseAuthMock({
      user: { id: "admin-1", email: "admin@pause.app" },
      isAdminResult: true,
      profile: {
        id: "admin-1",
        display_name: "Admin Pause",
        avatar_url: null,
        phone: "0901000001",
        role: "admin",
        is_locked: false,
      },
    });
    mocks.createSupabaseServerClient.mockResolvedValue(client);

    const session = await requireAdmin();

    expect(session).toEqual({
      user: { id: "admin-1", email: "admin@pause.app" },
      profile: {
        id: "admin-1",
        display_name: "Admin Pause",
        avatar_url: null,
        phone: "0901000001",
        role: "admin",
        is_locked: false,
      },
      isMock: false,
    });
    expect(client.signOut).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("FR-06 Auth Guard – middleware()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMockAdminMode.mockReturnValue(false);
    mocks.hasPublicSupabaseEnv.mockReturnValue(true);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("allows /admin through only when mock mode is explicitly active", async () => {
    mocks.isMockAdminMode.mockReturnValue(true);

    const req = new NextRequest("http://localhost:3000/admin/users");
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("redirects protected /admin routes to /admin/login?next= when public Supabase env is absent", async () => {
    mocks.hasPublicSupabaseEnv.mockReturnValue(false);

    const adminRes = await middleware(
      new NextRequest("http://localhost:3000/admin/orders?status=pending"),
    );
    expect(adminRes.status).toBe(307);
    const redirectLocation = adminRes.headers.get("location");
    expect(redirectLocation).not.toBeNull();
    const parsedLocation = new URL(redirectLocation!);
    expect(parsedLocation.pathname).toBe("/admin/login");
    expect(parsedLocation.searchParams.get("next")).toBe(
      "/admin/orders?status=pending",
    );

    const loginRes = await middleware(
      new NextRequest("http://localhost:3000/admin/login"),
    );
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated visitors on /admin to /admin/login?next=%2Fadmin when Supabase is configured", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const res = await middleware(new NextRequest("http://localhost:3000/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?next=%2Fadmin",
    );
  });

  it("allows authenticated visitors through and forwards refreshed Supabase session cookies", async () => {
    mocks.createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        opts: {
          cookies: {
            setAll: (
              cookies: Array<{
                name: string;
                value: string;
                options?: Record<string, unknown>;
              }>,
            ) => void;
          };
        },
      ) => ({
        auth: {
          getUser: vi.fn().mockImplementation(async () => {
            opts.cookies.setAll([
              { name: "sb-access-token", value: "refreshed-jwt" },
            ]);
            return { data: { user: { id: "admin-1" } } };
          }),
        },
      }),
    );

    const res = await middleware(
      new NextRequest("http://localhost:3000/admin/users"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("sb-access-token")?.value).toBe("refreshed-jwt");
  });
});

describe("FR-06 Admin Login Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMockAdminMode.mockReturnValue(false);
    mocks.hasPublicSupabaseEnv.mockReturnValue(true);
  });

  it("validates email and password format before contacting Supabase Auth", async () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "123");

    const result = await signInAdminAction({}, formData);

    expect(result.error).toBe("Vui lòng kiểm tra lại thông tin đăng nhập.");
    expect(result.fieldErrors?.email).toBeDefined();
    expect(result.fieldErrors?.password).toBeDefined();
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns locked Vietnamese message when Supabase reports a banned account", async () => {
    const client = createSupabaseAuthMock({
      signInUser: null,
      signInError: { message: "User is banned" },
    });
    mocks.createSupabaseServerClient.mockResolvedValue(client);

    const formData = new FormData();
    formData.set("email", "locked@pause.app");
    formData.set("password", "PauseUser123!");

    const result = await signInAdminAction({}, formData);

    expect(result.error).toContain("đã bị khóa");
  });

  it("signs out non-admin users and locked admins on login", async () => {
    const nonAdminClient = createSupabaseAuthMock({
      signInUser: { id: "user-1", email: "linh@pause.app" },
      isAdminResult: false,
      profile: { role: "user", is_locked: false },
    });
    mocks.createSupabaseServerClient.mockResolvedValueOnce(nonAdminClient);

    const formData = new FormData();
    formData.set("email", "linh@pause.app");
    formData.set("password", "PauseUser123!");

    const nonAdminRes = await signInAdminAction({}, formData);
    expect(nonAdminRes.error).toContain("không có quyền truy cập");
    expect(nonAdminClient.signOut).toHaveBeenCalledTimes(1);

    const lockedAdminClient = createSupabaseAuthMock({
      signInUser: { id: "admin-locked", email: "locked@pause.app" },
      isAdminResult: false,
      profile: { role: "admin", is_locked: true },
    });
    mocks.createSupabaseServerClient.mockResolvedValueOnce(lockedAdminClient);

    const lockedRes = await signInAdminAction({}, formData);
    expect(lockedRes.error).toContain("đã bị khóa");
    expect(lockedAdminClient.signOut).toHaveBeenCalledTimes(1);
  });

  it("redirects valid admin to sanitized next path and neutralizes open redirects", async () => {
    const adminClient = createSupabaseAuthMock({
      signInUser: { id: "admin-1", email: "admin@pause.app" },
      isAdminResult: true,
      profile: { role: "admin", is_locked: false },
    });
    mocks.createSupabaseServerClient.mockResolvedValue(adminClient);

    const validNextForm = new FormData();
    validNextForm.set("email", "admin@pause.app");
    validNextForm.set("password", "PauseAdmin123!");
    validNextForm.set("next", "/admin/orders?status=pending");

    await expect(signInAdminAction({}, validNextForm)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/orders?status=pending",
    );

    const evilNextForm = new FormData();
    evilNextForm.set("email", "admin@pause.app");
    evilNextForm.set("password", "PauseAdmin123!");
    evilNextForm.set("next", "//evil.example.com");

    await expect(signInAdminAction({}, evilNextForm)).rejects.toThrow(
      "NEXT_REDIRECT:/admin",
    );
  });

  it("signOutAdminAction signs out and redirects to /admin/login", async () => {
    const client = createSupabaseAuthMock({});
    mocks.createSupabaseServerClient.mockResolvedValue(client);

    await expect(signOutAdminAction()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/login",
    );
    expect(client.signOut).toHaveBeenCalledTimes(1);
  });
});
