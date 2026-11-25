"use client";

import { Crown } from "lucide-react";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import type { PublicTemplate } from "@/types/catalog";
import {
  getCategoryLabelVi,
  TEMPLATE_FILTERS,
  type SlotPhotoMap,
  type TemplateFilterKey,
} from "./preview-state";
import styles from "./PreviewStudio.module.css";

interface TemplateSelectorProps {
  templates: readonly PublicTemplate[];
  filteredTemplates: readonly PublicTemplate[];
  selectedTemplateId: string;
  activeFilter: TemplateFilterKey;
  slotPhotos: SlotPhotoMap;
  onFilterChange: (filter: TemplateFilterKey) => void;
  onSelectTemplate: (template: PublicTemplate) => void;
}

/**
 * Category/VIP filter chips and live-photo mini-map grid for choosing a photobooth template.
 */
export function TemplateSelector({
  templates,
  filteredTemplates,
  selectedTemplateId,
  activeFilter,
  slotPhotos,
  onFilterChange,
  onSelectTemplate,
}: TemplateSelectorProps) {
  return (
    <section
      id="studio-section-templates"
      aria-label="Chọn mẫu in Photobooth"
      className={styles.sectionStack}
    >
      <div className={styles.sectionIntro}>
        <span className={styles.stepIndexTag}>BƯỚC 01</span>
        <h2 className={styles.sectionHeading}>Chọn mẫu in Photobooth</h2>
        <p className={styles.sectionDescription}>
          Đổi mẫu bất kỳ lúc nào — ảnh bạn đã chọn ở các khung đầu vẫn được giữ nguyên.
        </p>
      </div>

      <div className={styles.chipRow} role="group" aria-label="Lọc mẫu in theo chủ đề">
        {TEMPLATE_FILTERS.map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={isActive}
              className={`${styles.filterChip} ${
                isActive ? styles.filterChipActive : ""
              }`}
              onClick={() => onFilterChange(chip.key)}
            >
              {chip.key === "vip" ? (
                <Crown size={13} aria-hidden="true" />
              ) : null}
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {filteredTemplates.length === 0 ? (
        <div className={styles.emptyFilterBox}>
          <p>Không có mẫu nào phù hợp bộ lọc này.</p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onFilterChange("all")}
          >
            Xem tất cả ({templates.length})
          </button>
        </div>
      ) : (
        <div className={styles.templateGrid}>
          {filteredTemplates.map((template, tplIdx) => {
            const isSelected = template.id === selectedTemplateId;
            const { width, height, background_color, slots } = template.layout_config;
            const safeWidth = width > 0 ? width : 1200;
            const safeHeight = height > 0 ? height : 1800;

            return (
              <button
                key={template.id}
                type="button"
                aria-pressed={isSelected}
                className={`${styles.templateCard} ${
                  isSelected ? styles.templateCardSelected : ""
                }`}
                onClick={() => onSelectTemplate(template)}
              >
                <div className={styles.miniMapStage}>
                  <div
                    className={styles.miniMapFrame}
                    style={{
                      aspectRatio: `${safeWidth} / ${safeHeight}`,
                      backgroundColor: background_color || "#FFFFFF",
                    }}
                  >
                    {slots.map((slot) => {
                      const activeUrl =
                        slotPhotos[slot.index]?.url ??
                        SAMPLE_PHOTO_URLS[(slot.index + tplIdx) % SAMPLE_PHOTO_URLS.length];
                      return (
                        <span
                          key={slot.index}
                          className={styles.miniMapSlot}
                          style={{
                            left: `${(slot.x / safeWidth) * 100}%`,
                            top: `${(slot.y / safeHeight) * 100}%`,
                            width: `${(slot.width / safeWidth) * 100}%`,
                            height: `${(slot.height / safeHeight) * 100}%`,
                          }}
                        >
                          {activeUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={activeUrl}
                              alt=""
                              className={styles.miniMapImg}
                              loading="lazy"
                            />
                          ) : null}
                        </span>
                      );
                    })}
                  </div>

                  {template.is_premium ? (
                    <span className={styles.vipBadge}>
                      <Crown size={11} aria-hidden="true" />
                      <span>VIP</span>
                    </span>
                  ) : null}
                </div>

                <div className={styles.templateMeta}>
                  <span className={styles.templateName}>{template.name}</span>
                  <span className={styles.templateSub}>
                    {template.slot_count} ảnh · {getCategoryLabelVi(template.category)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
