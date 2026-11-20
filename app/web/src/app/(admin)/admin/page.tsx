import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatNumber, formatVnd } from "@/lib/format";
import { MOCK_DASHBOARD_STATS } from "@/lib/mock-data";
import { ADMIN_NAV_ITEMS } from "@/lib/nav";

/**
 * Wave 0 Dashboard placeholder.
 * Agent G (feat-dashboard) replaces this page in Wave 1 with full KPI & charts.
 */
export default async function AdminDashboardPlaceholderPage() {
  const session = await requireAdmin();
  const quickLinks = ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title="Dashboard quản trị Pause"
        description={`Xin chào ${session.profile.display_name}. Nền tảng quản trị Wave 0 đã sẵn sàng cho các phân hệ tính năng.`}
        actions={
          session.isMock ? (
            <StatusChip tone="warning" label="Mock Preview Mode" size="md" />
          ) : (
            <StatusChip tone="success" label="Hệ thống sẵn sàng" size="md" />
          )
        }
      />

      {session.isMock ? (
        <section
          aria-label="Chỉ số mẫu"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <Card>
            <CardDescription>Tổng người dùng (Mock)</CardDescription>
            <p style={{ fontSize: "var(--text-headline-sm)", fontWeight: 700, marginTop: 6 }}>
              {formatNumber(MOCK_DASHBOARD_STATS.total_users)}
            </p>
          </Card>
          <Card>
            <CardDescription>Đơn chờ xác nhận (Mock)</CardDescription>
            <p style={{ fontSize: "var(--text-headline-sm)", fontWeight: 700, marginTop: 6 }}>
              {formatNumber(MOCK_DASHBOARD_STATS.pending_orders)}
            </p>
          </Card>
          <Card>
            <CardDescription>Doanh thu tháng (Mock)</CardDescription>
            <p style={{ fontSize: "var(--text-headline-sm)", fontWeight: 700, marginTop: 6 }}>
              {formatVnd(MOCK_DASHBOARD_STATS.revenue_month_vnd)}
            </p>
          </Card>
          <Card>
            <CardDescription>Hội viên hoạt động (Mock)</CardDescription>
            <p style={{ fontSize: "var(--text-headline-sm)", fontWeight: 700, marginTop: 6 }}>
              {formatNumber(MOCK_DASHBOARD_STATS.active_members)}
            </p>
          </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Các phân hệ quản trị</CardTitle>
            <CardDescription>
              Danh sách route đã được khai báo sẵn trong cấu hình điều hướng.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--md-sys-color-outline-variant)",
                  backgroundColor: "var(--md-sys-color-surface-container-low)",
                  fontWeight: 600,
                }}
              >
                <span>{item.label}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
