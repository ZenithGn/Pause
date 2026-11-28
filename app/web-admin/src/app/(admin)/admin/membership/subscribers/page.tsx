import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ErrorState, TableSkeleton } from "@/components/ui";
import { SubscribersView } from "@/features/membership/components/SubscribersView";
import {
  listMembershipPlans,
  listMembershipSubscribers,
} from "@/features/membership/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh sách hội viên",
};

function readSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MembershipSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const search = (readSingleParam(params.q) ?? readSingleParam(params.search) ?? "").trim();
  const status = (readSingleParam(params.status) ?? "").trim();
  const planId = (readSingleParam(params.plan) ?? readSingleParam(params.plan_id) ?? "").trim();
  const rawExpiring = readSingleParam(params.expiringWithinDays);
  const parsedExpiring = rawExpiring ? Number.parseInt(rawExpiring, 10) : Number.NaN;
  const expiringWithinDays =
    Number.isFinite(parsedExpiring) && parsedExpiring > 0 ? parsedExpiring : null;
  const page = readSingleParam(params.page);
  const pageSize = readSingleParam(params.pageSize);

  let subscribersResult;
  let plans;
  let errorMessage: string | null = null;

  try {
    [subscribersResult, plans] = await Promise.all([
      listMembershipSubscribers({
        search,
        status,
        planId,
        expiringWithinDays,
        page,
        pageSize,
      }),
      listMembershipPlans({ includeInactive: true }),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách hội viên.";
  }

  if (errorMessage || !subscribersResult || !plans) {
    return (
      <ErrorState
        title="Không thể tải danh sách hội viên"
        message={errorMessage ?? undefined}
        retryHref="/admin/membership/subscribers"
      />
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={6} columns={7} />}>
      <SubscribersView
        result={subscribersResult}
        plans={plans}
        activeFilters={{
          search,
          status,
          planId,
          expiringWithin7Days: expiringWithinDays === 7,
        }}
      />
    </Suspense>
  );
}
