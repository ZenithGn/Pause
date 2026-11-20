import React from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, Crown, Lock, Package, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusChip,
} from "@/components/ui";
import { formatBytes, formatDate, formatDateTime, formatNumber, formatVnd } from "@/lib/format";
import type { UserDetailView as UserDetailData } from "../queries";
import { formatPaymentMethodLabel, formatTransactionTypeLabel } from "../schemas";
import { UserAvatar } from "./UserAvatar";
import { UserTierChip } from "./UserTierChip";
import styles from "./UserDetailView.module.css";

export interface UserDetailViewProps {
  detail: UserDetailData;
}

function formatDurationLabel(durationType?: string): string {
  if (durationType === "yearly") return "Theo năm";
  if (durationType === "monthly") return "Theo tháng";
  return "—";
}

export function UserDetailView({ detail }: UserDetailViewProps) {
  const {
    profile,
    email,
    memberships,
    drawer_stats,
    orders_summary,
    recent_orders,
    recent_transactions,
  } = detail;

  return (
    <div className={styles.container}>
      {profile.is_locked ? (
        <div className={styles.lockedBanner} role="status">
          <div className={styles.lockedBannerMain}>
            <Lock size={20} className={styles.lockedBannerIcon} aria-hidden="true" />
            <div>
              <p className={styles.lockedBannerTitle}>Tài khoản này đang bị khóa</p>
              <p className={styles.lockedBannerReason}>
                <strong>Lý do:</strong>{" "}
                {profile.locked_reason ?? "Không có ghi chú lý do."}
              </p>
            </div>
          </div>
          <span className={styles.lockedBannerMeta}>
            Khóa lúc: {formatDateTime(profile.locked_at)}
          </span>
        </div>
      ) : null}

      <div className={styles.topGrid}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Thông tin hồ sơ</CardTitle>
              <CardDescription>
                Thông tin định danh, vai trò và trạng thái tài khoản Pause
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className={styles.profileHeader}>
              <UserAvatar
                name={profile.display_name}
                avatarUrl={profile.avatar_url}
                size="lg"
              />
              <div className={styles.profileIdentity}>
                <h2 className={styles.profileName}>{profile.display_name}</h2>
                <div className={styles.badgeRow}>
                  <UserTierChip tier={profile.tier} size="md" />
                  <StatusChip status={profile.role} size="md" />
                  <StatusChip
                    status={profile.is_locked ? "locked" : "unlocked"}
                    size="md"
                  />
                </div>
              </div>
            </div>

            {profile.is_locked ? (
              <div className={styles.lockBox}>
                <div className={styles.lockBoxHeader}>
                  <StatusChip status="locked" size="sm" />
                  <span className={styles.lockBoxTime}>
                    Khóa lúc: {formatDateTime(profile.locked_at)}
                  </span>
                </div>
                <p className={styles.lockBoxReason}>
                  <strong>Lý do khóa:</strong>{" "}
                  {profile.locked_reason ?? "Không có ghi chú lý do."}
                </p>
              </div>
            ) : null}

            <dl className={styles.metaList}>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Email</dt>
                <dd className={styles.metaValue}>{email ?? "—"}</dd>
              </div>

              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Số điện thoại</dt>
                <dd className={styles.metaValue}>{profile.phone ?? "Chưa cập nhật"}</dd>
              </div>

              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Ngày tạo tài khoản</dt>
                <dd className={styles.metaValue}>{formatDateTime(profile.created_at)}</dd>
              </div>

              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Đăng nhập gần nhất</dt>
                <dd className={styles.metaValue}>
                  {profile.last_sign_in_at
                    ? formatDateTime(profile.last_sign_in_at)
                    : "Chưa đăng nhập"}
                </dd>
              </div>

              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Hạn mức ngăn kéo</dt>
                <dd className={styles.metaValue}>
                  {formatNumber(drawer_stats.drawer_count)} /{" "}
                  {formatNumber(profile.max_drawers)} ngăn kéo
                </dd>
              </div>

              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Cập nhật hồ sơ</dt>
                <dd className={styles.metaValue}>{formatDateTime(profile.updated_at)}</dd>
              </div>

              <div className={`${styles.metaItem} ${styles.metaItemFull}`}>
                <dt className={styles.metaLabel}>ID người dùng</dt>
                <dd className={styles.monoValue}>{profile.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className={styles.rightStack}>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Thống kê lưu trữ</CardTitle>
                <CardDescription>
                  Số liệu tổng hợp ngăn kéo và dung lượng ảnh của người dùng
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <div className={styles.statsGrid3}>
                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Số ngăn kéo</span>
                  <span className={styles.statValue}>
                    {formatNumber(drawer_stats.drawer_count)}
                  </span>
                  <span className={styles.statSub}>
                    Tối đa {formatNumber(profile.max_drawers)}
                  </span>
                </div>

                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Tổng số ảnh</span>
                  <span className={styles.statValue}>
                    {formatNumber(drawer_stats.photo_count)}
                  </span>
                  <span className={styles.statSub}>Ảnh đã lưu</span>
                </div>

                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Dung lượng đã dùng</span>
                  <span className={styles.statValue}>
                    {formatBytes(drawer_stats.storage_used_bytes)}
                  </span>
                  <span className={styles.statSub}>Tổng dung lượng</span>
                </div>
              </div>

              <div className={styles.privacyNote}>
                <ShieldCheck size={16} className={styles.privacyIcon} aria-hidden="true" />
                <span>
                  Để bảo vệ quyền riêng tư (NFR-04.2), quản trị viên chỉ xem được số
                  liệu tổng hợp và không thể xem ảnh hoặc tên ngăn kéo cá nhân của người
                  dùng.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tổng quan đơn in</CardTitle>
                <CardDescription>
                  Tình hình đặt in photobooth của người dùng
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <div className={styles.statsGrid2}>
                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Tổng số đơn in</span>
                  <span className={styles.statValue}>
                    {formatNumber(orders_summary.total_orders)}
                  </span>
                </div>

                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Tổng chi tiêu hợp lệ</span>
                  <span className={styles.statValue}>
                    {formatVnd(orders_summary.total_spent_vnd)}
                  </span>
                </div>

                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Đơn chờ xác nhận</span>
                  <span className={styles.statValue}>
                    {formatNumber(orders_summary.pending_orders)}
                  </span>
                </div>

                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Đơn hoàn thành</span>
                  <span className={styles.statValue}>
                    {formatNumber(orders_summary.completed_orders)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card padding="none">
        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-4)" }}>
          <CardHeader style={{ marginBottom: 0 }}>
            <div>
              <CardTitle>Lịch sử gói hội viên</CardTitle>
              <CardDescription>
                Các lượt đăng ký và gia hạn gói hội viên của tài khoản
              </CardDescription>
            </div>
            <Link href="/admin/membership/subscribers" className={styles.sectionLink}>
              <span>Danh sách hội viên</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </CardHeader>
        </div>

        {memberships.length === 0 ? (
          <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
            <EmptyState
              icon={<Crown size={22} />}
              title="Chưa đăng ký gói hội viên"
              description="Người dùng hiện đang sử dụng gói miễn phí (Free) và chưa có lịch sử đăng ký gói trả phí."
            />
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tên gói</th>
                  <th scope="col">Chu kỳ</th>
                  <th scope="col" className={styles.alignRight}>
                    Giá gói
                  </th>
                  <th scope="col">Ngày bắt đầu</th>
                  <th scope="col">Ngày hết hạn</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.plan_name}</strong>
                    </td>
                    <td className={styles.mutedText}>
                      {formatDurationLabel(item.duration_type)}
                    </td>
                    <td className={`${styles.alignRight} ${styles.nowrap}`}>
                      {typeof item.price_vnd === "number"
                        ? formatVnd(item.price_vnd)
                        : "—"}
                    </td>
                    <td className={styles.nowrap}>{formatDate(item.started_at)}</td>
                    <td className={styles.nowrap}>{formatDate(item.expires_at)}</td>
                    <td>
                      <StatusChip status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-4)" }}>
          <CardHeader style={{ marginBottom: 0 }}>
            <div>
              <CardTitle>Đơn in gần đây</CardTitle>
              <CardDescription>
                Tối đa 10 đơn in photobooth mới nhất của người dùng
              </CardDescription>
            </div>
            <Link href="/admin/orders" className={styles.sectionLink}>
              <span>Tất cả đơn hàng</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </CardHeader>
        </div>

        {recent_orders.length === 0 ? (
          <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
            <EmptyState
              icon={<Package size={22} />}
              title="Chưa có đơn in nào"
              description="Người dùng này chưa đặt đơn in photobooth nào."
            />
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Template</th>
                  <th scope="col" className={styles.alignRight}>
                    Số lượng
                  </th>
                  <th scope="col" className={styles.alignRight}>
                    Tổng tiền
                  </th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col" className={styles.alignRight}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className={styles.codeLink}
                      >
                        #{order.short_code}
                      </Link>
                    </td>
                    <td>{order.template_name ?? "—"}</td>
                    <td className={`${styles.alignRight} ${styles.nowrap}`}>
                      {formatNumber(order.quantity)}
                    </td>
                    <td className={`${styles.alignRight} ${styles.nowrap}`}>
                      {formatVnd(order.total_price_vnd)}
                    </td>
                    <td>
                      <StatusChip status={order.status} />
                    </td>
                    <td className={`${styles.nowrap} ${styles.mutedText}`}>
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className={styles.alignRight}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className={styles.inlineActionLink}
                      >
                        Xem đơn
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-4)" }}>
          <CardHeader style={{ marginBottom: 0 }}>
            <div>
              <CardTitle>Giao dịch gần đây</CardTitle>
              <CardDescription>
                Tối đa 10 giao dịch thanh toán gần nhất của người dùng
              </CardDescription>
            </div>
            <Link href="/admin/transactions" className={styles.sectionLink}>
              <span>Xem lịch sử giao dịch</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </CardHeader>
        </div>

        {recent_transactions.length === 0 ? (
          <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
            <EmptyState
              icon={<CreditCard size={22} />}
              title="Chưa có giao dịch nào"
              description="Chưa có giao dịch thanh toán nào được ghi nhận cho tài khoản này."
            />
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Loại giao dịch</th>
                  <th scope="col">Mã giao dịch</th>
                  <th scope="col">Phương thức</th>
                  <th scope="col">Mã cổng thanh toán</th>
                  <th scope="col" className={styles.alignRight}>
                    Số tiền
                  </th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col" className={styles.alignRight}>
                    Đối soát
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent_transactions.map((tx) => {
                  const txSearchParam = tx.order_code ?? tx.payment_gateway_ref;
                  const txHref = txSearchParam
                    ? `/admin/transactions?q=${encodeURIComponent(String(txSearchParam))}`
                    : "/admin/transactions";

                  return (
                    <tr key={tx.id}>
                      <td>
                        <strong>{formatTransactionTypeLabel(tx.type)}</strong>
                      </td>
                      <td className={styles.monoValue}>
                        {tx.order_code !== null && tx.order_code !== undefined
                          ? String(tx.order_code)
                          : "—"}
                      </td>
                      <td>{formatPaymentMethodLabel(tx.payment_method)}</td>
                      <td className={styles.monoValue}>
                        {tx.payment_gateway_ref ?? "—"}
                      </td>
                      <td className={`${styles.alignRight} ${styles.nowrap}`}>
                        {formatVnd(tx.amount_vnd)}
                      </td>
                      <td>
                        <StatusChip status={tx.status} />
                      </td>
                      <td className={`${styles.nowrap} ${styles.mutedText}`}>
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className={styles.alignRight}>
                        <Link href={txHref} className={styles.inlineActionLink}>
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
