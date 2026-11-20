import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasPublicSupabaseEnv, isMockAdminMode } from "@/lib/env";
import { sanitizeAdminNextPath } from "@/lib/nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập Quản trị",
};

const QUERY_ERROR_MAP: Record<string, string> = {
  forbidden: "Bạn không có quyền quản trị hoặc phiên truy cập đã bị từ chối.",
  locked: "Tài khoản quản trị của bạn đã bị khóa.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const safeNext = sanitizeAdminNextPath(params.next);
  const initialError = params.error ? QUERY_ERROR_MAP[params.error] : undefined;
  const isMock = isMockAdminMode();

  if (!isMock && !params.error && hasPublicSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: isAdminResult } = await supabase.rpc("is_admin");
      if (isAdminResult === true) {
        redirect(safeNext);
      }
    }
  }

  return (
    <main className={styles.page}>
      <LoginForm
        initialError={initialError}
        nextPath={safeNext}
        isMock={isMock}
      />
    </main>
  );
}
