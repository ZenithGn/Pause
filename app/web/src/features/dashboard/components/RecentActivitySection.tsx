import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  CreditCard,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardTitle,
  ErrorState,
  StatusChip,
} from "@/components/ui";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { TransactionType } from "@/types/admin";
import { buildDashboardHref, type DashboardRange } from "../date-range";
import { fetchRecentActivity, type RecentActivitySnapshot } from "../queries";
import styles from "./RecentActivitySection.module.css";

const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  print_order: "Thanh toán in ảnh",
  membership: "Đăng ký hội viên",
  drawer_purchase: "Mua ngăn kéo",
};

export async function RecentActivitySection({
  range,
}: {
  range: DashboardRange;
}) {
  let activity: RecentActivitySnapshot;
  try {
    activity = await fetchRecentActivity();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải danh sách hoạt động gần đây.";
    return (
      <Card>
        <ErrorState
          title="Không thể tải hoạt động gần đây"
          message={message}
          retryHref={buildDashboardHref({
            preset: range.preset,
            from: range.from,
            to: range.to,
            granularity: range.granularity,
          })}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.header}>
        <div>
          <CardTitle>Hoạt động gần đây &amp; Lối tắt nhanh</CardTitle>
          <CardDescription>
            Theo dõi nhanh đơn hàng mới, giao dịch thanh toán và người dùng vừa đăng ký
          </CardDescription>
        </div>

        <nav aria-label="Lối tắt thao tác nhanh" className={styles.shortcuts}>
          <Link
            href="/admin/orders?status=pending"
            className={`${styles.shortcutChip} ${styles.shortcutPrimary}`}
          >
            <Clock size={14} aria-hidden="true" />
            <span>Đơn chờ xác nhận</span>
          </Link>
          <Link href="/admin/orders" className={styles.shortcutChip}>
            <ShoppingBag size={14} aria-hidden="true" />
            <span>Tất cả đơn hàng</span>
          </Link>
          <Link href="/admin/transactions" className={styles.shortcutChip}>
            <CreditCard size={14} aria-hidden="true" />
            <span>Lịch sử giao dịch</span>
          </Link>
          <Link href="/admin/users" className={styles.shortcutChip}>
            <UserPlus size={14} aria-hidden="true" />
            <span>Người dùng mới</span>
          </Link>
        </nav>
      </div>

      <div className={styles.columns}>
        <section aria-label="Đơn hàng gần đây" className={styles.column}>
          <div className={styles.columnHeader}>
            <h4 className={styles.columnTitle}>
              <ShoppingBag size={15} aria-hidden="true" />
              <span>Đơn hàng mới</span>
            </h4>
            <Link href="/admin/orders" className={styles.columnLink}>
              <span>Xem tất cả</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {activity.recentOrders.length === 0 ? (
            <p className={styles.emptyCol}>Chưa có đơn hàng nào.</p>
          ) : (
            <ul className={styles.list}>
              {activity.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className={styles.itemLink}>
                    <div className={styles.itemTop}>
                      <span className={styles.itemTitle}>
                        #{order.short_code} · {order.customer_name}
                      </span>
                      <span className={styles.itemAmount}>
                        {formatVnd(order.total_price_vnd)}
                      </span>
                    </div>
                    <div className={styles.itemBottom}>
                      <StatusChip status={order.status} size="sm" />
                      <span>{formatDateTime(order.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Giao dịch gần đây" className={styles.column}>
          <div className={styles.columnHeader}>
            <h4 className={styles.columnTitle}>
              <CreditCard size={15} aria-hidden="true" />
              <span>Giao dịch gần đây</span>
            </h4>
            <Link href="/admin/transactions" className={styles.columnLink}>
              <span>Xem tất cả</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {activity.recentTransactions.length === 0 ? (
            <p className={styles.emptyCol}>Chưa có giao dịch nào.</p>
          ) : (
            <ul className={styles.list}>
              {activity.recentTransactions.map((tx) => {
                const href = tx.order_id
                  ? `/admin/orders/${tx.order_id}`
                  : "/admin/transactions";
                return (
                  <li key={tx.id}>
                    <Link href={href} className={styles.itemLink}>
                      <div className={styles.itemTop}>
                        <span className={styles.itemTitle}>
                          {tx.display_name} ·{" "}
                          {TRANSACTION_TYPE_LABEL[tx.type] ?? tx.type}
                        </span>
                        <span className={styles.itemAmount}>
                          {formatVnd(tx.amount_vnd)}
                        </span>
                      </div>
                      <div className={styles.itemBottom}>
                        <StatusChip status={tx.status} size="sm" />
                        <span>{formatDateTime(tx.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Người dùng mới đăng ký" className={styles.column}>
          <div className={styles.columnHeader}>
            <h4 className={styles.columnTitle}>
              <UserPlus size={15} aria-hidden="true" />
              <span>Người dùng mới</span>
            </h4>
            <Link href="/admin/users" className={styles.columnLink}>
              <span>Xem tất cả</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {activity.recentUsers.length === 0 ? (
            <p className={styles.emptyCol}>Chưa có người dùng mới.</p>
          ) : (
            <ul className={styles.list}>
              {activity.recentUsers.map((user) => (
                <li key={user.id}>
                  <Link href={`/admin/users/${user.id}`} className={styles.itemLink}>
                    <div className={styles.itemTop}>
                      <span className={styles.itemTitle}>{user.display_name}</span>
                      <StatusChip
                        status={user.tier === "Free" ? "free" : "vip"}
                        label={user.tier}
                        size="sm"
                      />
                    </div>
                    <div className={styles.itemBottom}>
                      <span>{user.email ?? user.phone ?? "—"}</span>
                      <span>{formatDateTime(user.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {activity.partialWarnings.length > 0 ? (
        <p className={styles.warningNote} role="status">
          Lưu ý: {activity.partialWarnings.join(" ")}
        </p>
      ) : null}
    </Card>
  );
}
