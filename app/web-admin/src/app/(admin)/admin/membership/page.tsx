import { redirect } from "next/navigation";

export default function MembershipIndexPage() {
  redirect("/admin/membership/plans");
}
