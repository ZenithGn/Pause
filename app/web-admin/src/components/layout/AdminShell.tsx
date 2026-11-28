"use client";

import React, { useState } from "react";
import { ToastProvider } from "@/components/ui";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import styles from "./AdminShell.module.css";

export interface AdminShellProps {
  displayName: string;
  email: string | null;
  isMock?: boolean;
  children: React.ReactNode;
}

export function AdminShell({
  displayName,
  email,
  isMock = false,
  children,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className={styles.shell}>
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className={styles.mainColumn}>
          <AdminHeader
            displayName={displayName}
            email={email}
            isMock={isMock}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
