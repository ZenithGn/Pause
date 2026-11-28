import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProcessInteractiveSteps } from "@/features/home/ProcessInteractiveSteps";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import type { PublicTemplate } from "@/types/catalog";
import styles from "./Home.module.css";

interface ProcessSectionProps {
  templates: PublicTemplate[];
}

const CATEGORY_LABELS: Record<string, string> = {
  couple: "Cặp đôi",
  friends: "Bạn bè",
  family: "Gia đình",
  general: "Chung",
};

function TemplateMiniSchematic({
  template,
  photoOffset = 0,
}: {
  template: PublicTemplate;
  photoOffset?: number;
}) {
  const { width, height, background_color, slots, texts } = template.layout_config;
  const safeW = width > 0 ? width : 1200;
  const safeH = height > 0 ? height : 1800;
  const slotFill = template.is_premium ? "#2A2525" : "#E9E4DE";
  const strokeColor = template.is_premium ? "#C59B38" : "#D6CFC7";
  const safeId = template.id.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      viewBox={`0 0 ${safeW} ${safeH}`}
      className={styles.templateSvg}
      style={{ aspectRatio: `${safeW} / ${safeH}` }}
      role="img"
      aria-label={`Xem trước mẫu ${template.name}`}
    >
      <defs>
        {slots.map((slot) => (
          <clipPath key={`clip-${slot.index}`} id={`clip-${safeId}-${slot.index}`}>
            <rect
              x={slot.x}
              y={slot.y}
              width={slot.width}
              height={slot.height}
              rx={14}
            />
          </clipPath>
        ))}
      </defs>
      <rect
        x={0}
        y={0}
        width={safeW}
        height={safeH}
        rx={28}
        fill={background_color || "#FFFFFF"}
        stroke={strokeColor}
        strokeWidth={14}
      />
      {slots.map((slot) => {
        const photoUrl =
          SAMPLE_PHOTO_URLS[(slot.index + photoOffset) % SAMPLE_PHOTO_URLS.length];
        return (
          <g key={slot.index}>
            <rect
              x={slot.x}
              y={slot.y}
              width={slot.width}
              height={slot.height}
              rx={14}
              fill={slotFill}
            />
            {photoUrl ? (
              <image
                href={photoUrl}
                x={slot.x}
                y={slot.y}
                width={slot.width}
                height={slot.height}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#clip-${safeId}-${slot.index})`}
              />
            ) : null}
          </g>
        );
      })}
      {(texts ?? []).map((txt, idx) => (
        <text
          key={`txt-${idx}`}
          x={txt.x}
          y={txt.y}
          fill={txt.color || (template.is_premium ? "#D4AF37" : "#111111")}
          fontSize={txt.font_size}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {txt.content}
        </text>
      ))}
    </svg>
  );
}

export function ProcessSection({ templates }: ProcessSectionProps) {
  const featuredTemplates = templates.slice(0, 6);

  return (
    <section
      className={styles.processSection}
      aria-labelledby="process-heading"
    >
      <div className={styles.sectionContainer}>
        <div className={styles.processIntro}>
          <span className={styles.eyebrow}>TRẢI NGHIỆM</span>
          <h2 id="process-heading" className={styles.sectionHeading}>
            Từ ảnh trong ngăn kéo đến dải ảnh trên tay
          </h2>
          <p className={styles.sectionLead}>
            Thử ghép ảnh từ máy lên mẫu in 3D ngay trên trình duyệt — xử lý 100%
            tại thiết bị, không tải lên máy chủ.
          </p>
        </div>

        <ProcessInteractiveSteps />

        <div className={styles.templatesShowcase}>
          <div className={styles.templatesHeader}>
            <h3 className={styles.templatesTitle}>
              Chọn một mẫu để thử ghép ảnh 3D
            </h3>
            <Link href="/preview" className={styles.templatesLink}>
              <span>Mở Studio 3D</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.templatesGrid}>
            {featuredTemplates.map((tpl, idx) => {
              const categoryLabel =
                CATEGORY_LABELS[tpl.category] ?? tpl.category;
              return (
                <Link
                  key={tpl.id}
                  href={`/preview?template=${encodeURIComponent(tpl.id)}`}
                  className={styles.templateCard}
                >
                  <div className={styles.templateThumbWrap}>
                    <TemplateMiniSchematic template={tpl} photoOffset={idx} />
                    {tpl.is_premium ? (
                      <span className={styles.vipBadge}>VIP</span>
                    ) : null}
                  </div>
                  <div className={styles.templateMeta}>
                    <span className={styles.templateName}>{tpl.name}</span>
                    <span className={styles.templateDetail}>
                      {categoryLabel} · {tpl.slot_count} ảnh
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
