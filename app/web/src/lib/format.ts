const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

const vndFormatter = new Intl.NumberFormat("vi-VN");

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Formats an integer amount in Vietnamese Dong (e.g. "30.000 VNĐ").
 */
export function formatVnd(amount: number | null | undefined): string {
  const safeValue = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `${vndFormatter.format(Math.round(safeValue))} VNĐ`;
}

/**
 * Formats an ISO timestamp or Date to dd/MM/yyyy in Asia/Ho_Chi_Minh.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

/**
 * Formats an ISO timestamp or Date to dd/MM/yyyy HH:mm in Asia/Ho_Chi_Minh.
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

/**
 * Formats byte sizes into human-readable units (B, KB, MB, GB, TB).
 */
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const dm = Math.max(0, decimals);
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, index);
  const formatted = index === 0 ? Math.round(value).toString() : Number(value.toFixed(dm)).toString();

  return `${formatted} ${units[index]}`;
}

/**
 * Formats integer counts with Vietnamese thousand separators.
 */
export function formatNumber(value: number | null | undefined): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return vndFormatter.format(safeValue);
}
