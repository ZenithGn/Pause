import JSZip from "jszip";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { OrderDetail } from "@/types/admin";
import {
  getCoverTypeLabel,
  getPaperTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  ORDER_STATUS_LABELS,
} from "./status-machine";

const FETCH_TIMEOUT_MS = 8000;

function resolveExtension(contentType: string | null, url: string): string {
  const mime = (contentType ?? "").split(";")[0]?.trim().toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/gif") return "gif";

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "png";
    if (pathname.endsWith(".webp")) return "webp";
    if (pathname.endsWith(".gif")) return "gif";
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "jpg";
  } catch {
    // Ignore URL parsing issues
  }

  return "jpg";
}

function validateHttpUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildOrderSpecText(detail: OrderDetail): string {
  const sortedSlots = [...detail.slot_photos].sort((a, b) => a.slot_index - b.slot_index);
  const latestTx = detail.transactions[0];
  const paymentMethod = latestTx?.payment_method ?? "cod";
  const paymentStatus =
    latestTx?.status ?? (detail.order.status === "completed" ? "success" : "pending");

  const lines: string[] = [
    "============================================================",
    `PAUSE - THONG TIN GOI IN DON HANG #${detail.order.short_code}`,
    "============================================================",
    `Order ID: ${detail.order.id}`,
    `Short Code: #${detail.order.short_code}`,
    `Created At (UTC+7): ${formatDateTime(detail.order.created_at)}`,
    `Status: ${ORDER_STATUS_LABELS[detail.order.status] ?? detail.order.status} (${detail.order.status})`,
    "",
    "--- THONG TIN GIAO HANG ---",
    `Nguoi nhan: ${detail.order.shipping_name}`,
    `So dien thoai: ${detail.order.shipping_phone}`,
    `Dia chi: ${detail.order.shipping_address}`,
    `Ghi chu khach hang: ${detail.order.note ?? "Khong co"}`,
    "",
    "--- THONG TIN KHACH HANG ---",
    `Ten tai khoan: ${detail.customer.display_name}`,
    `Email: ${detail.customer.email ?? "Khong co"}`,
    `SDT tai khoan: ${detail.customer.phone ?? "Khong co"}`,
    "",
    "--- QUY CACH IN AN ---",
    `Template: ${detail.template.name} (${detail.template.category})`,
    `So slot: ${detail.template.slot_count}`,
    `Loai bia: ${getCoverTypeLabel(detail.order.cover_type)} (${detail.order.cover_type})`,
    `Chat lieu giay: ${getPaperTypeLabel(detail.order.paper_type)} (${detail.order.paper_type})`,
    `So luong: ${detail.order.quantity}`,
    `Don gia: ${formatVnd(detail.order.unit_price_vnd)}`,
    `Thanh tien: ${formatVnd(detail.order.total_price_vnd)}`,
    "",
    "--- THANH TOAN ---",
    `Phuong thuc: ${getPaymentMethodLabel(paymentMethod)}`,
    `Trang thai thanh toan: ${getPaymentStatusLabel(paymentStatus)}`,
    `Ma giao dich (order_code): ${latestTx?.order_code ? String(latestTx.order_code) : "Khong co"}`,
    `Ma cong thanh toan: ${latestTx?.payment_gateway_ref ?? "Khong co"}`,
    "",
    "--- GHI CHU NOI BO ADMIN ---",
    detail.order.admin_notes ?? "Khong co",
    "",
    "--- DANH SACH ANH SLOT ---",
  ];

  if (sortedSlots.length === 0) {
    lines.push("Khong co anh slot nao duoc gan.");
  } else {
    for (const slot of sortedSlots) {
      const dims =
        slot.width && slot.height ? `${slot.width}x${slot.height}` : "unknown";
      lines.push(
        `Slot ${slot.slot_index + 1} (index=${slot.slot_index}, ${dims}): ${slot.original_url}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export type FetchLike = typeof fetch;

interface AssetTarget {
  label: string;
  zipBasePath: string;
  url: string | null | undefined;
}

async function fetchAssetBuffer(
  target: AssetTarget,
  fetchImpl: FetchLike,
): Promise<
  | { ok: true; zipPath: string; data: ArrayBuffer }
  | { ok: false; label: string; url: string; reason: string }
> {
  const validUrl = validateHttpUrl(target.url);
  if (!validUrl) {
    return {
      ok: false,
      label: target.label,
      url: target.url ?? "(empty)",
      reason: "URL không hợp lệ hoặc bị trống.",
    };
  }

  try {
    const response = await fetchImpl(validUrl, {
      method: "GET",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        label: target.label,
        url: validUrl,
        reason: `HTTP ${response.status} ${response.statusText}`.trim(),
      };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return {
        ok: false,
        label: target.label,
        url: validUrl,
        reason: "Tệp ảnh trả về rỗng (0 bytes).",
      };
    }

    const ext = resolveExtension(response.headers.get("content-type"), validUrl);
    return {
      ok: true,
      zipPath: `${target.zipBasePath}.${ext}`,
      data: buffer,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi mạng không xác định";
    return {
      ok: false,
      label: target.label,
      url: validUrl,
      reason: message,
    };
  }
}

export async function buildPrintPackZipBuffer(
  detail: OrderDetail,
  fetchImpl: FetchLike = fetch,
): Promise<ArrayBuffer> {
  const zip = new JSZip();

  zip.file("order.txt", buildOrderSpecText(detail));

  const targets: AssetTarget[] = [];
  const previewUrl = detail.photobooth_item.preview_url || detail.template.preview_url;
  targets.push({
    label: "Photobooth Preview",
    zipBasePath: "preview",
    url: previewUrl,
  });

  const sortedSlots = [...detail.slot_photos].sort((a, b) => a.slot_index - b.slot_index);
  for (const slot of sortedSlots) {
    const padded = String(slot.slot_index + 1).padStart(2, "0");
    targets.push({
      label: `Slot ${slot.slot_index + 1} (index ${slot.slot_index})`,
      zipBasePath: `slots/slot-${padded}`,
      url: slot.original_url,
    });
  }

  const results = await Promise.all(
    targets.map((target) => fetchAssetBuffer(target, fetchImpl)),
  );

  const fetchErrors: string[] = [];
  for (const result of results) {
    if (result.ok) {
      zip.file(result.zipPath, result.data);
    } else {
      fetchErrors.push(`- [${result.label}] ${result.url}\n  Ly do: ${result.reason}`);
    }
  }

  if (fetchErrors.length > 0) {
    const errorHeader = [
      `Bao cao loi tai anh cho don hang #${detail.order.short_code} (${detail.order.id})`,
      `Thoi gian tao goi in: ${formatDateTime(new Date())}`,
      "",
      "Cac tep duoi day khong the tai ve tu dong:",
      ...fetchErrors,
      "",
    ].join("\n");
    zip.file("fetch-errors.txt", errorHeader);
  }

  return zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
