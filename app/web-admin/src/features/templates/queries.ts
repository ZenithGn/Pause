import { requireAdmin } from "@/lib/auth/require-admin";
import { isMockAdminMode } from "@/lib/env";
import { getTotalPages } from "@/lib/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LayoutConfig,
  LayoutSlot,
  LayoutText,
  PaginatedResult,
  TemplateDetail,
  TemplateSummary,
} from "@/types/admin";
import type { Json } from "@/types/database";
import { getMockTemplatesStore } from "./mock-store";

export type TemplateTierFilter = "" | "free" | "vip";
export type TemplateStatusFilter = "" | "active" | "inactive";

export interface TemplateListFilters {
  q?: string;
  category?: string;
  tier?: TemplateTierFilter;
  status?: TemplateStatusFilter;
  page: number;
  pageSize: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

export function normalizeLayoutConfig(
  raw: Json | Record<string, unknown> | null | undefined,
  fallbackSlotCount = 1,
): LayoutConfig {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const width =
    typeof obj.width === "number" && Number.isFinite(obj.width) && obj.width > 0
      ? Math.round(obj.width)
      : 1200;
  const height =
    typeof obj.height === "number" && Number.isFinite(obj.height) && obj.height > 0
      ? Math.round(obj.height)
      : 1800;

  const rawSlots = Array.isArray(obj.slots) ? obj.slots : [];
  const slots: LayoutSlot[] = rawSlots
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      index:
        typeof item.index === "number" && Number.isInteger(item.index) && item.index >= 0
          ? item.index
          : idx,
      x: typeof item.x === "number" && Number.isFinite(item.x) ? Math.max(0, Math.round(item.x)) : 60,
      y:
        typeof item.y === "number" && Number.isFinite(item.y)
          ? Math.max(0, Math.round(item.y))
          : 60 + idx * 420,
      width:
        typeof item.width === "number" && Number.isFinite(item.width) && item.width > 0
          ? Math.round(item.width)
          : Math.max(100, width - 120),
      height:
        typeof item.height === "number" && Number.isFinite(item.height) && item.height > 0
          ? Math.round(item.height)
          : 360,
    }))
    .sort((a, b) => a.index - b.index);

  if (slots.length === 0) {
    const count = Math.max(1, fallbackSlotCount);
    const padding = 60;
    const gap = 30;
    const slotHeight = Math.max(
      120,
      Math.floor((height - padding * 2 - gap * (count - 1)) / count),
    );
    for (let i = 0; i < count; i += 1) {
      slots.push({
        index: i,
        x: padding,
        y: padding + i * (slotHeight + gap),
        width: Math.max(120, width - padding * 2),
        height: slotHeight,
      });
    }
  }

  const rawTexts = Array.isArray(obj.texts) ? obj.texts : [];
  const texts: LayoutText[] = rawTexts
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      content: typeof item.content === "string" ? item.content : "Pause",
      x:
        typeof item.x === "number" && Number.isFinite(item.x)
          ? Math.max(0, Math.round(item.x))
          : Math.round(width / 2),
      y:
        typeof item.y === "number" && Number.isFinite(item.y)
          ? Math.max(0, Math.round(item.y))
          : Math.max(40, height - 100),
      font_size:
        typeof item.font_size === "number" &&
        Number.isFinite(item.font_size) &&
        item.font_size > 0
          ? Math.round(item.font_size)
          : 44,
      color: normalizeHexColor(item.color, "#111111"),
    }));

  const frameUrl =
    typeof obj.frame_url === "string" && obj.frame_url.trim().length > 0
      ? obj.frame_url.trim()
      : null;

  return {
    width,
    height,
    background_color: normalizeHexColor(obj.background_color, "#FFFFFF"),
    slots,
    texts,
    frame_url: frameUrl,
  };
}

export async function listTemplates(
  filters: TemplateListFilters,
): Promise<PaginatedResult<TemplateSummary>> {
  await requireAdmin();

  const search = filters.q?.trim() || null;
  const category = filters.category?.trim() || null;
  const isPremium =
    filters.tier === "vip" ? true : filters.tier === "free" ? false : null;
  const isActive =
    filters.status === "active"
      ? true
      : filters.status === "inactive"
        ? false
        : null;

  const offset = (filters.page - 1) * filters.pageSize;

  if (isMockAdminMode()) {
    const store = getMockTemplatesStore();
    const filtered = store
      .filter((item) => {
        if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (category && item.category.toLowerCase() !== category.toLowerCase()) {
          return false;
        }
        if (isPremium !== null && item.is_premium !== isPremium) {
          return false;
        }
        if (isActive !== null && item.is_active !== isActive) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    const totalCount = filtered.length;
    const paged = filtered
      .slice(offset, offset + filters.pageSize)
      .map(({ layout_config: _layout, created_at: _created, ...summary }) => summary);

    return {
      items: paged,
      totalCount,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: getTotalPages(totalCount, filters.pageSize),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_templates", {
    p_search: search,
    p_category: category,
    p_is_premium: isPremium,
    p_is_active: isActive,
    p_limit: filters.pageSize,
    p_offset: offset,
  });

  if (error) {
    throw new Error(`Không thể tải danh sách template: ${error.message}`);
  }

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      preview_url: row.preview_url,
      slot_count: row.slot_count,
      is_premium: row.is_premium,
      is_active: row.is_active,
      usage_count: Number(row.usage_count ?? 0),
      updated_at: row.updated_at,
      total_count: Number(row.total_count ?? totalCount),
    })),
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: getTotalPages(totalCount, filters.pageSize),
  };
}

export async function getTemplateById(id: string): Promise<TemplateDetail | null> {
  await requireAdmin();

  if (!UUID_REGEX.test(id)) {
    return null;
  }

  if (isMockAdminMode()) {
    const store = getMockTemplatesStore();
    const found = store.find((item) => item.id === id);
    return found ? { ...found } : null;
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: row, error: rowError }, { count: usageCount }] = await Promise.all([
    supabase.from("photobooth_templates").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("photobooth_items")
      .select("id", { count: "exact", head: true })
      .eq("template_id", id),
  ]);

  if (rowError) {
    throw new Error(`Không thể tải chi tiết template: ${rowError.message}`);
  }

  if (!row) {
    return null;
  }

  const layoutConfig = normalizeLayoutConfig(row.layout_config, row.slot_count);

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    preview_url: row.preview_url,
    slot_count: layoutConfig.slots.length,
    is_premium: row.is_premium,
    is_active: row.is_active,
    usage_count: usageCount ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    layout_config: layoutConfig,
  };
}
