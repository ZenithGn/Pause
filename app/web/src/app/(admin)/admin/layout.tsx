import React from "react";
import { AdminShell } from "@/components/layout";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdmin();

  return (
    <AdminShell
      displayName={session.profile.display_name}
      email={session.user.email}
      isMock={session.isMock}
    >
      {children}
    </AdminShell>
  );
}
