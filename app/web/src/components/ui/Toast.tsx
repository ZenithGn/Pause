"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import styles from "./Toast.module.css";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  pushToast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={18} className={`${styles.icon} ${styles.iconSuccess}`} />,
  error: <XCircle size={18} className={`${styles.icon} ${styles.iconError}`} />,
  warning: <AlertTriangle size={18} className={`${styles.icon} ${styles.iconWarning}`} />,
  info: <Info size={18} className={`${styles.icon} ${styles.iconInfo}`} />,
};

export function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.toast} ${styles[toast.variant]}`}
    >
      <span aria-hidden="true">{ICON_MAP[toast.variant]}</span>
      <div className={styles.content}>
        <p className={styles.title}>{toast.title}</p>
        {toast.description ? <p className={styles.description}>{toast.description}</p> : null}
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        aria-label="Đóng thông báo"
        onClick={() => onDismiss(toast.id)}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const variant: ToastVariant = input.variant ?? "info";
      const durationMs = input.durationMs ?? 4500;

      setToasts((prev) => [...prev.slice(-4), { ...input, id, variant }]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      dismissToast,
      success: (title, description) =>
        pushToast({ title, description, variant: "success" }),
      error: (title, description) =>
        pushToast({ title, description, variant: "error" }),
      info: (title, description) =>
        pushToast({ title, description, variant: "info" }),
      warning: (title, description) =>
        pushToast({ title, description, variant: "warning" }),
    }),
    [pushToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} aria-label="Thông báo hệ thống">
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return ctx;
}
