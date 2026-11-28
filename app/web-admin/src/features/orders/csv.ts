import { formatDateTime } from "@/lib/format";
import type { OrderSummary } from "@/types/admin";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  ORDER_STATUS_LABELS,
} from "./status-machine";

const FORMULA_TRIGGER_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a single CSV field following RFC 4180 and neutralizes spreadsheet formula injection.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);

  if (FORMULA_TRIGGER_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

const CSV_HEADERS = [
  "Mã đơn",
  "ID đơn hàng",
  "Khách hàng",
  "Số điện thoại",
  "Template",
  "Số lượng",
  "Tổng tiền (VNĐ)",
  "Trạng thái đơn",
  "Phương thức thanh toán",
  "Trạng thái thanh toán",
  "Ngày tạo (UTC+7)",
];

/**
 * Builds UTF-8 BOM CSV content for filtered print orders so Microsoft Excel displays Vietnamese cleanly.
 */
export function buildOrdersCsv(orders: readonly OrderSummary[]): string {
  const lines: string[] = [CSV_HEADERS.map(escapeCsvCell).join(",")];

  for (const order of orders) {
    const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
    const row = [
      `#${order.short_code}`,
      order.id,
      order.customer_name,
      order.shipping_phone,
      order.template_name,
      order.quantity,
      order.total_price_vnd,
      statusLabel,
      getPaymentMethodLabel(order.payment_method),
      getPaymentStatusLabel(order.payment_status),
      formatDateTime(order.created_at),
    ];
    lines.push(row.map(escapeCsvCell).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}
