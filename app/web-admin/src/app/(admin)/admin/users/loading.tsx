import React from "react";
import { Card, Skeleton, TableSkeleton } from "@/components/ui";

export default function AdminUsersLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Skeleton width={240} height={30} />
        <Skeleton width={420} height={16} />
      </div>

      <Card padding="md">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            gap: "var(--space-3)",
          }}
        >
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      </Card>

      <Card padding="none">
        <TableSkeleton rows={8} columns={8} />
      </Card>
    </div>
  );
}
