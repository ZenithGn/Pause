import type { LayoutConfig, LayoutSlot, TemplateCategory } from "@/types/admin";
import { layoutConfigSchema } from "../schemas";

export type TemplatePresetId = "strip-4" | "grid-2x2" | "polaroid-1" | "duo-2";

export interface TemplatePresetDefinition {
  id: TemplatePresetId;
  label: string;
  description: string;
  suggestedCategory: TemplateCategory;
  slotCount: number;
  buildLayout: () => LayoutConfig;
}

export const TEMPLATE_PRESETS: readonly TemplatePresetDefinition[] = [
  {
    id: "strip-4",
    label: "Dải 4 ảnh dọc",
    description: "Khung photobooth cổ điển 4 ảnh xếp dọc (600×1800)",
    suggestedCategory: "friends",
    slotCount: 4,
    buildLayout: () => ({
      width: 600,
      height: 1800,
      background_color: "#FFFFFF",
      slots: [
        { index: 0, x: 50, y: 60, width: 500, height: 350 },
        { index: 1, x: 50, y: 440, width: 500, height: 350 },
        { index: 2, x: 50, y: 820, width: 500, height: 350 },
        { index: 3, x: 50, y: 1200, width: 500, height: 350 },
      ],
      texts: [
        { content: "PAUSE STUDIO", x: 300, y: 1690, font_size: 36, color: "#111111" },
      ],
      frame_url: null,
    }),
  },
  {
    id: "grid-2x2",
    label: "Lưới 2×2",
    description: "4 khung ảnh đối xứng 2 hàng × 2 cột (1200×1800)",
    suggestedCategory: "friends",
    slotCount: 4,
    buildLayout: () => ({
      width: 1200,
      height: 1800,
      background_color: "#F6EFE4",
      slots: [
        { index: 0, x: 60, y: 90, width: 520, height: 640 },
        { index: 1, x: 620, y: 90, width: 520, height: 640 },
        { index: 2, x: 60, y: 770, width: 520, height: 640 },
        { index: 3, x: 620, y: 770, width: 520, height: 640 },
      ],
      texts: [
        { content: "PAUSE MEMORIES", x: 600, y: 1680, font_size: 48, color: "#630D11" },
      ],
      frame_url: null,
    }),
  },
  {
    id: "polaroid-1",
    label: "Polaroid 1 ảnh",
    description: "1 khung ảnh lớn viền dưới rộng kiểu Polaroid (1200×1500)",
    suggestedCategory: "general",
    slotCount: 1,
    buildLayout: () => ({
      width: 1200,
      height: 1500,
      background_color: "#F7F5F2",
      slots: [{ index: 0, x: 90, y: 90, width: 1020, height: 1080 }],
      texts: [
        { content: "PAUSE MEMORY", x: 600, y: 1360, font_size: 48, color: "#111111" },
      ],
      frame_url: null,
    }),
  },
  {
    id: "duo-2",
    label: "Khung đôi 2 ảnh",
    description: "2 khung ảnh ngang xếp dọc dành cho cặp đôi / bạn thân (1200×1800)",
    suggestedCategory: "couple",
    slotCount: 2,
    buildLayout: () => ({
      width: 1200,
      height: 1800,
      background_color: "#FFFFFF",
      slots: [
        { index: 0, x: 60, y: 120, width: 1080, height: 700 },
        { index: 1, x: 60, y: 900, width: 1080, height: 700 },
      ],
      texts: [
        { content: "You & Me", x: 600, y: 1710, font_size: 48, color: "#630D11" },
      ],
      frame_url: null,
    }),
  },
];

export function getPresetById(id: TemplatePresetId): TemplatePresetDefinition {
  const found = TEMPLATE_PRESETS.find((preset) => preset.id === id);
  if (!found) {
    throw new Error(`Unknown template preset: ${id}`);
  }
  return found;
}

/**
 * Returns a fresh validated LayoutConfig cloned from the selected preset.
 */
export function buildLayoutFromPreset(
  presetId: TemplatePresetId,
  preserveFrameUrl?: string | null,
): LayoutConfig {
  const preset = getPresetById(presetId);
  const raw = preset.buildLayout();
  const parsed = layoutConfigSchema.parse({
    ...raw,
    frame_url: preserveFrameUrl ?? raw.frame_url ?? null,
  });
  return parsed;
}

/**
 * Normalizes slot indices to contiguous 0..n-1 after add, remove, or reorder.
 */
export function reindexSlots(slots: LayoutSlot[]): LayoutSlot[] {
  return slots.map((slot, idx) => ({
    ...slot,
    index: idx,
  }));
}

/**
 * Snaps a coordinate or dimension to the nearest grid step (default 10px).
 */
export function snapToGrid(value: number, step = 10): number {
  if (step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

/**
 * Clamps a slot's position and size so it always remains strictly inside canvas bounds.
 */
export function clampSlotToCanvas(
  slot: LayoutSlot,
  canvasWidth: number,
  canvasHeight: number,
  minSize = 40,
): LayoutSlot {
  const safeCanvasW = Math.max(minSize, Math.round(canvasWidth));
  const safeCanvasH = Math.max(minSize, Math.round(canvasHeight));

  const width = Math.min(safeCanvasW, Math.max(minSize, Math.round(slot.width)));
  const height = Math.min(safeCanvasH, Math.max(minSize, Math.round(slot.height)));
  const x = Math.min(Math.max(0, Math.round(slot.x)), safeCanvasW - width);
  const y = Math.min(Math.max(0, Math.round(slot.y)), safeCanvasH - height);

  return {
    ...slot,
    x,
    y,
    width,
    height,
  };
}
