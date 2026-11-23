import { redirect } from "next/navigation";
import { isMockAdminMode } from "@/lib/env";
import { MOCK_ADMIN_SESSION } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/admin";

export interface AdminUserIdentity {
  id: string;
  email: string | null;
}

export interface AdminProfileSummary {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  is_locked: boolean;
}

export interface AdminSessionContext {
  user: AdminUserIdentity;
  profile: AdminProfileSummary;
  isMock: boolean;
}

/**
 * Server guard for Admin Server Components and Server Actions.
 * Verifies authenticated Supabase user + RPC is_admin() (role='admin' and not locked).
 * Signs out and redirects to /admin/login?error=forbidden (or ?error=locked) if unauthorized.
 */
export async function requireAdmin(): Promise<AdminSessionContext> {
  if (isMockAdminMode()) {
    return {
      user: MOCK_ADMIN_SESSION.user,
      profile: MOCK_ADMIN_SESSION.profile,
      isMock: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    await supabase.auth.signOut().catch(() => undefined);
    redirect("/admin/login?error=forbidden");
  }

  const [{ data: isAdminResult, error: rpcError }, { data: profile }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, phone, role, is_locked")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (rpcError || isAdminResult !== true || !profile || profile.role !== "admin") {
    const errorCode = profile?.is_locked ? "locked" : "forbidden";
    await supabase.auth.signOut().catch(() => undefined);
    redirect(`/admin/login?error=${errorCode}`);
  }

  if (profile.is_locked) {
    await supabase.auth.signOut().catch(() => undefined);
    redirect("/admin/login?error=locked");
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      phone: profile.phone,
      role: profile.role,
      is_locked: profile.is_locked,
    },
    isMock: false,
  };
}
