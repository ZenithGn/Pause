import { FALLBACK_TEMPLATES, SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import type { PublicTemplate } from "@/types/catalog";

export interface HeroCardPose {
  role: "front" | "right" | "left";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

const HERO_PREFERRED_CAPTIONS: Record<string, string> = {
  "tpl-classic-white": "Đà Lạt · 2026",
  "tpl-family-portrait": "Thanh xuân rực rỡ",
  "tpl-vintage-memories": "Chuyến đi đáng nhớ",
  "tpl-minimal-strip": "pause · studio",
  "tpl-pastel-grid": "Cuối tuần cùng nhau",
  "tpl-premium-gold": "PAUSE GOLD",
};

/**
 * Selects up to 3 visually distinct templates for the Hero 3D photobooth cluster:
 * 1) Classic/portrait strip, 2) Square Polaroid or vintage 4-slot, 3) VIP / gold template.
 */
export function selectHeroShowcaseTemplates(
  templates: readonly PublicTemplate[]
): PublicTemplate[] {
  const pool = templates.length > 0 ? templates : FALLBACK_TEMPLATES;
  const chosen: PublicTemplate[] = [];
  const usedIds = new Set<string>();

  const pick = (candidate: PublicTemplate | undefined) => {
    if (!candidate || usedIds.has(candidate.id)) return false;
    usedIds.add(candidate.id);
    chosen.push(candidate);
    return true;
  };

  // 1. Classic portrait strip
  pick(
    pool.find((t) => t.id === "tpl-classic-white") ??
      pool.find(
        (t) =>
          !t.is_premium &&
          t.layout_config.height > t.layout_config.width
      ) ??
      pool[0]
  );

  // 2. Square Polaroid or warm vintage contrast
  pick(
    pool.find((t) => t.id === "tpl-family-portrait") ??
      pool.find(
        (t) =>
          !usedIds.has(t.id) &&
          Math.abs(t.layout_config.width - t.layout_config.height) < 10
      ) ??
      pool.find((t) => t.id === "tpl-vintage-memories" && !usedIds.has(t.id)) ??
      pool.find((t) => !usedIds.has(t.id) && !t.is_premium)
  );

  // 3. VIP / Gold accent template
  pick(
    pool.find((t) => t.id === "tpl-premium-gold" && !usedIds.has(t.id)) ??
      pool.find((t) => !usedIds.has(t.id) && t.is_premium)
  );

  // Fill up to 3 if any slot could not match above
  for (const tpl of pool) {
    if (chosen.length >= 3) break;
    pick(tpl);
  }

  return chosen;
}

/**
 * Returns deterministic sample photo URLs mapped cleanly to every slot of a Hero template.
 */
export function getHeroTemplateSamplePhotos(
  template: PublicTemplate,
  cardIndex: number
): Record<number, string> {
  const result: Record<number, string> = {};
  const samples: readonly string[] = SAMPLE_PHOTO_URLS;
  if (samples.length === 0) return result;

  const slots = template.layout_config.slots;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const sampleIdx = (slot.index + cardIndex) % samples.length;
    result[slot.index] = samples[sampleIdx];
  }

  return result;
}

/**
 * Returns a curated Vietnamese editorial caption for a Hero showcase template.
 */
export function getHeroTemplateCaption(template: PublicTemplate): string {
  return (
    HERO_PREFERRED_CAPTIONS[template.id] ??
    template.layout_config.texts[0]?.content ??
    template.name
  );
}

/**
 * Computes the target 3D position, rotation, and scale of each fanned card in the Hero cluster
 * given the currently selected front card index, hover state, and flip state.
 */
export function computeHeroCardPose(
  cardIndex: number,
  activeIndex: number,
  totalCount: number,
  isHovered: boolean,
  isFlipped: boolean
): HeroCardPose {
  const safeTotal = Math.max(1, totalCount);
  const normalizedActive = ((activeIndex % safeTotal) + safeTotal) % safeTotal;
  const offset = (((cardIndex - normalizedActive) % safeTotal) + safeTotal) % safeTotal;

  // Front centerpiece card
  if (offset === 0) {
    return {
      role: "front",
      position: [0, 0.08, isFlipped ? 0.56 : 0.44],
      rotation: [
        isFlipped ? 0 : -0.04,
        isFlipped ? Math.PI : -0.1,
        isFlipped ? 0 : 0.015,
      ],
      scale: isHovered ? 1.035 : 1.0,
    };
  }

  // Right-back fanned card
  if (offset === 1) {
    return {
      role: "right",
      position: [isHovered ? 1.04 : 0.96, -0.06, isHovered ? -0.18 : -0.26],
      rotation: [0.03, -0.32, -0.11],
      scale: isHovered ? 0.89 : 0.86,
    };
  }

  // Left-back fanned card
  return {
    role: "left",
    position: [isHovered ? -1.04 : -0.96, -0.09, isHovered ? -0.22 : -0.32],
    rotation: [0.04, 0.28, 0.11],
    scale: isHovered ? 0.88 : 0.85,
  };
}
