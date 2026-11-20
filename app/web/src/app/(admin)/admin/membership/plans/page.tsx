import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ErrorState, TableSkeleton } from "@/components/ui";
import { PlansView } from "@/features/membership/components/PlansView";
import { listMembershipPlans } from "@/features/membership/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gói hội viên",
};

function readSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MembershipPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const rawIncludeInactive = readSingleParam(params.includeInactive);
  const includeInactive = rawIncludeInactive !== "false";

  let plans;
  let errorMessage: string | null = null;
  try {
    plans = await listMembershipPlans({ includeInactive });
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách gói hội viên.";
  }

  if (errorMessage || !plans) {
    return (
      <ErrorState
        title="Không thể tải danh sách gói hội viên"
        message={errorMessage ?? undefined}
        retryHref="/admin/membership/plans"
      />
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
      <PlansView plans={plans} includeInactive={includeInactive} />
    </Suspense>
  );
}
