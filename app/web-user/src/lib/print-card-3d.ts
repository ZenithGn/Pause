import * as THREE from "three";
import {
  createPaperGrainCanvas,
  renderBackTemplateCanvas,
  renderFrontTemplateCanvas,
  type SlotImageSource,
} from "@/lib/template-canvas";
import type { CoverType, PhotoTone, PublicTemplate } from "@/types/catalog";

export interface PrintCardDimensions {
  cardWidth: number;
  cardHeight: number;
  cardDepth: number;
  edgeRadius: number;
  isGoldEdge: boolean;
  faceWidth: number;
  faceHeight: number;
  frontZ: number;
  backZ: number;
}

/**
 * Returns true when a hex background color has low perceptual luminance (`< 0.35`).
 */
export function isDarkHex(hex: string): boolean {
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length !== 3 && cleaned.length !== 6) return false;
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : cleaned;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35;
}

/**
 * Computes normalized 3D card dimensions preserving template aspect ratio
 * and tactile soft/hard cover depth.
 */
export function computePrintCardDimensions(
  template: PublicTemplate,
  coverType: CoverType,
  maxHeight = 3.2,
  maxWidth = 3.2
): PrintCardDimensions {
  const cfg = template.layout_config;
  const aspect = cfg.height > 0 && cfg.width > 0 ? cfg.width / cfg.height : 2 / 3;

  let height = maxHeight;
  let width = height * aspect;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspect;
  }

  const cardWidth = Number(width.toFixed(4));
  const cardHeight = Number(height.toFixed(4));
  const cardDepth = coverType === "hard" ? 0.068 : 0.022;
  const edgeRadius = Math.min(0.012, cardDepth * 0.32);
  const isGoldEdge = template.is_premium || isDarkHex(cfg.background_color || "");

  return {
    cardWidth,
    cardHeight,
    cardDepth,
    edgeRadius,
    isGoldEdge,
    faceWidth: Math.max(0.2, cardWidth - 0.018),
    faceHeight: Math.max(0.2, cardHeight - 0.018),
    frontZ: cardDepth / 2 + 0.001,
    backZ: -cardDepth / 2 - 0.001,
  };
}

/**
 * Loads an HTMLImageElement cleanly for Canvas2D drawing, enabling CORS for external HTTPS URLs.
 */
export function loadCardImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Creates a repeating procedural paper-grain CanvasTexture for 200gsm satin bump mapping.
 */
export function createPaperGrainBumpTexture(): THREE.CanvasTexture {
  const grainCanvas = createPaperGrainCanvas(256);
  const texture = new THREE.CanvasTexture(grainCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Renders the front face of a template onto a CanvasTexture with sRGB color space.
 */
export async function buildFrontCardCanvasTexture(
  template: PublicTemplate,
  slotPhotoUrls: Record<number, string>,
  caption: string,
  imageCache?: Map<string, HTMLImageElement>,
  isCancelled?: () => boolean,
  photoTone: PhotoTone = "original"
): Promise<THREE.CanvasTexture | null> {
  const activeUrls = new Set(
    Object.values(slotPhotoUrls).filter((u): u is string => Boolean(u))
  );

  if (imageCache) {
    for (const cachedUrl of imageCache.keys()) {
      if (!activeUrls.has(cachedUrl)) {
        imageCache.delete(cachedUrl);
      }
    }
  }

  const entries = Object.entries(slotPhotoUrls);
  const loadedPairs = await Promise.all(
    entries.map(async ([idxStr, url]) => {
      const idx = Number(idxStr);
      if (!url) return [idx, null] as const;

      const cached = imageCache?.get(url);
      if (cached) {
        return [idx, cached] as const;
      }

      const img = await loadCardImageElement(url);
      if (img && !isCancelled?.()) {
        imageCache?.set(url, img);
      }
      return [idx, img] as const;
    })
  );

  if (isCancelled?.()) return null;

  const slotSources: Record<number, SlotImageSource> = {};
  for (const [idx, img] of loadedPairs) {
    if (img) {
      slotSources[idx] = img;
    }
  }

  const canvas = await renderFrontTemplateCanvas(
    template,
    slotSources,
    caption,
    undefined,
    photoTone
  );
  if (isCancelled?.()) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Renders the back watermark face of a template onto a CanvasTexture.
 */
export function buildBackCardCanvasTexture(
  template: PublicTemplate,
  dateStr?: string
): THREE.CanvasTexture {
  const canvas = renderBackTemplateCanvas(template, dateStr);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
