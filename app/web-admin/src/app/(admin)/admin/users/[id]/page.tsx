import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, ErrorState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { UserDetailView, UserLockButton } from "@/features/users/components";
import { getAdminUserDetail } from "@/features/users/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết người dùng",
};

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const [session, { id }] = await Promise.all([requireAdmin(), params]);
  const result = await getAdminUserDetail(id);

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      notFound();
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <PageHeader
          title="Chi tiết người dùng"
          breadcrumbs={[
            { label: "Dashboard", href: "/admin" },
            { label: "Người dùng", href: "/admin/users" },
            { label: "Chi tiết" },
          ]}
          actions={
            <Link href="/admin/users">
              <Button variant="outlined" size="md" leftIcon={<ArrowLeft size={16} />}>
                Quay lại
              </Button>
            </Link>
          }
        />
        <ErrorState
          title="Không thể tải chi tiết người dùng"
          message={result.message}
          retryHref={`/admin/users/${id}`}
          action={
            <Link href="/admin/users">
              <Button variant="text" size="sm">
                Về danh sách người dùng
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const detail = result.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title={detail.profile.display_name}
        description={detail.email ?? "Chưa cập nhật email"}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Người dùng", href: "/admin/users" },
          { label: detail.profile.display_name },
        ]}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Link href="/admin/users">
              <Button variant="outlined" size="md" leftIcon={<ArrowLeft size={16} />}>
                Quay lại
              </Button>
            </Link>
            <UserLockButton
              userId={detail.profile.id}
              displayName={detail.profile.display_name}
              role={detail.profile.role}
              isLocked={detail.profile.is_locked}
              lockedReason={detail.profile.locked_reason}
              currentAdminId={session.user.id}
            />
          </div>
        }
      />

      <UserDetailView detail={detail} />
    </div>
  );
}
