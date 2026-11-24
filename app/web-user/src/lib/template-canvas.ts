import type { LayoutSlot, PublicTemplate } from "@/types/catalog";

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export type SlotImageSource = HTMLImageElement | HTMLCanvasElement | null | undefined;

const MAX_CANVAS_DIMENSION = 1800;

/**
 * Computes source rectangle coordinates (`sx, sy, sw, sh`) for a center-crop (cover) fit
 * so an image fills `slotW × slotH` completely without distortion.
 */
export function computeCenterCropRect(
  imgW: number,
  imgH: number,
  slotW: number,
  slotH: number
): CropRect {
  if (imgW <= 0 || imgH <= 0 || slotW <= 0 || slotH <= 0) {
    return {
      sx: 0,
      sy: 0,
      sw: Math.max(0, imgW),
      sh: Math.max(0, imgH),
    };
  }

  const imgAspect = imgW / imgH;
  const slotAspect = slotW / slotH;

  if (imgAspect > slotAspect) {
    const sw = imgH * slotAspect;
    return {
      sx: (imgW - sw) / 2,
      sy: 0,
      sw,
      sh: imgH,
    };
  }

  const sh = imgW / slotAspect;
  return {
    sx: 0,
    sy: (imgH - sh) / 2,
    sw: imgW,
    sh,
  };
}

function isDarkHexColor(hex: string): boolean {
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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.35;
}

function getSourceDimensions(source: HTMLImageElement | HTMLCanvasElement): {
  width: number;
  height: number;
} {
  if ("naturalWidth" in source) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return {
    width: source.width,
    height: source.height,
  };
}

function loadOverlayImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawSlotPlaceholder(
  ctx: CanvasRenderingContext2D,
  slot: LayoutSlot,
  scale: number,
  isDarkBg: boolean
): void {
  const x = slot.x * scale;
  const y = slot.y * scale;
  const w = slot.width * scale;
  const h = slot.height * scale;

  ctx.save();
  ctx.fillStyle = isDarkBg ? "#1E1C1C" : "#F3F1EF";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#C59B38";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.setLineDash([12 * scale, 10 * scale]);
  const inset = 10 * scale;
  if (w > inset * 2 && h > inset * 2) {
    ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  }
  ctx.setLineDash([]);

  // Minimalist camera glyph in center
  const cx = x + w / 2;
  const cy = y + h / 2 - 22 * scale;
  const iconSize = Math.min(w, h) * 0.14;
  ctx.strokeStyle = isDarkBg ? "rgba(212, 175, 55, 0.75)" : "rgba(99, 13, 17, 0.55)";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(cx - iconSize * 0.65, cy - iconSize * 0.42, iconSize * 1.3, iconSize * 0.84);
  ctx.beginPath();
  ctx.arc(cx, cy, iconSize * 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Slot label
  ctx.fillStyle = isDarkBg ? "#EAE6E1" : "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const titleSize = Math.max(18, Math.round(Math.min(w, h) * 0.085));
  ctx.font = `600 ${titleSize}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText(`Ảnh ${slot.index + 1}`, cx, cy + iconSize * 0.95 + 16 * scale);

  ctx.fillStyle = isDarkBg ? "#B8B0A6" : "#595552";
  const subSize = Math.max(13, Math.round(titleSize * 0.62));
  ctx.font = `400 ${subSize}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText("Chọn ảnh từ máy", cx, cy + iconSize * 0.95 + 16 * scale + titleSize * 1.05);
  ctx.restore();
}

/**
 * Renders the front face of a Photobooth template onto a Canvas2D surface.
 * Uses `computeCenterCropRect` so user photos fill each slot cleanly without stretching.
 */
export async function renderFrontTemplateCanvas(
  template: PublicTemplate,
  slotImages: Record<number, SlotImageSource>,
  customCaption?: string,
  existingCanvas?: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  const { layout_config } = template;
  const maxDim = Math.max(layout_config.width, layout_config.height);
  const scale = maxDim > MAX_CANVAS_DIMENSION ? MAX_CANVAS_DIMENSION / maxDim : 1;

  const canvas = existingCanvas ?? document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(layout_config.width * scale));
  canvas.height = Math.max(1, Math.round(layout_config.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Background
  const bg = layout_config.background_color || "#FFFFFF";
  const isDarkBg = isDarkHexColor(bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle foil hairline for premium templates
  if (template.is_premium) {
    ctx.save();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.45)";
    ctx.lineWidth = Math.max(2, 3 * scale);
    const pad = 22 * scale;
    ctx.strokeRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
    ctx.restore();
  }

  // 2. Photo slots
  for (const slot of layout_config.slots) {
    const imgSource = slotImages[slot.index];
    if (imgSource) {
      const { width: imgW, height: imgH } = getSourceDimensions(imgSource);
      if (imgW > 0 && imgH > 0) {
        const crop = computeCenterCropRect(imgW, imgH, slot.width, slot.height);
        ctx.save();
        ctx.drawImage(
          imgSource,
          crop.sx,
          crop.sy,
          crop.sw,
          crop.sh,
          slot.x * scale,
          slot.y * scale,
          slot.width * scale,
          slot.height * scale
        );
        ctx.restore();
        continue;
      }
    }
    drawSlotPlaceholder(ctx, slot, scale, isDarkBg);
  }

  // 3. Optional frame overlay
  if (layout_config.frame_url) {
    const frameImg = await loadOverlayImage(layout_config.frame_url);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    }
  }

  // 4. Texts + optional custom caption override
  const trimmedCaption = customCaption?.trim();
  const texts = layout_config.texts ?? [];

  if (texts.length > 0) {
    texts.forEach((textItem, idx) => {
      const content = idx === 0 && trimmedCaption ? trimmedCaption : textItem.content;
      if (!content) return;

      ctx.save();
      ctx.fillStyle = textItem.color || (isDarkBg ? "#D4AF37" : "#111111");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontSize = Math.max(16, Math.round(textItem.font_size * scale));
      ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif`;
      ctx.fillText(content, textItem.x * scale, textItem.y * scale, canvas.width - 80 * scale);
      ctx.restore();
    });
  } else if (trimmedCaption) {
    ctx.save();
    ctx.fillStyle = isDarkBg ? "#D4AF37" : "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = Math.max(24, Math.round(44 * scale));
    ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif`;
    ctx.fillText(
      trimmedCaption,
      canvas.width / 2,
      canvas.height - 95 * scale,
      canvas.width - 100 * scale
    );
    ctx.restore();
  }

  return canvas;
}

/**
 * Formats a Date into `DD/MM/YYYY`.
 */
export function formatEditorialDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Renders the tactile back face of the printed photobooth card with Pause watermark,
 * gold foil hairline border, template name, and print date.
 */
export function renderBackTemplateCanvas(
  template: PublicTemplate,
  dateStr?: string,
  existingCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const { layout_config } = template;
  const maxDim = Math.max(layout_config.width, layout_config.height);
  const scale = maxDim > MAX_CANVAS_DIMENSION ? MAX_CANVAS_DIMENSION / maxDim : 1;

  const canvas = existingCanvas ?? document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(layout_config.width * scale));
  canvas.height = Math.max(1, Math.round(layout_config.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const isDarkBack =
    template.is_premium && isDarkHexColor(layout_config.background_color || "");

  // Background paper
  ctx.fillStyle = isDarkBack ? "#161414" : "#FAF7F2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle gold hairline border (48px base inset)
  const inset = 48 * scale;
  ctx.strokeStyle = "#C59B38";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);

  // Inner corner ticks
  const innerInset = inset + 14 * scale;
  ctx.strokeStyle = isDarkBack ? "rgba(212, 175, 55, 0.35)" : "rgba(197, 155, 56, 0.35)";
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeRect(
    innerInset,
    innerInset,
    canvas.width - innerInset * 2,
    canvas.height - innerInset * 2
  );

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Monogram square mark
  const badgeSize = 96 * scale;
  const badgeX = cx - badgeSize / 2;
  const badgeY = cy - 130 * scale;

  ctx.fillStyle = "#630D11";
  ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
  ctx.strokeStyle = "#C59B38";
  ctx.lineWidth = Math.max(2, 2.5 * scale);
  ctx.strokeRect(badgeX, badgeY, badgeSize, badgeSize);

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(54 * scale)}px "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText("P", cx, badgeY + badgeSize / 2 + 2 * scale);

  // Studio watermark title
  ctx.fillStyle = isDarkBack ? "#D4AF37" : "#630D11";
  ctx.font = `700 ${Math.round(34 * scale)}px "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText("PAUSE · MEMORY STUDIO", cx, cy + 20 * scale);

  // Divider hairline
  ctx.strokeStyle = "#C59B38";
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(cx - 110 * scale, cy + 56 * scale);
  ctx.lineTo(cx + 110 * scale, cy + 56 * scale);
  ctx.stroke();

  // Template name & formatted date
  ctx.fillStyle = isDarkBack ? "#EAE6E1" : "#111111";
  ctx.font = `600 ${Math.round(28 * scale)}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText(template.name, cx, cy + 98 * scale);

  const displayDate = dateStr?.trim() || formatEditorialDate();
  ctx.fillStyle = isDarkBack ? "#B8B0A6" : "#595552";
  ctx.font = `500 ${Math.round(24 * scale)}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText(displayDate, cx, cy + 144 * scale);

  // Footer note
  ctx.fillStyle = isDarkBack ? "rgba(212, 175, 55, 0.7)" : "#8C857E";
  ctx.font = `400 ${Math.round(20 * scale)}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.fillText("Dừng lại, lưu giữ, hiện thực hóa kỷ niệm", cx, canvas.height - inset - 44 * scale);

  return canvas;
}

/**
 * Generates a deterministic fine-grain Canvas2D texture for 200gsm art paper bump maps.
 */
export function createPaperGrainCanvas(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  // Deterministic LCG PRNG so grain is consistent across renders and tests
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < data.length; i += 4) {
    const base = 128 + Math.round((nextRand() - 0.5) * 44);
    data[i] = base;
    data[i + 1] = base;
    data[i + 2] = base;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Generates a deterministic pebbled leather bump map Canvas2D texture for the 3D vintage camera.
 */
export function createLeatherBumpCanvas(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#5A5A5A";
  ctx.fillRect(0, 0, size, size);

  let seed = 4242;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const cell = 8;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const jx = x + cell * 0.5 + (nextRand() - 0.5) * 3.5;
      const jy = y + cell * 0.5 + (nextRand() - 0.5) * 3.5;
      const r = cell * (0.32 + nextRand() * 0.22);
      const tone = Math.round(135 + nextRand() * 90);
      ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
      ctx.beginPath();
      ctx.arc(jx, jy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}
