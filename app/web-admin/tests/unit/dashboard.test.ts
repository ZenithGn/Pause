import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildRevenueChartModel,
  calculateMembershipDistribution,
  calculateOrderStatusBreakdown,
  calculatePercentageDelta,
  computeNiceScale,
  formatCompactVndTick,
} from "@/features/dashboard/analytics";
import { DashboardWidgetErrorBoundary } from "@/features/dashboard/components/DashboardWidgetErrorBoundary";
import { MembershipDistributionClient } from "@/features/dashboard/components/MembershipDistributionClient";
import { OrderStatusClient } from "@/features/dashboard/components/OrderStatusClient";
import { RevenueChartClient } from "@/features/dashboard/components/RevenueChartClient";
import {
  buildDashboardHref,
  formatBucketFullLabel,
  formatBucketShortLabel,
  getIsoWeekBucketStart,
  getPresetRange,
  getVietnamTodayIso,
  isValidIsoDate,
  parseDashboardSearchParams,
} from "@/features/dashboard/date-range";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Dashboard VN timezone date-range helpers", () => {
  it("resolves today's calendar date in Asia/Ho_Chi_Minh across UTC day boundary", () => {
    // 2026-11-20 16:59:59 UTC == 2026-11-20 23:59:59 +07:00
    expect(getVietnamTodayIso(new Date("2026-11-20T16:59:59.000Z"))).toBe("2026-11-20");
    // 2026-11-20 17:00:00 UTC == 2026-11-21 00:00:00 +07:00
    expect(getVietnamTodayIso(new Date("2026-11-20T17:00:00.000Z"))).toBe("2026-11-21");
  });

  it("computes inclusive preset ranges (7d, 30d, month) in VN timezone", () => {
    const fixedNow = new Date("2026-11-20T18:30:00.000Z"); // 2026-11-21 01:30 VN

    expect(getPresetRange("7d", fixedNow)).toEqual({
      from: "2026-11-15",
      to: "2026-11-21",
    });

    expect(getPresetRange("30d", fixedNow)).toEqual({
      from: "2026-10-23",
      to: "2026-11-21",
    });

    expect(getPresetRange("month", fixedNow)).toEqual({
      from: "2026-11-01",
      to: "2026-11-21",
    });
  });

  it("parses search params with defaults, custom date normalization, and equal-length prev period", () => {
    const fixedNow = new Date("2026-11-20T10:00:00.000Z"); // 2026-11-20 17:00 VN

    const defaultRange = parseDashboardSearchParams({}, fixedNow);
    expect(defaultRange).toEqual({
      preset: "30d",
      from: "2026-10-22",
      to: "2026-11-20",
      granularity: "day",
      prevFrom: "2026-09-22",
      prevTo: "2026-10-21",
      dayCount: 30,
    });

    const sevenDayWeek = parseDashboardSearchParams(
      { preset: "7d", granularity: "week" },
      fixedNow,
    );
    expect(sevenDayWeek).toEqual({
      preset: "7d",
      from: "2026-11-14",
      to: "2026-11-20",
      granularity: "week",
      prevFrom: "2026-11-07",
      prevTo: "2026-11-13",
      dayCount: 7,
    });

    // Reversed custom dates are swapped safely
    const swappedCustom = parseDashboardSearchParams(
      { preset: "custom", from: "2026-11-10", to: "2026-11-01", granularity: "month" },
      fixedNow,
    );
    expect(swappedCustom).toEqual({
      preset: "custom",
      from: "2026-11-01",
      to: "2026-11-10",
      granularity: "month",
      prevFrom: "2026-10-22",
      prevTo: "2026-10-31",
      dayCount: 10,
    });
  });

  it("validates calendar dates strictly and rejects impossible dates", () => {
    expect(isValidIsoDate("2026-11-20")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("invalid")).toBe(false);

    const fallback = parseDashboardSearchParams(
      { preset: "custom", from: "2026-02-30", to: "not-a-date" },
      new Date("2026-11-20T10:00:00.000Z"),
    );
    expect(fallback.preset).toBe("30d");
    expect(fallback.from).toBe("2026-10-22");
    expect(fallback.to).toBe("2026-11-20");
  });

  it("formats bucket labels and week starts cleanly without timezone shift", () => {
    expect(formatBucketShortLabel("2026-11-20", "day")).toBe("20/11");
    expect(formatBucketShortLabel("2026-11-01", "month")).toBe("11/2026");
    expect(formatBucketFullLabel("2026-11-16", "week")).toBe("Tuần từ 16/11/2026");
    expect(formatBucketFullLabel("2026-11-01", "month")).toBe("Tháng 11/2026");
    expect(getIsoWeekBucketStart("2026-11-20")).toBe("2026-11-16"); // Friday -> Monday
    expect(
      buildDashboardHref({
        preset: "7d",
        from: "2026-11-14",
        to: "2026-11-20",
        granularity: "day",
      }),
    ).toBe("/admin?preset=7d&from=2026-11-14&to=2026-11-20&granularity=day");
  });
});

describe("Dashboard chart scaling, KPI delta & distribution analytics", () => {
  it("computes percentage deltas including zero-baseline edge cases", () => {
    expect(calculatePercentageDelta(120, 100)).toEqual({
      current: 120,
      previous: 100,
      deltaAmount: 20,
      percent: 20,
      direction: "up",
    });

    expect(calculatePercentageDelta(75, 100)).toEqual({
      current: 75,
      previous: 100,
      deltaAmount: -25,
      percent: -25,
      direction: "down",
    });

    expect(calculatePercentageDelta(50, 0)).toEqual({
      current: 50,
      previous: 0,
      deltaAmount: 50,
      percent: null,
      direction: "up",
    });

    expect(calculatePercentageDelta(0, 0)).toEqual({
      current: 0,
      previous: 0,
      deltaAmount: 0,
      percent: 0,
      direction: "flat",
    });
  });

  it("computes nice Y-axis scales and compact VND tick labels", () => {
    const zeroScale = computeNiceScale(0, 4);
    expect(zeroScale.max).toBe(100_000);
    expect(zeroScale.ticks).toEqual([0, 25_000, 50_000, 75_000, 100_000]);

    const midScale = computeNiceScale(720_000, 4);
    expect(midScale.max).toBe(800_000);
    expect(midScale.ticks).toEqual([0, 200_000, 400_000, 600_000, 800_000]);

    expect(formatCompactVndTick(0)).toBe("0");
    expect(formatCompactVndTick(250_000)).toBe("250 K");
    expect(formatCompactVndTick(1_500_000)).toBe("1,5 tr");
    expect(formatCompactVndTick(2_000_000_000)).toBe("2 tỷ");
  });

  it("builds dual-series SVG chart geometry accurately for multi-day and single-day inputs", () => {
    const model = buildRevenueChartModel(
      [
        {
          bucket: "2026-11-18",
          print_revenue_vnd: 200_000,
          membership_revenue_vnd: 100_000,
          order_count: 3,
        },
        {
          bucket: "2026-11-19",
          print_revenue_vnd: 720_000,
          membership_revenue_vnd: 300_000,
          order_count: 8,
        },
      ],
      "day",
    );

    expect(model.scale.max).toBe(800_000);
    expect(model.totalPrintRevenue).toBe(920_000);
    expect(model.totalMembershipRevenue).toBe(400_000);
    expect(model.totalRevenue).toBe(1_320_000);
    expect(model.totalOrders).toBe(11);
    expect(model.points).toHaveLength(2);
    expect(model.points[1].printY).toBeLessThan(model.points[0].printY);
    expect(model.printLinePath).toContain("M ");
    expect(model.membershipLinePath).toContain("L ");

    // Single-point edge case produces valid finite coordinates
    const singlePoint = buildRevenueChartModel(
      [
        {
          bucket: "2026-11-20",
          print_revenue_vnd: 450_000,
          membership_revenue_vnd: 150_000,
          order_count: 5,
        },
      ],
      "day",
    );
    expect(singlePoint.points).toHaveLength(1);
    expect(Number.isFinite(singlePoint.points[0].x)).toBe(true);
    expect(Number.isFinite(singlePoint.points[0].printY)).toBe(true);
  });

  it("calculates order status breakdown across all 6 canonical statuses", () => {
    const breakdown = calculateOrderStatusBreakdown([
      { status: "pending", count: 4 },
      { status: "completed", count: 16 },
    ]);

    expect(breakdown.totalOrders).toBe(20);
    expect(breakdown.items).toHaveLength(6);
    expect(breakdown.items.map((i) => i.status)).toEqual([
      "pending",
      "processing",
      "printing",
      "shipping",
      "completed",
      "cancelled",
    ]);
    expect(breakdown.items[0].percentage).toBe(20);
    expect(breakdown.items[4].percentage).toBe(80);
    expect(breakdown.items[1].percentage).toBe(0);

    const empty = calculateOrderStatusBreakdown([]);
    expect(empty.totalOrders).toBe(0);
    expect(empty.items.every((i) => i.percentage === 0)).toBe(true);
  });

  it("calculates membership distribution percentages including Free tier", () => {
    const dist = calculateMembershipDistribution([
      { plan_name: "Free", active_count: 300 },
      { plan_name: "PAUSE Go", active_count: 60 },
      { plan_name: "PAUSE Plus", active_count: 40 },
    ]);

    expect(dist.totalUsers).toBe(400);
    expect(dist.paidUsers).toBe(100);
    expect(dist.freeUsers).toBe(300);
    expect(dist.paidRatePercent).toBe(25);
    expect(dist.items[0]).toMatchObject({
      plan_name: "Free",
      percentage: 75,
      isFree: true,
      href: "/admin/users?tier=free",
    });
    expect(dist.items[1]).toMatchObject({
      plan_name: "PAUSE Go",
      percentage: 15,
      isFree: false,
      href: "/admin/membership/subscribers?status=active",
    });

    const emptyDist = calculateMembershipDistribution([]);
    expect(emptyDist.totalUsers).toBe(0);
    expect(emptyDist.paidRatePercent).toBe(0);
  });
});

describe("Dashboard UI widgets & error boundary isolation", () => {
  const sampleRange = parseDashboardSearchParams(
    { preset: "7d", from: "2026-11-14", to: "2026-11-20", granularity: "day" },
    new Date("2026-11-20T10:00:00.000Z"),
  );

  it("renders SVG revenue chart and toggles accessible table view", () => {
    render(
      React.createElement(RevenueChartClient, {
        range: sampleRange,
        series: [
          {
            bucket: "2026-11-19",
            print_revenue_vnd: 640_000,
            membership_revenue_vnd: 210_000,
            order_count: 8,
          },
          {
            bucket: "2026-11-20",
            print_revenue_vnd: 485_000,
            membership_revenue_vnd: 190_000,
            order_count: 7,
          },
        ],
      }),
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getAllByText("Doanh thu in ấn").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Doanh thu hội viên").length).toBeGreaterThanOrEqual(1);

    const firstBucket = screen.getByRole("button", {
      name: /19\/11\/2026: In ấn 640\.000 VNĐ/i,
    });
    fireEvent.mouseEnter(firstBucket);
    expect(screen.getByRole("status")).toHaveTextContent("8 đơn");

    const tableToggle = screen.getByRole("button", { name: /Bảng số liệu/i });
    fireEvent.click(tableToggle);
    expect(tableToggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).not.toHaveClass("sr-only");
    expect(screen.getByText("19/11/2026")).toBeInTheDocument();
    expect(screen.getByText("20/11/2026")).toBeInTheDocument();
  });

  it("renders order status breakdown and membership distribution with links and percentages", () => {
    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(OrderStatusClient, {
          range: sampleRange,
          counts: [
            { status: "pending", count: 5 },
            { status: "completed", count: 15 },
          ],
        }),
        React.createElement(MembershipDistributionClient, {
          items: [
            { plan_name: "Free", active_count: 75 },
            { plan_name: "PAUSE Plus", active_count: 25 },
          ],
        }),
      ),
    );

    expect(screen.getByText("20 đơn")).toBeInTheDocument();
    expect(screen.getAllByText("25%").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("75%").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("PAUSE Plus")).toBeInTheDocument();
  });

  it("isolates widget crashes via DashboardWidgetErrorBoundary", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const BrokenWidget = (): React.ReactElement => {
      throw new Error("Simulated RPC render failure");
    };

    render(
      React.createElement(DashboardWidgetErrorBoundary, {
        title: "Lỗi widget thử nghiệm",
        children: React.createElement(BrokenWidget),
      }),
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Lỗi widget thử nghiệm")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
