"use client";

import React, { useMemo, useState } from "react";
import { Smartphone } from "lucide-react";
import { Switch, TextField } from "@/components/ui";
import type { LayoutConfig } from "@/types/admin";
import styles from "./MobileTemplatePreview.module.css";

const CAPTION_FONT_SIZE_PX = 52;
const CAPTION_BOTTOM_OFFSET_PX = 60;

/**
 * Generates offline-safe vector sample photography data URLs with varied aspect ratios
 * so crop-fill (preserveAspectRatio="xMidYMid slice", matching Android ContentScale.Crop)
 * can be visually inspected without external network calls.
 */
function buildSamplePhotoDataUrl(
  index: number,
  bgTop: string,
  bgBottom: string,
  accent: string,
  label: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="g${index}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgTop}" />
        <stop offset="100%" stop-color="${bgBottom}" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#g${index})" />
    <circle cx="620" cy="145" r="78" fill="${accent}" opacity="0.35" />
    <path d="M0 460 Q210 340 420 430 T800 390 L800 600 L0 600 Z" fill="${accent}" opacity="0.52" />
    <circle cx="320" cy="255" r="56" fill="#FFFFFF" opacity="0.72" />
    <path d="M235 425 C235 360 405 360 405 425 Z" fill="#FFFFFF" opacity="0.72" />
    <text x="48" y="84" fill="#FFFFFF" font-family="sans-serif" font-size="34" font-weight="700" opacity="0.92">${label}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_PHOTOS = [
  buildSamplePhotoDataUrl(0, "#630D11", "#B5525C", "#F6EFE4", "Khoảnh khắc #1"),
  buildSamplePhotoDataUrl(1, "#355C7D", "#6C5B7B", "#F8B195", "Khoảnh khắc #2"),
  buildSamplePhotoDataUrl(2, "#2A4D3E", "#5C8374", "#F2DEC0", "Khoảnh khắc #3"),
  buildSamplePhotoDataUrl(3, "#7B4B2A", "#C08261", "#FAF0E6", "Khoảnh khắc #4"),
];

function resolveCaptionColor(layout: LayoutConfig): string {
  const firstTextColor = layout.texts[0]?.color?.trim();
  if (firstTextColor && /^#[0-9A-Fa-f]{6}$/.test(firstTextColor)) {
    return firstTextColor;
  }

  const clean = layout.background_color.replace("#", "");
  if (clean.length === 6) {
    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 128 ? "#FFFFFF" : "#111111";
  }

  return "#111111";
}

export interface MobileTemplatePreviewProps {
  layout: LayoutConfig;
  templateName?: string;
}

/**
 * Renders the template with the exact layer stack and crop-fill geometry used by
 * AndroidPhotoboothRenderer.kt:
 *   1) background_color
 *   2) slots filled with crop-fill (xMidYMid slice)
 *   3) optional frame_url stretched across full canvas
 *   4) template texts (centered at x, baseline y)
 *   5) optional user caption at bottom center
 */
export function MobileTemplatePreview({
  layout,
  templateName = "Mẫu Photobooth",
}: MobileTemplatePreviewProps) {
  const [sampleOffset, setSampleOffset] = useState(0);
  const [showUserCaption, setShowUserCaption] = useState(true);
  const [userCaption, setUserCaption] = useState("Đà Lạt 2026 ♥");

  const sortedSlots = useMemo(
    () => [...layout.slots].sort((a, b) => a.index - b.index),
    [layout.slots],
  );

  const safeWidth = Math.max(100, layout.width);
  const safeHeight = Math.max(100, layout.height);
  const captionColor = resolveCaptionColor(layout);

  return (
    <div className={styles.wrapper}>
      <div className={styles.phoneFrame}>
        <div className={styles.phoneNotch} aria-hidden="true" />
        <div className={styles.phoneScreen}>
          <div className={styles.phoneHeader}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Smartphone size={14} aria-hidden="true" />
              <span>Xem thử Mobile</span>
            </span>
            <span>{templateName || "Template"}</span>
          </div>

          <div className={styles.canvasOuter}>
            <svg
              viewBox={`0 0 ${safeWidth} ${safeHeight}`}
              className={styles.previewSvg}
              role="img"
              aria-label={`Xem thử trên Mobile: ${templateName}`}
            >
              <rect
                x={0}
                y={0}
                width={safeWidth}
                height={safeHeight}
                fill={layout.background_color || "#FFFFFF"}
              />

              {sortedSlots.map((slot, position) => {
                const sampleUrl =
                  SAMPLE_PHOTOS[(position + sampleOffset) % SAMPLE_PHOTOS.length];
                return (
                  <g key={`mobile-slot-${slot.index}`}>
                    <rect
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      fill="#EAE5DF"
                    />
                    <image
                      href={sampleUrl}
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </g>
                );
              })}

              {layout.frame_url ? (
                <image
                  href={layout.frame_url}
                  x={0}
                  y={0}
                  width={safeWidth}
                  height={safeHeight}
                  preserveAspectRatio="none"
                />
              ) : null}

              {layout.texts.map((text, idx) => (
                <text
                  key={`mobile-text-${idx}`}
                  x={text.x}
                  y={text.y}
                  textAnchor="middle"
                  fill={text.color || "#111111"}
                  fontSize={text.font_size}
                  fontFamily="var(--font-sans)"
                  fontWeight={600}
                >
                  {text.content}
                </text>
              ))}

              {showUserCaption && userCaption.trim() ? (
                <text
                  x={safeWidth / 2}
                  y={Math.max(CAPTION_FONT_SIZE_PX, safeHeight - CAPTION_BOTTOM_OFFSET_PX)}
                  textAnchor="middle"
                  fill={captionColor}
                  fontSize={CAPTION_FONT_SIZE_PX}
                  fontFamily="var(--font-sans)"
                  fontWeight={600}
                >
                  {userCaption.trim().slice(0, 40)}
                </text>
              ) : null}
            </svg>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div>
          <h4 className={styles.controlsTitle}>Mô phỏng trình kết xuất Mobile (FR-03)</h4>
          <p className={styles.controlsDesc}>
            Áp dụng đúng thứ tự lớp của ứng dụng Android: nền → ảnh slot cắt giữa vừa khung
            (crop-fill) → ảnh khung overlay → chữ cố định → caption của người dùng.
          </p>
        </div>

        <div className={styles.metaList}>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>Kích thước canvas</span>
            <span className={styles.metaVal}>
              {safeWidth} × {safeHeight} px
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>Số ảnh cần chọn</span>
            <span className={styles.metaVal}>{sortedSlots.length} slot</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>Khung overlay</span>
            <span className={styles.metaVal}>
              {layout.frame_url ? "Có (FillBounds)" : "Không"}
            </span>
          </div>
        </div>

        <div>
          <p className={styles.controlsTitle} style={{ marginBottom: "var(--space-2)" }}>
            Đổi bộ ảnh mẫu để kiểm tra crop-fill
          </p>
          <div className={styles.photoThumbs}>
            {SAMPLE_PHOTOS.map((src, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.photoThumbBtn} ${
                  sampleOffset === idx ? styles.photoThumbBtnActive : ""
                }`}
                onClick={() => setSampleOffset(idx)}
                aria-label={`Chọn bộ ảnh mẫu bắt đầu từ ảnh ${idx + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Ảnh mẫu ${idx + 1}`} className={styles.photoThumbImg} />
              </button>
            ))}
          </div>
        </div>

        <Switch
          checked={showUserCaption}
          onCheckedChange={setShowUserCaption}
          label="Hiển thị caption người dùng nhập"
          description="Người dùng có thể thêm dòng chữ tối đa 40 ký tự ở cuối khung."
        />

        {showUserCaption ? (
          <TextField
            label="Caption thử nghiệm"
            value={userCaption}
            maxLength={40}
            onChange={(event) => setUserCaption(event.target.value)}
            placeholder="Nhập caption tối đa 40 ký tự..."
          />
        ) : null}
      </div>
    </div>
  );
}
