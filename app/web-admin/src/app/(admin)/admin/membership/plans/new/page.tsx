import type { Metadata } from "next";
import { MembershipPlanForm } from "@/features/membership/components/MembershipPlanForm";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tạo gói hội viên mới",
};

export default async function NewMembershipPlanPage() {
  await requireAdmin();

  return <MembershipPlanForm mode="create" />;
}
