import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ErrorState, TableSkeleton } from "@/components/ui";
import { TransactionsView } from "@/features/transactions/components/TransactionsView";
import { listTransactions } from "@/features/transactions/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lịch sử giao dịch",
};

function readSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const search = (readSingleParam(params.q) ?? readSingleParam(params.search) ?? "").trim();
  const type = (readSingleParam(params.type) ?? "").trim();
  const status = (readSingleParam(params.status) ?? "").trim();
  const from = (readSingleParam(params.from) ?? "").trim();
  const to = (readSingleParam(params.to) ?? "").trim();
  const page = readSingleParam(params.page);
  const pageSize = readSingleParam(params.pageSize);

  let result;
  let errorMessage: string | null = null;

  try {
    result = await listTransactions({
      search,
      type,
      status,
      from,
      to,
      page,
      pageSize,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách giao dịch.";
  }

  if (errorMessage || !result) {
    return (
      <ErrorState
        title="Không thể tải danh sách giao dịch"
        message={errorMessage ?? undefined}
        retryHref="/admin/transactions"
      />
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={6} columns={8} />}>
      <TransactionsView
        result={result}
        activeFilters={{
          search,
          type,
          status,
          from,
          to,
        }}
      />
    </Suspense>
  );
}
