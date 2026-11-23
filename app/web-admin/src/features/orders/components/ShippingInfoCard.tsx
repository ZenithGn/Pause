"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Printer } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from "@/components/ui";
import styles from "./OrderDetail.module.css";

export interface ShippingInfoCardProps {
  orderId: string;
  shortCode: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  customerNote: string | null;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand below
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function ShippingInfoCard({
  orderId,
  shortCode,
  shippingName,
  shippingPhone,
  shippingAddress,
  customerNote,
}: ShippingInfoCardProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyShipping = async () => {
    const lines = [
      `Đơn hàng: #${shortCode}`,
      `Người nhận: ${shippingName}`,
      `SĐT: ${shippingPhone}`,
      `Địa chỉ: ${shippingAddress}`,
    ];
    if (customerNote) {
      lines.push(`Ghi chú: ${customerNote}`);
    }

    const success = await copyTextToClipboard(lines.join("\n"));
    if (success) {
      setCopied(true);
      toast.success("Đã sao chép thông tin giao hàng.");
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Không thể sao chép tự động. Vui lòng chọn và sao chép thủ công.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Thông tin giao hàng</CardTitle>
          <CardDescription>Địa chỉ nhận ấn phẩm và thao tác đóng gói</CardDescription>
        </div>
        <Button
          variant="outlined"
          size="sm"
          leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={() => void handleCopyShipping()}
        >
          {copied ? "Đã sao chép" : "Sao chép"}
        </Button>
      </CardHeader>

      <CardContent>
        <dl className={styles.metaList}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Người nhận</dt>
            <dd className={styles.metaValue}>{shippingName || "—"}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Số điện thoại</dt>
            <dd className={`${styles.metaValue} ${styles.mono}`}>
              {shippingPhone || "—"}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Địa chỉ giao hàng</dt>
            <dd className={styles.metaValue}>{shippingAddress || "—"}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Ghi chú khách hàng</dt>
            <dd className={styles.metaValue}>{customerNote ?? "Không có"}</dd>
          </div>
        </dl>

        <div className={styles.shippingActions}>
          <Link
            href={`/admin/orders/${orderId}/print`}
            className={`${styles.actionLinkBtn} ${styles.actionOutlined}`}
          >
            <Printer size={15} aria-hidden="true" />
            <span>In phiếu giao hàng</span>
          </Link>

          <a
            href={`/api/admin/orders/${orderId}/print-pack`}
            download={`pause-order-${shortCode}-print-pack.zip`}
            className={`${styles.actionLinkBtn} ${styles.actionTonal}`}
          >
            <Download size={15} aria-hidden="true" />
            <span>Tải gói in (.zip)</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
