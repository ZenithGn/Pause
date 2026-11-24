import { describe, expect, it } from "vitest";
import {
  buildPublicMembershipTiers,
  estimatePrintPriceVnd,
  FALLBACK_TEMPLATES,
  filterLegacyMembershipPlans,
  formatVnd,
  OFFICIAL_MEMBERSHIP_TIERS,
  SAMPLE_PHOTO_URLS,
  type RawMembershipPlanRow,
} from "@/lib/catalog-data";
import { computeCenterCropRect, formatEditorialDate } from "@/lib/template-canvas";

describe("computeCenterCropRect", () => {
  it("crops horizontally when source image is wider than slot", () => {
    const rect = computeCenterCropRect(1600, 800, 500, 500);
    expect(rect).toEqual({
      sx: 400,
      sy: 0,
      sw: 800,
      sh: 800,
    });
  });

  it("crops vertically when source image is taller than slot", () => {
    const rect = computeCenterCropRect(800, 1600, 800, 400);
    expect(rect).toEqual({
      sx: 0,
      sy: 600,
      sw: 800,
      sh: 400,
    });
  });

  it("returns full frame when aspect ratios match", () => {
    const rect = computeCenterCropRect(1200, 900, 400, 300);
    expect(rect).toEqual({
      sx: 0,
      sy: 0,
      sw: 1200,
      sh: 900,
    });
  });

  it("handles non-positive dimensions safely", () => {
    expect(computeCenterCropRect(0, 100, 100, 100)).toEqual({
      sx: 0,
      sy: 0,
      sw: 0,
      sh: 100,
    });
  });
});

describe("estimatePrintPriceVnd", () => {
  it("computes base price for 1-slot soft standard print", () => {
    expect(estimatePrintPriceVnd(1, "soft", "standard")).toBe(20_000);
  });

  it("adds slot, hard cover (+15k), and premium paper (+10k) surcharges", () => {
    expect(estimatePrintPriceVnd(4, "soft", "standard")).toBe(29_000);
    expect(estimatePrintPriceVnd(4, "hard", "standard")).toBe(44_000);
    expect(estimatePrintPriceVnd(4, "hard", "premium")).toBe(54_000);
  });

  it("formats VND cleanly", () => {
    expect(formatVnd(0)).toBe("0đ");
    expect(formatVnd(55_000)).toBe("55.000đ");
  });
});

describe("fallback templates & sample assets", () => {
  it("provides the 6 deterministic seed templates", () => {
    expect(FALLBACK_TEMPLATES).toHaveLength(6);
    expect(FALLBACK_TEMPLATES.map((t) => t.id)).toEqual([
      "tpl-classic-white",
      "tpl-vintage-memories",
      "tpl-minimal-strip",
      "tpl-pastel-grid",
      "tpl-family-portrait",
      "tpl-premium-gold",
    ]);

    for (const template of FALLBACK_TEMPLATES) {
      expect(template.is_active).toBe(true);
      expect(template.layout_config.slots).toHaveLength(template.slot_count);
    }

    const vipTemplates = FALLBACK_TEMPLATES.filter((t) => t.is_premium);
    expect(vipTemplates.map((t) => t.id)).toEqual(["tpl-premium-gold"]);
  });

  it("exposes 4 local SVG sample photo paths", () => {
    expect(SAMPLE_PHOTO_URLS).toEqual([
      "/samples/sample-1.svg",
      "/samples/sample-2.svg",
      "/samples/sample-3.svg",
      "/samples/sample-4.svg",
    ]);
  });

  it("formats editorial date as DD/MM/YYYY", () => {
    expect(formatEditorialDate(new Date(2026, 10, 5))).toBe("05/11/2026");
  });
});

describe("official membership tier filtering", () => {
  const sampleRows: RawMembershipPlanRow[] = [
    {
      id: "legacy-1",
      name: "Basic",
      description: "Legacy basic",
      price_vnd: 49_000,
      duration_type: "monthly",
      extra_drawers: 5,
      extra_storage_bytes: 1_073_741_824,
      access_premium_templates: true,
      is_active: true,
    },
    {
      id: "legacy-2",
      name: "Premium",
      description: "Legacy premium",
      price_vnd: 99_000,
      duration_type: "monthly",
      extra_drawers: 15,
      extra_storage_bytes: 1_073_741_824,
      access_premium_templates: true,
      is_active: true,
    },
    {
      id: "legacy-3",
      name: "Basic Yearly",
      description: "Legacy basic yearly",
      price_vnd: 470_000,
      duration_type: "yearly",
      extra_drawers: 5,
      extra_storage_bytes: 1_073_741_824,
      access_premium_templates: true,
      is_active: true,
    },
    {
      id: "db-go",
      name: "PAUSE Go",
      description: "Gói Go live",
      price_vnd: 30_000,
      duration_type: "yearly",
      extra_drawers: 7,
      extra_storage_bytes: 5 * 1024 ** 3,
      access_premium_templates: true,
      is_active: true,
    },
    {
      id: "db-custom",
      name: "PAUSE Studio",
      description: "Gói mới thêm từ admin",
      price_vnd: 149_000,
      duration_type: "yearly",
      extra_drawers: 60,
      extra_storage_bytes: 30 * 1024 ** 3,
      access_premium_templates: true,
      is_active: true,
    },
  ];

  it("filters out legacy plans while keeping official PAUSE and new active plans", () => {
    const filtered = filterLegacyMembershipPlans(sampleRows);
    expect(filtered.map((r) => r.name)).toEqual(["PAUSE Go", "PAUSE Studio"]);
  });

  it("builds 4 official tiers by default and appends new non-legacy admin plans", () => {
    expect(OFFICIAL_MEMBERSHIP_TIERS.map((t) => [t.name, t.price_vnd])).toEqual([
      ["Free", 0],
      ["PAUSE Go", 30_000],
      ["PAUSE Plus", 55_000],
      ["PAUSE Premium", 100_000],
    ]);
    expect(OFFICIAL_MEMBERSHIP_TIERS.find((t) => t.name === "PAUSE Plus")?.is_popular).toBe(true);

    const built = buildPublicMembershipTiers(sampleRows);
    expect(built.map((t) => t.name)).toEqual([
      "Free",
      "PAUSE Go",
      "PAUSE Plus",
      "PAUSE Premium",
      "PAUSE Studio",
    ]);
    expect(built[1]?.id).toBe("db-go");
    expect(built[1]?.description).toBe("Gói Go live");
  });
});
