import React from "react";
import { Card, Skeleton, TableSkeleton } from "@/components/ui";

export default function AdminUserDetailLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Skeleton width={200} height={14} />
        <Skeleton width={280} height={30} />
        <Skeleton width={220} height={16} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-5)",
        }}
      >
        <Card>
          <Skeleton width="50%" height={22} />
          <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-4)" }}>
            <Skeleton variant="circle" width={64} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Skeleton width="70%" height={22} />
              <Skeleton width="45%" height={20} />
            </div>
          </div>
          <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </div>
        </Card>

        <Card>
          <Skeleton width="50%" height={22} />
          <div
            style={{
              marginTop: "var(--space-4)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-3)",
            }}
          >
            <Skeleton variant="rect" height={84} />
            <Skeleton variant="rect" height={84} />
            <Skeleton variant="rect" height={84} />
          </div>
        </Card>
      </div>

      <Card padding="none">
        <TableSkeleton rows={4} columns={5} />
      </Card>
    </div>
  );
}
