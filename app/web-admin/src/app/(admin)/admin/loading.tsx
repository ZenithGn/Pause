import React from "react";
import { Card, Skeleton, TableSkeleton } from "@/components/ui";

export default function AdminLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Skeleton width={220} height={28} />
        <Skeleton width={340} height={16} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <Card>
          <Skeleton width="45%" height={14} />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Skeleton width="65%" height={30} />
          </div>
        </Card>
        <Card>
          <Skeleton width="45%" height={14} />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Skeleton width="65%" height={30} />
          </div>
        </Card>
        <Card>
          <Skeleton width="45%" height={14} />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Skeleton width="65%" height={30} />
          </div>
        </Card>
      </div>

      <Card padding="none">
        <TableSkeleton rows={6} columns={5} />
      </Card>
    </div>
  );
}
