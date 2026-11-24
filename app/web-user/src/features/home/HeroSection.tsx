import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import styles from "./Home.module.css";

interface HeroSectionProps {
  /** Compact 3D camera stage rendered cleanly inside Hero on mobile (`< 900px`). */
  mobileCameraSlot?: ReactNode;
}

export function HeroSection({ mobileCameraSlot }: HeroSectionProps) {
  return (
    <section
      className={styles.hero}
      aria-labelledby="hero-heading"
      data-camera-zone="hero"
    >
      <div className={styles.heroGrain} aria-hidden="true" />
      <div className={styles.heroFrame} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>
            LƯU TRỮ KỶ NIỆM &amp; IN PHOTOBOOTH
          </span>

          <h1 id="hero-heading" className={styles.heroTitle}>
            Dừng lại, lưu giữ,{" "}
            <em className={styles.heroAccent}>hiện thực hóa</em> kỷ niệm.
          </h1>

          <p className={styles.heroDescription}>
            Tổ chức ảnh theo từng Ngăn kéo kỷ niệm, chia sẻ cùng người thương và
            biến khoảnh khắc số thành dải ảnh Photobooth cầm tay chỉ trong 3
            bước.
          </p>

          <div className={styles.heroActions}>
            <Link href="/preview" className={styles.primaryLightBtn}>
              <span>Thử mẫu in 3D</span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/download" className={styles.secondaryGoldBtn}>
              <Download size={17} aria-hidden="true" />
              <span>Tải ứng dụng Android</span>
            </Link>
          </div>

          <div className={styles.heroMetrics} aria-label="Thông số nổi bật">
            <span>Miễn phí 3 ngăn kéo</span>
            <span className={styles.metricDot} aria-hidden="true">
              ·
            </span>
            <span>50 ảnh / ngăn kéo</span>
            <span className={styles.metricDot} aria-hidden="true">
              ·
            </span>
            <span>In ấn giao tận nơi</span>
          </div>
        </div>

        {mobileCameraSlot ? (
          <div className={styles.heroMobileCameraSlot}>{mobileCameraSlot}</div>
        ) : null}
      </div>
    </section>
  );
}
