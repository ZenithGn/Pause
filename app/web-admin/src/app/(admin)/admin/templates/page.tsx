import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, Card, ErrorState, PageHeader, TableSkeleton } from "@/components/ui";
import { TemplatesListView } from "@/features/templates/components";
import {
  listTemplates,
  type TemplateStatusFilter,
  type TemplateTierFilter,
} from "@/features/templates/queries";
import { TEMPLATE_CATEGORIES } from "@/features/templates/schemas";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý Template Photobooth",
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function readStringParam(params: SearchParamsRecord, key: string): string {
  const val = params[key];
  const raw = Array.isArray(val) ? val[0] : val;
  return (raw ?? "").trim();
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  await requireAdmin();

  const resolvedParams = await searchParams;
  const pagination = parsePagination(resolvedParams);

  const q = readStringParam(resolvedParams, "q");
  const rawCategory = readStringParam(resolvedParams, "category").toLowerCase();
  const category = (TEMPLATE_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : "";

  const rawTier = readStringParam(resolvedParams, "tier").toLowerCase();
  const tier: TemplateTierFilter =
    rawTier === "free" || rawTier === "vip" ? rawTier : "";

  const rawStatus = readStringParam(resolvedParams, "status").toLowerCase();
  const status: TemplateStatusFilter =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "";

  let listResult = null;
  let loadError: string | null = null;

  try {
    listResult = await listTemplates({
      q,
      category,
      tier,
      status,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Không thể tải danh sách template.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title="Quản lý Template Photobooth"
        description="Thiết kế bố cục slot ảnh, quản lý gói Free/VIP và trạng thái hiển thị trên ứng dụng Mobile."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Templates" },
        ]}
        actions={
          <Link href="/admin/templates/new">
            <Button variant="primary" leftIcon={<Plus size={16} />}>
              Tạo template mới
            </Button>
          </Link>
        }
      />

      {loadError || !listResult ? (
        <ErrorState
          title="Không thể tải danh sách template"
          message={loadError ?? undefined}
          retryHref="/admin/templates"
        />
      ) : (
        <Suspense
          fallback={
            <Card padding="none">
              <TableSkeleton rows={6} columns={6} />
            </Card>
          }
        >
          <TemplatesListView
            result={listResult}
            initialFilters={{
              q,
              category,
              tier,
              status,
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
