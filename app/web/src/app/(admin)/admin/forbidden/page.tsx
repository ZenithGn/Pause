import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AdminForbiddenPage() {
  return (
    <div
      style={{
        minHeight: "65vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card style={{ maxWidth: 460, textAlign: "center" }} padding="lg">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "9999px",
            margin: "0 auto var(--space-4)",
            backgroundColor: "var(--md-sys-color-error-container)",
            color: "var(--md-sys-color-error)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldAlert size={26} aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: "var(--text-title-lg)", fontWeight: 700 }}>
          Không có quyền truy cập
        </h1>
        <p
          style={{
            marginTop: "var(--space-2)",
            color: "var(--md-sys-color-on-surface-variant)",
          }}
        >
          Tài khoản hiện tại không có quyền quản trị viên hoặc đã bị khóa. Vui lòng đăng nhập bằng tài khoản admin hợp lệ.
        </p>
        <div
          style={{
            marginTop: "var(--space-5)",
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-3)",
          }}
        >
          <Link href="/admin/login">
            <Button variant="primary">Đăng nhập lại</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
