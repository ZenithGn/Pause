import type { AdminErrorCode } from "@/types/admin";

/**
 * Standard Server Action response contract (§5.2).
 */
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      code: AdminErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export function okResult<T>(data: T, message?: string): ActionResult<T> {
  return message ? { ok: true, data, message } : { ok: true, data };
}

export function errorResult<T = never>(
  code: AdminErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return fieldErrors
    ? { ok: false, code, message, fieldErrors }
    : { ok: false, code, message };
}
