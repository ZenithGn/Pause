import React from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TemplateForm } from "@/features/templates/components";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tạo Template Photobooth mới",
};

export default async function NewTemplatePage() {
  await requireAdmin();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title="Tạo Template Photobooth mới"
        description="Cấu hình thông tin mẫu, tải ảnh minh họa và thiết kế vị trí các khung ảnh (slots)."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Templates", href: "/admin/templates" },
          { label: "Tạo mới" },
        ]}
      />

      <TemplateForm />
    </div>
  );
}
