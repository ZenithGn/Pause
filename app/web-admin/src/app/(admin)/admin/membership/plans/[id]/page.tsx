import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui";
import { MembershipPlanForm } from "@/features/membership/components/MembershipPlanForm";
import { getMembershipPlanById } from "@/features/membership/queries";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chỉnh sửa gói hội viên",
};

export default async function EditMembershipPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let plan;
  let errorMessage: string | null = null;
  try {
    plan = await getMembershipPlanById(id);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Không thể tải thông tin gói hội viên.";
  }

  if (errorMessage) {
    return (
      <ErrorState
        title="Không thể tải thông tin gói hội viên"
        message={errorMessage}
        retryHref={`/admin/membership/plans/${id}`}
      />
    );
  }

  if (!plan) {
    notFound();
  }

  return <MembershipPlanForm mode="edit" initialPlan={plan} />;
}
