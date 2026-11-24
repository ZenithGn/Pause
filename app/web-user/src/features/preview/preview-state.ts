import type { PublicTemplate, TemplateCategory } from "@/types/catalog";

export type TemplateFilterKey = "all" | TemplateCategory | "vip";

export interface TemplateFilterOption {
  key: TemplateFilterKey;
  label: string;
}

export const TEMPLATE_FILTERS: readonly TemplateFilterOption[] = [
  { key: "all", label: "Tất cả" },
  { key: "couple", label: "Cặp đôi" },
  { key: "friends", label: "Bạn bè" },
  { key: "family", label: "Gia đình" },
  { key: "general", label: "Chung" },
  { key: "vip", label: "Mẫu VIP" },
];

export const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface SlotPhotoEntry {
  url: string;
  name: string;
  isObjectUrl: boolean;
}

export type SlotPhotoMap = Record<number, SlotPhotoEntry | undefined>;

/**
 * Filters active templates by category chip or VIP flag.
 */
export function filterTemplates(
  templates: readonly PublicTemplate[],
  filterKey: TemplateFilterKey
): PublicTemplate[] {
  if (filterKey === "all") {
    return [...templates];
  }
  if (filterKey === "vip") {
    return templates.filter((template) => template.is_premium);
  }
  return templates.filter((template) => template.category === filterKey);
}

/**
 * Resolves the initial template from `?template=<id>` query parameter or falls back to the first item.
 */
export function resolveInitialTemplateId(
  templates: readonly PublicTemplate[],
  requestedId?: string | null
): string {
  if (requestedId) {
    const found = templates.find((item) => item.id === requestedId);
    if (found) return found.id;
  }
  return templates[0]?.id ?? "";
}

/**
 * Maps a `SlotPhotoMap` to a flat `Record<number, string>` containing only active slot URLs
 * for the currently selected template while keeping the underlying `SlotPhotoMap` intact across switches.
 */
export function getActiveSlotPhotoUrls(
  slotPhotos: SlotPhotoMap,
  slotCount: number
): Record<number, string> {
  const result: Record<number, string> = {};
  for (let i = 0; i < slotCount; i += 1) {
    const entry = slotPhotos[i];
    if (entry?.url) {
      result[i] = entry.url;
    }
  }
  return result;
}

/**
 * Assigns newly picked entries sequentially into empty slots first (0..slotCount-1),
 * then overwrites from slot 0 if all slots are already filled.
 * Returns any displaced object URLs and unused excess object URLs so callers can revoke them.
 */
export function assignEntriesToSlots(
  current: SlotPhotoMap,
  entries: readonly SlotPhotoEntry[],
  slotCount: number
): { nextMap: SlotPhotoMap; urlsToRevoke: string[] } {
  const safeCount = Math.max(1, slotCount);
  const nextMap: SlotPhotoMap = { ...current };
  const urlsToRevoke: string[] = [];

  if (entries.length === 0) {
    return { nextMap, urlsToRevoke };
  }

  const emptyIndices: number[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    if (!nextMap[i]) {
      emptyIndices.push(i);
    }
  }

  const targetIndices: number[] = [...emptyIndices];
  for (let i = 0; i < safeCount && targetIndices.length < entries.length; i += 1) {
    if (!emptyIndices.includes(i)) {
      targetIndices.push(i);
    }
  }

  entries.forEach((entry, idx) => {
    if (idx >= targetIndices.length) {
      if (entry.isObjectUrl) {
        urlsToRevoke.push(entry.url);
      }
      return;
    }

    const slotIdx = targetIndices[idx];
    const previous = nextMap[slotIdx];
    if (previous?.isObjectUrl && previous.url !== entry.url) {
      urlsToRevoke.push(previous.url);
    }
    nextMap[slotIdx] = entry;
  });

  return { nextMap, urlsToRevoke };
}

/**
 * Replaces a single slot's photo and returns any previous object URL to revoke.
 */
export function replaceSlotEntry(
  current: SlotPhotoMap,
  slotIndex: number,
  entry: SlotPhotoEntry
): { nextMap: SlotPhotoMap; urlToRevoke: string | null } {
  const previous = current[slotIndex];
  const urlToRevoke =
    previous?.isObjectUrl && previous.url !== entry.url ? previous.url : null;

  return {
    nextMap: {
      ...current,
      [slotIndex]: entry,
    },
    urlToRevoke,
  };
}

/**
 * Swaps two slot positions without mutating or revoking their URLs.
 */
export function swapSlotEntries(
  current: SlotPhotoMap,
  indexA: number,
  indexB: number
): SlotPhotoMap {
  if (indexA === indexB || indexA < 0 || indexB < 0) {
    return current;
  }

  const nextMap: SlotPhotoMap = { ...current };
  const entryA = nextMap[indexA];
  const entryB = nextMap[indexB];

  if (entryB) {
    nextMap[indexA] = entryB;
  } else {
    delete nextMap[indexA];
  }

  if (entryA) {
    nextMap[indexB] = entryA;
  } else {
    delete nextMap[indexB];
  }

  return nextMap;
}

/**
 * Removes a single slot's photo and returns its object URL if it should be revoked.
 */
export function removeSlotEntry(
  current: SlotPhotoMap,
  slotIndex: number
): { nextMap: SlotPhotoMap; urlToRevoke: string | null } {
  const previous = current[slotIndex];
  const nextMap: SlotPhotoMap = { ...current };
  delete nextMap[slotIndex];

  return {
    nextMap,
    urlToRevoke: previous?.isObjectUrl ? previous.url : null,
  };
}

/**
 * Clears every slot and collects all object URLs that need to be revoked.
 */
export function clearAllSlotEntries(current: SlotPhotoMap): {
  nextMap: SlotPhotoMap;
  urlsToRevoke: string[];
} {
  const urlsToRevoke: string[] = [];
  for (const entry of Object.values(current)) {
    if (entry?.isObjectUrl) {
      urlsToRevoke.push(entry.url);
    }
  }
  return {
    nextMap: {},
    urlsToRevoke,
  };
}

/**
 * Populates active slots with local bundled sample photos.
 */
export function fillSampleSlotEntries(
  current: SlotPhotoMap,
  sampleUrls: readonly string[],
  slotCount: number
): { nextMap: SlotPhotoMap; urlsToRevoke: string[] } {
  const urlsToRevoke: string[] = [];
  for (const entry of Object.values(current)) {
    if (entry?.isObjectUrl) {
      urlsToRevoke.push(entry.url);
    }
  }

  const nextMap: SlotPhotoMap = {};
  if (sampleUrls.length === 0) {
    return { nextMap, urlsToRevoke };
  }

  const safeCount = Math.max(1, slotCount);
  for (let i = 0; i < safeCount; i += 1) {
    const sampleUrl = sampleUrls[i % sampleUrls.length];
    nextMap[i] = {
      url: sampleUrl,
      name: `Ảnh mẫu ${(i % sampleUrls.length) + 1}`,
      isObjectUrl: false,
    };
  }

  return { nextMap, urlsToRevoke };
}

/**
 * Formats a template category slug into a Vietnamese label.
 */
export function getCategoryLabelVi(category: string): string {
  switch (category) {
    case "couple":
      return "Cặp đôi";
    case "friends":
      return "Bạn bè";
    case "family":
      return "Gia đình";
    case "general":
      return "Chung";
    default:
      return "Chủ đề";
  }
}
