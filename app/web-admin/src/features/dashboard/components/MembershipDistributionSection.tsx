import React from "react";
import { Card, ErrorState } from "@/components/ui";
import type { MembershipDistributionItem } from "@/types/admin";
import { buildDashboardHref, type DashboardRange } from "../date-range";
import { fetchMembershipDistribution } from "../queries";
import { MembershipDistributionClient } from "./MembershipDistributionClient";

export async function MembershipDistributionSection({
  range,
}: {
  range: DashboardRange;
}) {
  let items: MembershipDistributionItem[];
  try {
    items = await fetchMembershipDistribution();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải thống kê phân bố hội viên.";
    return (
      <Card>
        <ErrorState
          title="Không thể tải phân bố hội viên"
          message={message}
          retryHref={buildDashboardHref({
            preset: range.preset,
            from: range.from,
            to: range.to,
            granularity: range.granularity,
          })}
        />
      </Card>
    );
  }

  return <MembershipDistributionClient items={items} />;
}
