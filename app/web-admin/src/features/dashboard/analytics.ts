import type {
  MembershipDistributionItem,
  OrderStatus,
  OrderStatusCount,
  RevenueSeriesPoint,
} from "@/types/admin";
import {
  formatBucketFullLabel,
  formatBucketShortLabel,
  type RevenueGranularity,
} from "./date-range";

/**
 * Chart colors validated via dataviz/scripts/validate_palette.js against #ffffff surface:
 * - Revenue dual-series (#a3222b & #2a78d6): L in 0.43..0.77, C >= 0.10, CVD Delta E = 25.4, contrast >= 3:1
 * - Membership ordinal paid ramp (#d7787e -> #a3222b -> #630d11): monotone L, Delta L >= 0.06, light >= 3.05:1
 */
export const REVENUE_SERIES_COLORS = {
  print: "#a3222b",
  membership: "#2a78d6",
} as const;

export const CANONICAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "processing",
  "printing",
  "shipping",
  "completed",
  "cancelled",
] as const;

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; href: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    color: "#9a4d00",
    href: "/admin/orders?status=pending",
  },
  processing: {
    label: "Đang xử lý",
    color: "#0b57d0",
    href: "/admin/orders?status=processing",
  },
  printing: {
    label: "Đang in",
    color: "#630d11",
    href: "/admin/orders?status=printing",
  },
  shipping: {
    label: "Đang giao",
    color: "#0f766e",
    href: "/admin/orders?status=shipping",
  },
  completed: {
    label: "Hoàn thành",
    color: "#146c2e",
    href: "/admin/orders?status=completed",
  },
  cancelled: {
    label: "Đã hủy",
    color: "#b3261e",
    href: "/admin/orders?status=cancelled",
  },
};

const MEMBERSHIP_COLOR_BY_KEY: Record<string, string> = {
  free: "#76706b",
  "pause go": "#d7787e",
  "pause plus": "#a3222b",
  "pause premium": "#630d11",
};

const EXTRA_PLAN_COLORS = ["#2a78d6", "#5c4033", "#0f766e", "#9a4d00"] as const;

export function getMembershipPlanColor(planName: string, fallbackIndex = 0): string {
  const normalized = planName.trim().toLowerCase();
  return (
    MEMBERSHIP_COLOR_BY_KEY[normalized] ??
    EXTRA_PLAN_COLORS[fallbackIndex % EXTRA_PLAN_COLORS.length]
  );
}

export type DeltaDirection = "up" | "down" | "flat";

export interface PercentageDeltaResult {
  current: number;
  previous: number;
  deltaAmount: number;
  percent: number | null;
  direction: DeltaDirection;
}

/**
 * Computes signed percentage delta between current and previous periods.
 * Returns percent = null when previous === 0 and current > 0 to avoid dividing by zero.
 */
export function calculatePercentageDelta(
  current: number,
  previous: number,
): PercentageDeltaResult {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;
  const deltaAmount = safeCurrent - safePrevious;

  if (safePrevious <= 0) {
    if (safeCurrent <= 0) {
      return {
        current: safeCurrent,
        previous: safePrevious,
        deltaAmount: 0,
        percent: 0,
        direction: "flat",
      };
    }
    return {
      current: safeCurrent,
      previous: safePrevious,
      deltaAmount,
      percent: null,
      direction: "up",
    };
  }

  const rawPercent = (deltaAmount / safePrevious) * 100;
  const rounded = Math.round(rawPercent * 10) / 10;

  let direction: DeltaDirection = "flat";
  if (rounded > 0.05) direction = "up";
  else if (rounded < -0.05) direction = "down";

  return {
    current: safeCurrent,
    previous: safePrevious,
    deltaAmount,
    percent: Object.is(rounded, -0) ? 0 : rounded,
    direction,
  };
}

export interface ChartNiceScale {
  max: number;
  step: number;
  ticks: number[];
}

/**
 * Computes clean human-readable Y-axis bounds and ticks covering [0, rawMax].
 */
export function computeNiceScale(rawMax: number, tickIntervals = 4): ChartNiceScale {
  const safeIntervals = Math.max(2, Math.floor(tickIntervals));
  const safeMax = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 0;

  if (safeMax === 0) {
    const defaultStep = 25_000;
    const ticks = Array.from({ length: safeIntervals + 1 }, (_, idx) => idx * defaultStep);
    return {
      max: defaultStep * safeIntervals,
      step: defaultStep,
      ticks,
    };
  }

  const roughStep = safeMax / safeIntervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  const niceFactors = [1, 2, 2.5, 5, 10];
  const factor = niceFactors.find((candidate) => candidate >= normalized) ?? 10;
  const step = Math.max(1, factor * magnitude);
  const max = step * safeIntervals;
  const ticks = Array.from({ length: safeIntervals + 1 }, (_, idx) => Math.round(idx * step));

  return {
    max,
    step,
    ticks,
  };
}

/**
 * Formats Y-axis VND ticks concisely (e.g. "0", "250 K", "1,5 tr", "2 tỷ").
 */
export function formatCompactVndTick(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000_000) {
    const ty = Number((value / 1_000_000_000).toFixed(1));
    return `${String(ty).replace(".", ",")} tỷ`;
  }
  if (value >= 1_000_000) {
    const tr = Number((value / 1_000_000).toFixed(1));
    return `${String(tr).replace(".", ",")} tr`;
  }
  if (value >= 1_000) {
    const k = Math.round(value / 1_000);
    return `${k} K`;
  }
  return String(Math.round(value));
}

export interface OrderStatusBreakdownItem {
  status: OrderStatus;
  label: string;
  count: number;
  percentage: number;
  widthPercent: number;
  color: string;
  href: string;
}

export interface OrderStatusBreakdownSummary {
  totalOrders: number;
  items: OrderStatusBreakdownItem[];
}

/**
 * Normalizes order status counts into canonical workflow order with rounded percentages.
 */
export function calculateOrderStatusBreakdown(
  rows: OrderStatusCount[],
): OrderStatusBreakdownSummary {
  const countsByStatus = new Map<OrderStatus, number>();
  for (const status of CANONICAL_ORDER_STATUSES) {
    countsByStatus.set(status, 0);
  }

  for (const row of rows) {
    if (row.status in ORDER_STATUS_META) {
      const prev = countsByStatus.get(row.status) ?? 0;
      const count = Number.isFinite(row.count) && row.count > 0 ? Math.round(row.count) : 0;
      countsByStatus.set(row.status, prev + count);
    }
  }

  const totalOrders = Array.from(countsByStatus.values()).reduce((sum, cnt) => sum + cnt, 0);

  const items: OrderStatusBreakdownItem[] = CANONICAL_ORDER_STATUSES.map((status) => {
    const count = countsByStatus.get(status) ?? 0;
    const meta = ORDER_STATUS_META[status];
    const widthPercent = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
    const percentage = totalOrders > 0 ? Math.round(widthPercent * 10) / 10 : 0;

    return {
      status,
      label: meta.label,
      count,
      percentage,
      widthPercent,
      color: meta.color,
      href: meta.href,
    };
  });

  return { totalOrders, items };
}

export interface MembershipDistributionRow {
  plan_name: string;
  active_count: number;
  percentage: number;
  widthPercent: number;
  isFree: boolean;
  color: string;
  href: string;
}

export interface MembershipDistributionSummary {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  paidRatePercent: number;
  items: MembershipDistributionRow[];
}

/**
 * Computes membership tier distribution shares (including Free tier) and conversion rate.
 */
export function calculateMembershipDistribution(
  rows: MembershipDistributionItem[],
): MembershipDistributionSummary {
  const sanitized = rows.map((row) => ({
    plan_name: row.plan_name.trim() || "Khác",
    active_count:
      Number.isFinite(row.active_count) && row.active_count > 0
        ? Math.round(row.active_count)
        : 0,
  }));

  const totalUsers = sanitized.reduce((sum, item) => sum + item.active_count, 0);
  let paidUsers = 0;
  let freeUsers = 0;

  for (const item of sanitized) {
    if (item.plan_name.toLowerCase() === "free") {
      freeUsers += item.active_count;
    } else {
      paidUsers += item.active_count;
    }
  }

  const paidRatePercent =
    totalUsers > 0 ? Math.round(((paidUsers / totalUsers) * 100) * 10) / 10 : 0;

  let extraColorIndex = 0;
  const items: MembershipDistributionRow[] = sanitized.map((item) => {
    const isFree = item.plan_name.toLowerCase() === "free";
    const widthPercent = totalUsers > 0 ? (item.active_count / totalUsers) * 100 : 0;
    const percentage = totalUsers > 0 ? Math.round(widthPercent * 10) / 10 : 0;
    const color = getMembershipPlanColor(item.plan_name, extraColorIndex);
    if (!(item.plan_name.toLowerCase() in MEMBERSHIP_COLOR_BY_KEY)) {
      extraColorIndex += 1;
    }

    return {
      plan_name: item.plan_name,
      active_count: item.active_count,
      percentage,
      widthPercent,
      isFree,
      color,
      href: isFree
        ? "/admin/users?tier=free"
        : "/admin/membership/subscribers?status=active",
    };
  });

  return {
    totalUsers,
    paidUsers,
    freeUsers,
    paidRatePercent,
    items,
  };
}

export interface RevenueChartDimensions {
  width: number;
  height: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export const DEFAULT_REVENUE_CHART_DIMS: RevenueChartDimensions = {
  width: 760,
  height: 280,
  paddingTop: 18,
  paddingRight: 20,
  paddingBottom: 38,
  paddingLeft: 62,
};

export interface RevenueChartPointGeometry {
  index: number;
  bucket: string;
  shortLabel: string;
  fullLabel: string;
  printRevenueVnd: number;
  membershipRevenueVnd: number;
  totalRevenueVnd: number;
  orderCount: number;
  x: number;
  printY: number;
  membershipY: number;
  hitX: number;
  hitWidth: number;
  showXAxisLabel: boolean;
}

export interface RevenueChartYTicks {
  value: number;
  label: string;
  y: number;
}

export interface RevenueChartModel {
  dimensions: RevenueChartDimensions;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  plotWidth: number;
  plotHeight: number;
  scale: ChartNiceScale;
  yTicks: RevenueChartYTicks[];
  points: RevenueChartPointGeometry[];
  printLinePath: string;
  membershipLinePath: string;
  printAreaPath: string;
  membershipAreaPath: string;
  totalPrintRevenue: number;
  totalMembershipRevenue: number;
  totalRevenue: number;
  totalOrders: number;
}

/**
 * Selects evenly distributed X-axis label indices so labels remain readable without overlap.
 */
export function selectXAxisLabelIndices(totalPoints: number, maxLabels = 7): Set<number> {
  const visible = new Set<number>();
  if (totalPoints <= 0) return visible;
  if (totalPoints <= maxLabels) {
    for (let i = 0; i < totalPoints; i += 1) visible.add(i);
    return visible;
  }

  const step = Math.ceil((totalPoints - 1) / Math.max(1, maxLabels - 1));
  for (let i = 0; i < totalPoints; i += step) {
    visible.add(i);
  }
  // Ensure the final bucket is shown without colliding with the previous label
  const lastIndex = totalPoints - 1;
  const prevAdded = Array.from(visible).pop() ?? 0;
  if (lastIndex - prevAdded < Math.max(1, Math.floor(step * 0.55))) {
    visible.delete(prevAdded);
  }
  visible.add(lastIndex);
  return visible;
}

/**
 * Builds deterministic SVG coordinate geometry for the dual-series VNĐ revenue chart.
 */
export function buildRevenueChartModel(
  series: RevenueSeriesPoint[],
  granularity: RevenueGranularity,
  dims: RevenueChartDimensions = DEFAULT_REVENUE_CHART_DIMS,
): RevenueChartModel {
  const plotLeft = dims.paddingLeft;
  const plotRight = dims.width - dims.paddingRight;
  const plotTop = dims.paddingTop;
  const plotBottom = dims.height - dims.paddingBottom;
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const plotHeight = Math.max(1, plotBottom - plotTop);

  let maxRevenue = 0;
  let totalPrintRevenue = 0;
  let totalMembershipRevenue = 0;
  let totalOrders = 0;

  for (const row of series) {
    const printVal = Math.max(0, Number(row.print_revenue_vnd) || 0);
    const membershipVal = Math.max(0, Number(row.membership_revenue_vnd) || 0);
    const orderCnt = Math.max(0, Number(row.order_count) || 0);
    maxRevenue = Math.max(maxRevenue, printVal, membershipVal);
    totalPrintRevenue += printVal;
    totalMembershipRevenue += membershipVal;
    totalOrders += orderCnt;
  }

  const scale = computeNiceScale(maxRevenue, 4);
  const valueToY = (val: number): number => {
    const ratio = scale.max > 0 ? Math.min(1, Math.max(0, val / scale.max)) : 0;
    return Number((plotBottom - ratio * plotHeight).toFixed(2));
  };

  const yTicks: RevenueChartYTicks[] = scale.ticks.map((value) => ({
    value,
    label: formatCompactVndTick(value),
    y: valueToY(value),
  }));

  const count = series.length;
  const labelIndices = selectXAxisLabelIndices(count, 7);
  const slotStep = count > 1 ? plotWidth / (count - 1) : plotWidth;

  const points: RevenueChartPointGeometry[] = series.map((row, index) => {
    const printRevenueVnd = Math.max(0, Number(row.print_revenue_vnd) || 0);
    const membershipRevenueVnd = Math.max(0, Number(row.membership_revenue_vnd) || 0);
    const orderCount = Math.max(0, Number(row.order_count) || 0);

    const x =
      count === 1
        ? Number((plotLeft + plotWidth / 2).toFixed(2))
        : Number((plotLeft + index * slotStep).toFixed(2));

    const prevX =
      index === 0
        ? plotLeft
        : count === 1
          ? plotLeft
          : plotLeft + (index - 0.5) * slotStep;
    const nextX =
      index === count - 1
        ? plotRight
        : count === 1
          ? plotRight
          : plotLeft + (index + 0.5) * slotStep;

    return {
      index,
      bucket: row.bucket,
      shortLabel: formatBucketShortLabel(row.bucket, granularity),
      fullLabel: formatBucketFullLabel(row.bucket, granularity),
      printRevenueVnd,
      membershipRevenueVnd,
      totalRevenueVnd: printRevenueVnd + membershipRevenueVnd,
      orderCount,
      x,
      printY: valueToY(printRevenueVnd),
      membershipY: valueToY(membershipRevenueVnd),
      hitX: Number(prevX.toFixed(2)),
      hitWidth: Number(Math.max(8, nextX - prevX).toFixed(2)),
      showXAxisLabel: labelIndices.has(index),
    };
  });

  const buildLinePath = (coords: Array<{ x: number; y: number }>): string => {
    if (coords.length === 0) return "";
    return coords
      .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
      .join(" ");
  };

  const buildAreaPath = (coords: Array<{ x: number; y: number }>): string => {
    if (coords.length < 2) return "";
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${buildLinePath(coords)} L ${last.x} ${plotBottom} L ${first.x} ${plotBottom} Z`;
  };

  const printCoords = points.map((p) => ({ x: p.x, y: p.printY }));
  const membershipCoords = points.map((p) => ({ x: p.x, y: p.membershipY }));

  return {
    dimensions: dims,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    plotWidth,
    plotHeight,
    scale,
    yTicks,
    points,
    printLinePath: buildLinePath(printCoords),
    membershipLinePath: buildLinePath(membershipCoords),
    printAreaPath: buildAreaPath(printCoords),
    membershipAreaPath: buildAreaPath(membershipCoords),
    totalPrintRevenue,
    totalMembershipRevenue,
    totalRevenue: totalPrintRevenue + totalMembershipRevenue,
    totalOrders,
  };
}
