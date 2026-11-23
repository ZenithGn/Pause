import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, Printer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { OrderDetail } from "@/types/admin";
import {
  OrderNotesEditor,
  OrderStatusPanel,
  SafeOrderImage,
  ShippingInfoCard,
} from "@/features/orders/components";
import styles from "@/features/orders/components/OrderDetail.module.css";
import { getOrderDetail } from "@/features/orders/queries";
import {
  getCoverTypeLabel,
  getPaperTypeLabel,
  getPaymentMethodLabel,
  getTemplateCategoryLabel,
  ORDER_STATUS_LABELS,
} from "@/features/orders/status-machine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng in",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let detail: OrderDetail | null = null;
  let loadError: string | null = null;

  try {
    detail = await getOrderDetail(id);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Không thể tải thông tin đơn hàng.";
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Chi tiết đơn hàng"
          breadcrumbs={[
            { label: "Đơn hàng", href: "/admin/orders" },
            { label: "Chi tiết" },
          ]}
        />
        <ErrorState
          title="Không thể tải chi tiết đơn hàng"
          message={loadError}
          retryHref={`/admin/orders/${id}`}
        />
      </div>
    );
  }

  if (!detail) {
    notFound();
  }

  const previewUrl = detail.photobooth_item.preview_url || detail.template.preview_url;
  const sortedSlots = [...detail.slot_photos].sort((a, b) => a.slot_index - b.slot_index);

  return (
    <div className={styles.page}>
      <PageHeader
        title={`Đơn hàng #${detail.order.short_code}`}
        description={`Tạo lúc ${formatDateTime(detail.order.created_at)} · Cập nhật lần cuối ${formatDateTime(detail.order.updated_at)}`}
        breadcrumbs={[
          { label: "Đơn hàng", href: "/admin/orders" },
          { label: `#${detail.order.short_code}` },
        ]}
        actions={
          <div className={styles.headerActions}>
            <StatusChip status={detail.order.status} size="md" />
            <Link
              href={`/admin/orders/${detail.order.id}/print`}
              className={`${styles.actionLinkBtn} ${styles.actionOutlined}`}
            >
              <Printer size={16} aria-hidden="true" />
              <span>In phiếu giao hàng</span>
            </Link>
            <a
              href={`/api/admin/orders/${detail.order.id}/print-pack`}
              download={`pause-order-${detail.order.short_code}-print-pack.zip`}
              className={`${styles.actionLinkBtn} ${styles.actionTonal}`}
            >
              <Download size={16} aria-hidden="true" />
              <span>Tải gói in (.zip)</span>
            </a>
          </div>
        }
      />

      <div className={styles.grid}>
        {/* Left Column: Photobooth preview, slot photos, product specs, payments */}
        <div className={styles.column}>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Photobooth &amp; Template</CardTitle>
                <CardDescription>
                  Ảnh xem trước sản phẩm hoàn chỉnh và thông số mẫu đã chọn
                </CardDescription>
              </div>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.inlineLink}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-label-lg)" }}
                >
                  <span>Mở ảnh preview</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </CardHeader>

            <CardContent>
              <div className={styles.previewWrap}>
                <div className={styles.previewFrame}>
                  <SafeOrderImage
                    src={previewUrl}
                    alt={`Preview đơn #${detail.order.short_code}`}
                    className={styles.previewImage}
                    fallbackText="Chưa có preview"
                  />
                </div>

                <dl className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <dt className={styles.metaLabel}>Template</dt>
                    <dd className={styles.metaValue}>
                      {detail.template.id ? (
                        <Link
                          href={`/admin/templates/${detail.template.id}`}
                          className={styles.inlineLink}
                        >
                          {detail.template.name}
                        </Link>
                      ) : (
                        detail.template.name
                      )}
                    </dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt className={styles.metaLabel}>Phân loại</dt>
                    <dd className={styles.metaValue}>
                      {getTemplateCategoryLabel(detail.template.category)}
                    </dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt className={styles.metaLabel}>Số lượng slot ảnh</dt>
                    <dd className={styles.metaValue}>
                      {detail.template.slot_count} ô ảnh
                    </dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt className={styles.metaLabel}>Kích thước layout</dt>
                    <dd className={styles.metaValue}>
                      {detail.template.layout_config.width} ×{" "}
                      {detail.template.layout_config.height} px
                    </dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt className={styles.metaLabel}>Mã Photobooth Item</dt>
                    <dd className={`${styles.metaValue} ${styles.mono}`}>
                      {detail.photobooth_item.id.slice(0, 8).toUpperCase()}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Ảnh gốc theo từng Slot ({sortedSlots.length})</CardTitle>
                <CardDescription>
                  Sắp xếp theo thứ tự slot để tải ảnh gốc chất lượng cao phục vụ in ấn
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {sortedSlots.length === 0 ? (
                <EmptyState
                  title="Không có ảnh slot"
                  description="Đơn hàng này chưa có ảnh slot đi kèm."
                />
              ) : (
                <div className={styles.slotGrid}>
                  {sortedSlots.map((slot) => {
                    const displaySrc = slot.thumbnail_url ?? slot.original_url;
                    const dimensionsText =
                      slot.width && slot.height
                        ? `${slot.width} × ${slot.height} px`
                        : "Chưa rõ kích thước";
                    return (
                      <div key={slot.slot_index} className={styles.slotCard}>
                        <div className={styles.slotImageBox}>
                          <span className={styles.slotIndexBadge}>
                            Slot #{slot.slot_index + 1}
                          </span>
                          <SafeOrderImage
                            src={displaySrc}
                            alt={`Ảnh slot ${slot.slot_index + 1}`}
                            className={styles.slotImage}
                          />
                        </div>
                        <div className={styles.slotBody}>
                          <span className={styles.slotDims}>{dimensionsText}</span>
                          <a
                            href={slot.original_url}
                            download={`order-${detail.order.short_code}-slot-${slot.slot_index + 1}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.slotDownloadLink}
                          >
                            <Download size={13} aria-hidden="true" />
                            <span>Tải ảnh gốc</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quy cách sản phẩm &amp; Chi phí</CardTitle>
                <CardDescription>Tùy chọn in ấn do khách hàng xác nhận</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <dl className={styles.metaList}>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Loại bìa</dt>
                  <dd className={styles.metaValue}>
                    {getCoverTypeLabel(detail.order.cover_type)}
                  </dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Chất liệu giấy</dt>
                  <dd className={styles.metaValue}>
                    {getPaperTypeLabel(detail.order.paper_type)}
                  </dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Số lượng bản in</dt>
                  <dd className={styles.metaValue}>{detail.order.quantity} bản</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Đơn giá</dt>
                  <dd className={styles.metaValue}>
                    {formatVnd(detail.order.unit_price_vnd)}
                  </dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Tổng thanh toán</dt>
                  <dd className={`${styles.metaValue} ${styles.totalHighlight}`}>
                    {formatVnd(detail.order.total_price_vnd)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Thanh toán &amp; Giao dịch</CardTitle>
                <CardDescription>
                  Lịch sử giao dịch PayOS / VietQR hoặc COD gắn với đơn hàng
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {detail.transactions.length === 0 ? (
                <p className={styles.mutedText}>
                  Chưa ghi nhận giao dịch thanh toán trực tuyến cho đơn hàng này (đơn COD hoặc đang chờ thanh toán).
                </p>
              ) : (
                <div className={styles.txList}>
                  {detail.transactions.map((tx) => (
                    <div key={tx.id} className={styles.txItem}>
                      <div className={styles.txTop}>
                        <span className={styles.txAmount}>
                          {formatVnd(tx.amount_vnd)}
                        </span>
                        <StatusChip status={tx.status} />
                      </div>
                      <div className={styles.txDetails}>
                        <div>
                          <strong>Mã đơn TT (order_code):</strong>{" "}
                          <span className={styles.mono}>
                            {tx.order_code ? String(tx.order_code) : "—"}
                          </span>
                        </div>
                        <div>
                          <strong>Phương thức:</strong>{" "}
                          {getPaymentMethodLabel(tx.payment_method)}
                        </div>
                        <div>
                          <strong>Mã cổng thanh toán:</strong>{" "}
                          <span className={styles.mono}>
                            {tx.payment_gateway_ref ?? "—"}
                          </span>
                        </div>
                        <div>
                          <strong>Thời gian:</strong> {formatDateTime(tx.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Status panel, shipping info, customer, internal notes, status timeline */}
        <div className={styles.column}>
          <OrderStatusPanel
            orderId={detail.order.id}
            shortCode={detail.order.short_code}
            currentStatus={detail.order.status}
          />

          <ShippingInfoCard
            orderId={detail.order.id}
            shortCode={detail.order.short_code}
            shippingName={detail.order.shipping_name}
            shippingPhone={detail.order.shipping_phone}
            shippingAddress={detail.order.shipping_address}
            customerNote={detail.order.note}
          />

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tài khoản khách hàng</CardTitle>
                <CardDescription>Người đặt đơn trên ứng dụng Pause</CardDescription>
              </div>
              <Link
                href={`/admin/users/${detail.customer.id}`}
                className={styles.inlineLink}
                style={{ fontSize: "var(--text-label-lg)" }}
              >
                Xem hồ sơ
              </Link>
            </CardHeader>

            <CardContent>
              <dl className={styles.metaList}>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Tên hiển thị</dt>
                  <dd className={styles.metaValue}>{detail.customer.display_name}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>Email</dt>
                  <dd className={styles.metaValue}>
                    {detail.customer.email ?? "—"}
                  </dd>
                </div>
                <div className={styles.metaRow}>
                  <dt className={styles.metaLabel}>SĐT tài khoản</dt>
                  <dd className={`${styles.metaValue} ${styles.mono}`}>
                    {detail.customer.phone ?? "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <OrderNotesEditor
            orderId={detail.order.id}
            initialNotes={detail.order.admin_notes}
          />

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Lịch sử trạng thái</CardTitle>
                <CardDescription>
                  Toàn bộ mốc chuyển trạng thái và người thực hiện
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {detail.status_history.length === 0 ? (
                <p className={styles.mutedText}>Chưa có lịch sử chuyển trạng thái.</p>
              ) : (
                <ol className={styles.timeline}>
                  {detail.status_history.map((item) => {
                    const fromLabel = item.from_status
                      ? ORDER_STATUS_LABELS[item.from_status] ?? item.from_status
                      : null;
                    const toLabel =
                      ORDER_STATUS_LABELS[item.to_status] ?? item.to_status;

                    return (
                      <li key={item.id} className={styles.timelineItem}>
                        <div className={styles.timelineHead}>
                          <span className={styles.timelineTransition}>
                            {fromLabel ? `${fromLabel} → ${toLabel}` : `Tạo đơn (${toLabel})`}
                          </span>
                          <span className={styles.timelineTime}>
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>
                        <p className={styles.timelineActor}>
                          Thực hiện bởi: {item.changed_by_name ?? "Hệ thống"}
                        </p>
                        {item.note ? (
                          <p className={styles.timelineNote}>{item.note}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
