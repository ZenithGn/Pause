import { z } from "zod";
import { getPublicSupabaseClient } from "@/lib/supabase-public";
import type {
  CoverType,
  LayoutConfig,
  MembershipDurationType,
  PaperType,
  PrintPriceBreakdown,
  PublicMembershipTier,
  PublicTemplate,
} from "@/types/catalog";

/**
 * Local SVG sample photographs bundled in `public/samples/` for one-click 3D preview.
 */
export const SAMPLE_PHOTO_URLS = [
  "/samples/sample-1.svg",
  "/samples/sample-2.svg",
  "/samples/sample-3.svg",
  "/samples/sample-4.svg",
] as const;

const layoutSlotSchema = z.object({
  index: z.number().int().nonnegative(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const layoutTextSchema = z.object({
  content: z.string(),
  x: z.number(),
  y: z.number(),
  font_size: z.number().positive(),
  color: z.string(),
});

const layoutConfigSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  background_color: z.string().min(1),
  slots: z.array(layoutSlotSchema).min(1),
  texts: z.array(layoutTextSchema).default([]),
  frame_url: z.string().nullable().default(null),
});

/**
 * Six deterministic fallback photobooth templates matching the database seed layouts.
 */
export const FALLBACK_TEMPLATES: PublicTemplate[] = [
  {
    id: "tpl-classic-white",
    name: "Classic White",
    category: "couple",
    preview_url: "https://placehold.co/600x900/png?text=Classic+White",
    slot_count: 2,
    is_premium: false,
    is_active: true,
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#FFFFFF",
      slots: [
        { index: 0, x: 60, y: 120, width: 1080, height: 700 },
        { index: 1, x: 60, y: 900, width: 1080, height: 700 },
      ],
      texts: [{ content: "Pause", x: 600, y: 1700, font_size: 48, color: "#111111" }],
      frame_url: null,
    },
  },
  {
    id: "tpl-vintage-memories",
    name: "Vintage Memories",
    category: "friends",
    preview_url: "https://placehold.co/600x900/png?text=Vintage",
    slot_count: 4,
    is_premium: false,
    is_active: true,
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#F6EFE4",
      slots: [
        { index: 0, x: 60, y: 90, width: 520, height: 390 },
        { index: 1, x: 620, y: 90, width: 520, height: 390 },
        { index: 2, x: 60, y: 510, width: 520, height: 390 },
        { index: 3, x: 620, y: 510, width: 520, height: 390 },
      ],
      texts: [
        {
          content: "Vintage Memories",
          x: 600,
          y: 1700,
          font_size: 52,
          color: "#5B4636",
        },
      ],
      frame_url: null,
    },
  },
  {
    id: "tpl-minimal-strip",
    name: "Minimal Strip",
    category: "general",
    preview_url: "https://placehold.co/600x900/png?text=Minimal",
    slot_count: 3,
    is_premium: false,
    is_active: true,
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#FFFFFF",
      slots: [
        { index: 0, x: 100, y: 100, width: 1000, height: 440 },
        { index: 1, x: 100, y: 600, width: 1000, height: 440 },
        { index: 2, x: 100, y: 1100, width: 1000, height: 440 },
      ],
      texts: [{ content: "pause.", x: 600, y: 1720, font_size: 40, color: "#111111" }],
      frame_url: null,
    },
  },
  {
    id: "tpl-pastel-grid",
    name: "Pastel Grid",
    category: "friends",
    preview_url: "https://placehold.co/600x900/png?text=Pastel",
    slot_count: 4,
    is_premium: false,
    is_active: true,
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#FDE8EF",
      slots: [
        { index: 0, x: 60, y: 80, width: 520, height: 640 },
        { index: 1, x: 620, y: 80, width: 520, height: 640 },
        { index: 2, x: 60, y: 760, width: 520, height: 640 },
        { index: 3, x: 620, y: 760, width: 520, height: 640 },
      ],
      texts: [],
      frame_url: null,
    },
  },
  {
    id: "tpl-family-portrait",
    name: "Family Portrait",
    category: "family",
    preview_url: "https://placehold.co/600x900/png?text=Family",
    slot_count: 1,
    is_premium: false,
    is_active: true,
    layout_config: {
      width: 1200,
      height: 1200,
      background_color: "#F1F1F1",
      slots: [{ index: 0, x: 100, y: 100, width: 1000, height: 1000 }],
      texts: [{ content: "Gia đình", x: 600, y: 1150, font_size: 44, color: "#111111" }],
      frame_url: null,
    },
  },
  {
    id: "tpl-premium-gold",
    name: "Premium Gold",
    category: "couple",
    preview_url: "https://placehold.co/600x900/png?text=Premium",
    slot_count: 4,
    is_premium: true,
    is_active: true,
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#111111",
      slots: [
        { index: 0, x: 60, y: 80, width: 520, height: 620 },
        { index: 1, x: 620, y: 80, width: 520, height: 620 },
        { index: 2, x: 60, y: 740, width: 520, height: 620 },
        { index: 3, x: 620, y: 740, width: 520, height: 620 },
      ],
      texts: [
        { content: "PAUSE GOLD", x: 600, y: 1700, font_size: 56, color: "#D4AF37" },
      ],
      frame_url: null,
    },
  },
];

/**
 * Official 4 membership tiers displayed on Pause Web User.
 */
export const OFFICIAL_MEMBERSHIP_TIERS: PublicMembershipTier[] = [
  {
    id: "tier-free",
    name: "Free",
    description: "Khởi đầu nhẹ nhàng để cất giữ những khoảnh khắc đáng nhớ.",
    price_vnd: 0,
    duration_type: "yearly",
    drawer_limit_label: "3 ngăn kéo",
    storage_label: "Tối đa 50 ảnh / ngăn kéo",
    features: [
      "3 ngăn kéo kỷ niệm cá nhân",
      "Tối đa 50 ảnh mỗi ngăn kéo",
      "Chia sẻ ngăn kéo với bạn bè",
      "Sử dụng kho mẫu Photobooth cơ bản",
    ],
    access_premium_templates: false,
    is_free: true,
  },
  {
    id: "tier-pause-go",
    name: "PAUSE Go",
    description: "Mở rộng ngăn kéo và toàn bộ kho mẫu VIP dành cho người yêu chụp ảnh.",
    price_vnd: 30000,
    duration_type: "yearly",
    drawer_limit_label: "10 ngăn kéo",
    storage_label: "5 GB / năm",
    features: [
      "10 ngăn kéo kỷ niệm riêng biệt",
      "5 GB dung lượng lưu trữ / năm",
      "Mở khóa 100% kho mẫu VIP Templates",
      "Lưu ảnh chất lượng cao, không nén mất nét",
    ],
    access_premium_templates: true,
  },
  {
    id: "tier-pause-plus",
    name: "PAUSE Plus",
    description: "Lựa chọn cân đối nhất cho cặp đôi và nhóm bạn lưu giữ suốt năm dài.",
    price_vnd: 55000,
    duration_type: "yearly",
    drawer_limit_label: "25 ngăn kéo",
    storage_label: "10 GB / năm",
    features: [
      "25 ngăn kéo theo chủ đề & sự kiện",
      "10 GB dung lượng lưu trữ / năm",
      "Mở khóa 100% kho mẫu VIP Templates",
      "Chia sẻ không giới hạn thành viên cùng góp ảnh",
    ],
    access_premium_templates: true,
    is_popular: true,
  },
  {
    id: "tier-pause-premium",
    name: "PAUSE Premium",
    description: "Không gian lưu trữ tối đa kèm ưu đãi in ấn photobooth trọn vẹn.",
    price_vnd: 100000,
    duration_type: "yearly",
    drawer_limit_label: "50 ngăn kéo",
    storage_label: "20 GB / năm",
    features: [
      "50 ngăn kéo lưu trữ kỷ niệm dài lâu",
      "20 GB dung lượng lưu trữ / năm",
      "Mở khóa 100% kho mẫu VIP Templates",
      "Ưu đãi in ấn tối đa & hỗ trợ ưu tiên",
    ],
    access_premium_templates: true,
  },
];

const LEGACY_PLAN_NAMES = new Set(["basic", "premium", "basic yearly"]);

export interface RawMembershipPlanRow {
  id: string;
  name: string;
  description: string | null;
  price_vnd: number;
  duration_type: string;
  extra_drawers: number;
  extra_storage_bytes: number;
  access_premium_templates: boolean;
  is_active: boolean;
}

function formatStorageLabel(bytes: number, durationType: MembershipDurationType): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Dung lượng tiêu chuẩn";
  }
  const gb = bytes / (1024 * 1024 * 1024);
  const rounded = gb >= 1 ? `${Number(gb.toFixed(1))} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${rounded} / ${durationType === "monthly" ? "tháng" : "năm"}`;
}

/**
 * Filters out legacy seed plan rows (`Basic`, `Premium` 99k monthly, `Basic Yearly`)
 * while preserving official `PAUSE Go/Plus/Premium` plans and any new active plans added in `web-admin`.
 */
export function filterLegacyMembershipPlans(
  rows: RawMembershipPlanRow[]
): RawMembershipPlanRow[] {
  return rows.filter((row) => {
    if (!row.is_active) return false;
    const normalizedName = row.name.trim().toLowerCase();
    return !LEGACY_PLAN_NAMES.has(normalizedName);
  });
}

/**
 * Merges live Supabase `membership_plans` rows with the 4 official Pause product tiers.
 */
export function buildPublicMembershipTiers(
  rows: RawMembershipPlanRow[]
): PublicMembershipTier[] {
  const filtered = filterLegacyMembershipPlans(rows);
  if (filtered.length === 0) {
    return OFFICIAL_MEMBERSHIP_TIERS;
  }

  const officialByName = new Map(
    OFFICIAL_MEMBERSHIP_TIERS.map((tier) => [tier.name.toLowerCase(), tier])
  );
  const matchedNames = new Set<string>();

  const mergedOfficial = OFFICIAL_MEMBERSHIP_TIERS.map((official) => {
    if (official.is_free) return official;

    const match = filtered.find(
      (row) => row.name.trim().toLowerCase() === official.name.toLowerCase()
    );
    if (!match) return official;

    matchedNames.add(match.name.trim().toLowerCase());
    const duration: MembershipDurationType =
      match.duration_type === "monthly" ? "monthly" : "yearly";

    return {
      ...official,
      id: match.id,
      description: match.description?.trim() || official.description,
      price_vnd: match.price_vnd,
      duration_type: duration,
      access_premium_templates: match.access_premium_templates,
    };
  });

  const extraActiveTiers: PublicMembershipTier[] = filtered
    .filter((row) => {
      const key = row.name.trim().toLowerCase();
      return !matchedNames.has(key) && !officialByName.has(key);
    })
    .map((row) => {
      const duration: MembershipDurationType =
        row.duration_type === "monthly" ? "monthly" : "yearly";
      const totalDrawers = 3 + Math.max(0, row.extra_drawers);
      const storageLabel = formatStorageLabel(row.extra_storage_bytes, duration);
      return {
        id: row.id,
        name: row.name,
        description:
          row.description?.trim() ||
          "Gói hội viên mở rộng dung lượng lưu trữ và mẫu Photobooth.",
        price_vnd: row.price_vnd,
        duration_type: duration,
        drawer_limit_label: `${totalDrawers} ngăn kéo`,
        storage_label: storageLabel,
        features: [
          `${totalDrawers} ngăn kéo lưu trữ kỷ niệm`,
          storageLabel,
          row.access_premium_templates
            ? "Mở khóa 100% kho mẫu VIP Templates"
            : "Kho mẫu Photobooth tiêu chuẩn",
        ],
        access_premium_templates: row.access_premium_templates,
      };
    });

  return [...mergedOfficial, ...extraActiveTiers];
}

/**
 * Fetches active photobooth templates from Supabase anon client, with automatic fallback.
 */
export async function getPublicTemplates(): Promise<PublicTemplate[]> {
  const client = getPublicSupabaseClient();
  if (!client) {
    return FALLBACK_TEMPLATES;
  }

  try {
    const { data, error } = await client
      .from("photobooth_templates")
      .select("id, name, category, preview_url, slot_count, is_premium, is_active, layout_config")
      .eq("is_active", true)
      .order("is_premium", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_TEMPLATES;
    }

    const parsed: PublicTemplate[] = [];
    for (const row of data) {
      const layoutResult = layoutConfigSchema.safeParse(row.layout_config);
      if (!layoutResult.success) continue;

      const layoutConfig: LayoutConfig = layoutResult.data;
      parsed.push({
        id: String(row.id),
        name: String(row.name),
        category: String(row.category || "general"),
        preview_url: String(row.preview_url || ""),
        slot_count: Number(row.slot_count) || layoutConfig.slots.length,
        is_premium: Boolean(row.is_premium),
        is_active: Boolean(row.is_active),
        layout_config: layoutConfig,
      });
    }

    return parsed.length > 0 ? parsed : FALLBACK_TEMPLATES;
  } catch {
    return FALLBACK_TEMPLATES;
  }
}

/**
 * Fetches active membership plans from Supabase anon client, filtering out legacy plans
 * and falling back to the 4 official Pause tiers.
 */
export async function getPublicMembershipTiers(): Promise<PublicMembershipTier[]> {
  const client = getPublicSupabaseClient();
  if (!client) {
    return OFFICIAL_MEMBERSHIP_TIERS;
  }

  try {
    const { data, error } = await client
      .from("membership_plans")
      .select(
        "id, name, description, price_vnd, duration_type, extra_drawers, extra_storage_bytes, access_premium_templates, is_active"
      )
      .eq("is_active", true)
      .order("price_vnd", { ascending: true });

    if (error || !data) {
      return OFFICIAL_MEMBERSHIP_TIERS;
    }

    return buildPublicMembershipTiers(data as RawMembershipPlanRow[]);
  } catch {
    return OFFICIAL_MEMBERSHIP_TIERS;
  }
}

/**
 * Computes an itemized print price breakdown in VND.
 */
export function calculatePrintPriceBreakdown(
  slotCount: number,
  coverType: CoverType,
  paperType: PaperType
): PrintPriceBreakdown {
  const safeSlots = Math.max(1, Math.min(8, Math.floor(Number.isFinite(slotCount) ? slotCount : 1)));
  const baseVnd = 20_000 + (safeSlots - 1) * 3_000;
  const coverSurchargeVnd = coverType === "hard" ? 15_000 : 0;
  const paperSurchargeVnd = paperType === "premium" ? 10_000 : 0;

  return {
    baseVnd,
    coverSurchargeVnd,
    paperSurchargeVnd,
    totalVnd: baseVnd + coverSurchargeVnd + paperSurchargeVnd,
  };
}

/**
 * Estimates total print price in VND based on slot count, cover type, and paper type.
 */
export function estimatePrintPriceVnd(
  slotCount: number,
  coverType: CoverType,
  paperType: PaperType
): number {
  return calculatePrintPriceBreakdown(slotCount, coverType, paperType).totalVnd;
}

/**
 * Formats an integer VND amount using Vietnamese dot separators (e.g. `30.000đ`).
 */
export function formatVnd(amount: number): string {
  const rounded = Math.max(0, Math.round(amount));
  return `${rounded.toLocaleString("vi-VN")}đ`;
}
