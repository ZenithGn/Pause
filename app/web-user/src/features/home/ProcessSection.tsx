import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import type { PublicTemplate } from "@/types/catalog";
import styles from "./Home.module.css";

interface ProcessSectionProps {
  templates: PublicTemplate[];
}

const STEPS = [
  {
    number: "01",
    title: "Chọn mẫu Photobooth",
    description:
      "Khám phá các bố cục Cổ điển, Vintage, Minimal, Polaroid và kho mẫu ép kim VIP Gold.",
  },
  {
    number: "02",
    title: "Fill ảnh từ Ngăn kéo",
    description:
      "Tự động căn khung chuẩn tỷ lệ không méo ảnh, kèm lời nhắn và ngày kỷ niệm riêng.",
  },
  {
    number: "03",
    title: "Đặt in & Nhận tận tay",
    description:
      "Chọn giấy mỹ thuật 200gsm, bìa cứng hoặc bìa mềm, theo dõi trạng thái in giao tận nơi.",
  },
] as const;

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
  const { width, height, background_color, slots } = template.layout_config;
  const slotFill = template.is_premium ? "#2A2525" : "#E9E4DE";
  const strokeColor = template.is_premium ? "#C59B38" : "#D6CFC7";
  const safeId = template.id.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={styles.templateSvg}
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
        width={width}
        height={height}
        rx={28}
        fill={background_color || "#FFFFFF"}
        stroke={strokeColor}
        strokeWidth={16}
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
          <span className={styles.eyebrow}>IN PHOTOBOOTH THEO YÊU CẦU</span>
          <h2 id="process-heading" className={styles.sectionHeading}>
            Từ khoảnh khắc số đến dải ảnh cầm tay trong 3 bước
          </h2>
          <p className={styles.sectionLead}>
            Xem trước trực quan từng đường nét ép kim và độ dày giấy in trên
            sân khấu 3D trước khi mở app đặt in.
          </p>
        </div>

        <ol className={styles.processStepsGrid}>
          {STEPS.map((step) => (
            <li key={step.number} className={styles.processStepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </li>
          ))}
        </ol>

        <div className={styles.processCallout}>
          <p className={styles.calloutText}>
            Thử ghép ảnh từ máy lên mẫu in 3D ngay trên trình duyệt — không
            tải ảnh lên server.
          </p>
          <Link href="/preview" className={styles.wineCtaBtn}>
            <span>Trải nghiệm xoay mẫu in 3D ngay</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.templatesShowcase}>
          <div className={styles.templatesHeader}>
            <div>
              <h3 className={styles.templatesTitle}>
                Kho mẫu in Photobooth nổi bật
              </h3>
              <p className={styles.templatesSub}>
                Chọn một mẫu bên dưới để mở trực tiếp trong Studio Preview 3D.
              </p>
            </div>
            <Link href="/preview" className={styles.templatesLink}>
              <span>Xem toàn bộ mẫu trong Studio 3D</span>
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
