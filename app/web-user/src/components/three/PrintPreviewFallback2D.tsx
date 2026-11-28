"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import {
  renderBackTemplateCanvas,
  renderFrontTemplateCanvas,
  type SlotImageSource,
} from "@/lib/template-canvas";
import type { CoverType, PaperType, PhotoTone, PublicTemplate } from "@/types/catalog";
import styles from "./PrintPreviewFallback2D.module.css";

export interface PrintPreviewFallback2DProps {
  template: PublicTemplate;
  slotPhotoUrls: Record<number, string>;
  caption: string;
  photoTone?: PhotoTone;
  coverType: CoverType;
  paperType: PaperType;
  reason?: "unsupported" | "context-lost";
}

function loadFallbackImage(url: string): Promise<HTMLImageElement | null> {
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
 * Interactive 2D Canvas fallback rendered automatically when WebGL is disabled or lost.
 * Uses the exact front/back template canvas renderers so users can still inspect photos,
 * captions, paper finish, cover thickness, and the Pause back watermark cleanly.
 */
export function PrintPreviewFallback2D({
  template,
  slotPhotoUrls,
  caption,
  photoTone = "original",
  coverType,
  paperType,
  reason = "unsupported",
}: PrintPreviewFallback2DProps) {
  const [face, setFace] = useState<"front" | "back">("front");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const target = canvasRef.current;
      if (!target) return;

      if (face === "back") {
        renderBackTemplateCanvas(template, undefined, target);
        return;
      }

      const entries = Object.entries(slotPhotoUrls);
      const loadedPairs = await Promise.all(
        entries.map(async ([idxStr, url]) => {
          const idx = Number(idxStr);
          if (!url) return [idx, null] as const;
          const img = await loadFallbackImage(url);
          return [idx, img] as const;
        })
      );

      if (cancelled) return;

      const slotSources: Record<number, SlotImageSource> = {};
      for (const [idx, img] of loadedPairs) {
        if (img) {
          slotSources[idx] = img;
        }
      }

      await renderFrontTemplateCanvas(
        template,
        slotSources,
        caption,
        target,
        photoTone
      );
    }

    void draw();
    return () => {
      cancelled = true;
    };
  }, [template, slotPhotoUrls, caption, photoTone, face]);

  const { width, height } = template.layout_config;
  const aspectRatio = height > 0 ? `${width} / ${height}` : "2 / 3";

  return (
    <div
      className={styles.fallbackStage}
      data-testid="print-preview-fallback-2d"
      role="region"
      aria-label={`Bản xem trước 2D của mẫu in ${template.name}`}
    >
      <div className={styles.header}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden="true" />
          <span>{template.name}</span>
        </div>
        <span className={styles.modeTag}>
          {reason === "context-lost"
            ? "Đã chuyển sang chế độ xem 2D"
            : "Chế độ xem 2D (WebGL chưa bật)"}
        </span>
      </div>

      <div className={styles.cardViewport}>
        <div
          className={`${styles.cardFrame} ${
            coverType === "hard" ? styles.cardHard : styles.cardSoft
          } ${paperType === "premium" ? styles.cardPremium : ""}`}
          style={{ aspectRatio }}
        >
          <canvas
            ref={canvasRef}
            className={styles.previewCanvas}
            aria-label={
              face === "front"
                ? `Mặt trước mẫu in ${template.name}`
                : `Mặt sau mẫu in ${template.name} kèm dấu ấn Pause`
            }
          />
        </div>
      </div>

      <div className={styles.toolbarWrap}>
        <div className={styles.toolbar} role="toolbar" aria-label="Điều khiển bản xem trước 2D">
          <button
            type="button"
            className={`${styles.toolButton} ${
              face === "front" ? styles.toolButtonActive : ""
            }`}
            onClick={() => setFace("front")}
          >
            Mặt trước
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${
              face === "back" ? styles.toolButtonActive : ""
            }`}
            onClick={() => setFace("back")}
          >
            Mặt sau
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => setFace((prev) => (prev === "front" ? "back" : "front"))}
          >
            <RotateCw size={14} aria-hidden="true" />
            <span>Lật mặt in</span>
          </button>
        </div>
      </div>
    </div>
  );
}
