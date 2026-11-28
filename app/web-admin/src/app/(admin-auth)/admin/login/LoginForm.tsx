"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button, TextField } from "@/components/ui";
import { signInAdminAction, type LoginFormState } from "./actions";
import styles from "./login.module.css";

export interface LoginFormProps {
  initialError?: string;
  nextPath: string;
  isMock?: boolean;
}

const INITIAL_STATE: LoginFormState = {};

export function LoginForm({ initialError, nextPath, isMock = false }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAdminAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);

  const errorBanner = state.error ?? initialError;

  return (
    <div className={styles.card}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          P
        </span>
        <div>
          <h1 className={styles.title}>Đăng nhập Quản trị</h1>
          <p className={styles.subtitle}>Hệ thống quản trị Pause Photobooth &amp; Memories</p>
        </div>
      </div>

      {isMock ? (
        <div className={styles.alertInfo}>
          <span>
            Đang bật chế độ xem thử với dữ liệu mẫu (<code>USE_MOCK_ADMIN_DATA=true</code>).
          </span>
          <Link href={nextPath} className={styles.mockLink}>
            Truy cập nhanh Dashboard →
          </Link>
        </div>
      ) : null}

      {errorBanner ? (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{errorBanner}</span>
        </div>
      ) : null}

      <form action={formAction} className={styles.form} noValidate>
        <input type="hidden" name="next" value={nextPath} />

        <TextField
          name="email"
          type="email"
          label="Email quản trị viên"
          placeholder="admin@pause.vn"
          autoComplete="email"
          required
          disabled={isPending}
          leftAdornment={<Mail size={16} />}
          error={state.fieldErrors?.email?.[0]}
        />

        <TextField
          name="password"
          type={showPassword ? "text" : "password"}
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
          minLength={6}
          disabled={isPending}
          leftAdornment={<Lock size={16} />}
          rightAdornment={
            <button
              type="button"
              className={styles.togglePw}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          error={state.fieldErrors?.password?.[0]}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
        >
          {isPending ? "Đang xác thực..." : "Đăng nhập"}
        </Button>
      </form>

      <p className={styles.footerNote}>
        Chỉ tài khoản có vai trò Quản trị viên (admin) mới được phép truy cập.
      </p>
    </div>
  );
}
