"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { OrderDetail } from "@/types/admin";
import {
  getCoverTypeLabel,
  getPaperTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  ORDER_STATUS_LABELS,
} from "../status-machine";
import styles from "./PrintShippingSlip.module.css";

export interface PrintShippingSlipProps {
  detail: OrderDetail;
}

export function PrintShippingSlip({ detail }: PrintShippingSlipProps) {

  const latestTx = detail.transactions[0];
  const paymentMethod = latestTx?.payment_method ?? "cod";
  const paymentStatus =
    latestTx?.status ?? (detail.order.status === "completed" ? "success" : "pending");
  const isPaid = paymentStatus === "success";
  const amountToCollect = isPaid ? 0 : detail.order.total_price_vnd;

  return (
    <div className={styles.page}>
      <div className={styles.screenToolbar}>
        <Link href={`/admin/orders/${detail.order.id}`} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Quay lại chi tiết đơn hàng</span>
        </Link>

        <Button
          variant="primary"
          leftIcon={<Printer size={16} />}
          onClick={() => window.print()}
        >
          In phiếu giao hàng
        </Button>
      </div>

      <article className={styles.slipSheet} aria-label="Phiếu giao hàng">
        <div className={styles.slipTop}>
          <div className={styles.brandBlock}>
            <span className={styles.brandMark} aria-hidden="true">
              P
            </span>
            <div>
              <h1 className={styles.slipTitle}>PAUSE · PHIẾU GIAO HÀNG</h1>
              <p className={styles.slipSubtitle}>
                Dịch vụ lưu trữ kỷ niệm &amp; in ảnh Photobooth theo yêu cầu
              </p>
            </div>
          </div>

          <div className={styles.codeBox}>
            <p className={styles.codeLabel}>Mã đơn hàng</p>
            <p className={styles.codeValue}>#{detail.order.short_code}</p>
          </div>
        </div>

        <div className={styles.sectionGrid}>
          <section className={styles.box}>
            <h2 className={styles.boxTitle}>Người nhận hàng</h2>
            <p className={styles.recipientName}>{detail.order.shipping_name}</p>
            <p className={styles.recipientPhone}>{detail.order.shipping_phone}</p>
            <p className={styles.recipientAddress}>{detail.order.shipping_address}</p>
            {detail.order.note ? (
              <p className={styles.noteLine}>
                <strong>Ghi chú khách:</strong> {detail.order.note}
              </p>
            ) : null}
          </section>

          <section className={styles.box}>
            <h2 className={styles.boxTitle}>Thông tin đơn hàng</h2>
            <p>
              <strong>Ngày đặt:</strong> {formatDateTime(detail.order.created_at)}
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Trạng thái:</strong>{" "}
              {ORDER_STATUS_LABELS[detail.order.status] ?? detail.order.status}
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Phương thức TT:</strong> {getPaymentMethodLabel(paymentMethod)}
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Trạng thái TT:</strong> {getPaymentStatusLabel(paymentStatus)}
            </p>
            {latestTx?.order_code ? (
              <p style={{ marginTop: 6 }}>
                <strong>Mã giao dịch:</strong> {String(latestTx.order_code)}
              </p>
            ) : null}
          </section>
        </div>

        <section>
          <table className={styles.specTable}>
            <thead>
              <tr>
                <th>Sản phẩm / Template</th>
                <th>Quy cách</th>
                <th className={styles.textRight}>SL</th>
                <th className={styles.textRight}>Đơn giá</th>
                <th className={styles.textRight}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{detail.template.name}</strong>
                  <div style={{ fontSize: "0.75rem", color: "#4a4643" }}>
                    {detail.template.slot_count} ô ảnh
                  </div>
                </td>
                <td>
                  {getCoverTypeLabel(detail.order.cover_type)} · Giấy{" "}
                  {getPaperTypeLabel(detail.order.paper_type)}
                </td>
                <td className={styles.textRight}>{detail.order.quantity}</td>
                <td className={styles.textRight}>
                  {formatVnd(detail.order.unit_price_vnd)}
                </td>
                <td className={styles.textRight}>
                  <strong>{formatVnd(detail.order.total_price_vnd)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.codBanner}>
          <div>
            <p className={styles.boxTitle} style={{ marginBottom: 4 }}>
              Tiền thu hộ người nhận (COD)
            </p>
            <p style={{ fontSize: "0.875rem", color: "#4a4643" }}>
              {isPaid
                ? "Đơn hàng đã thanh toán trực tuyến, không thu thêm tiền."
                : "Thu hộ tiền mặt khi giao hàng thành công."}
            </p>
          </div>
          <p className={styles.codAmount}>{formatVnd(amountToCollect)}</p>
        </section>

        <section className={styles.box}>
          <h2 className={styles.boxTitle}>Kiểm tra đóng gói</h2>
          <ul className={styles.checklist}>
            <li>
              [ ] Kiểm tra đủ {detail.slot_photos.length} ảnh gốc đã in và đúng thứ tự slot
            </li>
            <li>
              [ ] Kiểm tra đúng quy cách: {getCoverTypeLabel(detail.order.cover_type)} / Giấy{" "}
              {getPaperTypeLabel(detail.order.paper_type)} (SL: {detail.order.quantity})
            </li>
            <li>[ ] Bọc túi chống ẩm và kiểm tra thông tin người nhận trước khi niêm phong</li>
          </ul>
        </section>

        <div className={styles.slipFooter}>
          <span>ID hệ thống: {detail.order.id}</span>
          <span>Múi giờ hiển thị: Asia/Ho_Chi_Minh (UTC+7)</span>
        </div>
      </article>
    </div>
  );
}
