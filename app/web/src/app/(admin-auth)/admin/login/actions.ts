"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPublicSupabaseEnv, isMockAdminMode } from "@/lib/env";
import { sanitizeAdminNextPath } from "@/lib/nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginFormState {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .email("Email không đúng định dạng."),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu.")
    .min(6, "Mật khẩu cần tối thiểu 6 ký tự."),
  next: z.string().optional(),
});

export async function signInAdminAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const rawNext = formData.get("next");

  const parsed = loginSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail : "",
    password: typeof rawPassword === "string" ? rawPassword : "",
    next: typeof rawNext === "string" ? rawNext : undefined,
  });

  if (!parsed.success) {
    return {
      error: "Vui lòng kiểm tra lại thông tin đăng nhập.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const safeNext = sanitizeAdminNextPath(parsed.data.next);

  if (isMockAdminMode()) {
    redirect(safeNext);
  }

  if (!hasPublicSupabaseEnv()) {
    return {
      error: "Hệ thống chưa cấu hình kết nối Supabase. Vui lòng kiểm tra biến môi trường.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError || !signInData.user) {
    const errMsg = (signInError?.message ?? "").toLowerCase();
    if (errMsg.includes("banned") || errMsg.includes("locked")) {
      return {
        error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
      };
    }
    return {
      error: "Email hoặc mật khẩu không chính xác.",
    };
  }

  const [{ data: isAdminResult, error: rpcError }, { data: profile }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase
      .from("profiles")
      .select("role, is_locked")
      .eq("id", signInData.user.id)
      .maybeSingle(),
  ]);

  if (profile?.is_locked) {
    await supabase.auth.signOut().catch(() => undefined);
    return {
      error: "Tài khoản quản trị của bạn đã bị khóa.",
    };
  }

  if (rpcError || isAdminResult !== true || !profile || profile.role !== "admin") {
    await supabase.auth.signOut().catch(() => undefined);
    return {
      error: "Tài khoản này không có quyền truy cập trang quản trị.",
    };
  }

  redirect(safeNext);
}

export async function signOutAdminAction(): Promise<void> {
  if (!isMockAdminMode() && hasPublicSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut().catch(() => undefined);
  }
  redirect("/admin/login");
}
