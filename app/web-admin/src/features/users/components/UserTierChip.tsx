import React from "react";
import { StatusChip } from "@/components/ui";
import { getUserTierBadgeMeta } from "../schemas";

export interface UserTierChipProps {
  tier: string | null | undefined;
  size?: "sm" | "md";
}

export function UserTierChip({ tier, size = "sm" }: UserTierChipProps) {
  const meta = getUserTierBadgeMeta(tier);
  return <StatusChip tone={meta.tone} label={meta.label} dot={false} size={size} />;
}
