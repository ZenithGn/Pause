import React from "react";
import { Card, Skeleton, TableSkeleton } from "@/components/ui";

export default function TemplatesLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Skeleton width={260} height={28} />
          <Skeleton width={400} height={16} />
        </div>
        <Skeleton width={160} height={40} variant="rect" />
      </div>

      <Card padding="sm">
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Skeleton width={260} height={40} variant="rect" />
          <Skeleton width={160} height={40} variant="rect" />
          <Skeleton width={160} height={40} variant="rect" />
          <Skeleton width={160} height={40} variant="rect" />
        </div>
      </Card>

      <Card padding="none">
        <TableSkeleton rows={6} columns={7} />
      </Card>
    </div>
  );
}
