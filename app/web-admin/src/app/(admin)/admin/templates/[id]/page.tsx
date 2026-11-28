import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, ErrorState, PageHeader } from "@/components/ui";
import { TemplateForm } from "@/features/templates/components";
import { getTemplateById } from "@/features/templates/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chỉnh sửa Template Photobooth",
};

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let template = null;
  let loadError: string | null = null;

  try {
    template = await getTemplateById(id);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Không thể tải chi tiết template.";
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <PageHeader
          title="Chi tiết Template"
          breadcrumbs={[
            { label: "Dashboard", href: "/admin" },
            { label: "Templates", href: "/admin/templates" },
            { label: "Lỗi" },
          ]}
        />
        <ErrorState
          title="Không thể tải thông tin template"
          message={loadError}
          retryHref={`/admin/templates/${id}`}
          action={
            <Link href="/admin/templates">
              <Button variant="text" size="sm">
                Về danh sách Templates
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!template) {
    notFound();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title={`Chỉnh sửa: ${template.name}`}
        description="Cập nhật ảnh xem trước, bố cục slot, phân loại và trạng thái hiển thị của template."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Templates", href: "/admin/templates" },
          { label: template.name },
        ]}
      />

      <TemplateForm initialTemplate={template} />
    </div>
  );
}
