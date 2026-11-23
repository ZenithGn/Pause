import React from "react";
import { Card, Skeleton, TableSkeleton } from "@/components/ui";

export default function OrdersLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Skeleton width={220} height={28} />
          <Skeleton width={360} height={16} />
        </div>
        <Skeleton width={110} height={40} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", overflow: "hidden" }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} width={112} height={36} />
        ))}
      </div>

      <Card padding="sm">
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Skeleton width={260} height={40} />
          <Skeleton width={160} height={40} />
          <Skeleton width={160} height={40} />
          <Skeleton width={190} height={40} />
        </div>
      </Card>

      <Card padding="none">
        <TableSkeleton rows={8} columns={7} />
      </Card>
    </div>
  );
}
