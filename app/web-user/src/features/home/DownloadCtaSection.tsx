import Link from "next/link";
import { CheckCircle2, Download, Sparkles } from "lucide-react";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import styles from "./Home.module.css";

const CTA_HIGHLIGHTS = [
  "Android 8.0+ · Cài đặt nhanh qua file APK",
  "Đồng bộ tức thì ngăn kéo bạn bè chia sẻ",
  "Theo dõi tiến trình in trực tiếp trên app",
] as const;

export function DownloadCtaSection() {
  return (
    <section
      className={styles.ctaSection}
      aria-labelledby="final-cta-heading"
    >
      <div className={styles.sectionContainer}>
        <div className={styles.ctaGrid}>
          <div className={styles.ctaEditorialBlock}>
            <span className={styles.ctaEyebrow}>ỨNG DỤNG ANDROID</span>
            <h2 id="final-cta-heading" className={styles.ctaHeading}>
              Mở ngăn kéo đầu tiên trên điện thoại
            </h2>
            <p className={styles.ctaCopy}>
              Tạo ngăn kéo miễn phí, mời bạn bè góp ảnh và đặt in trực tiếp trên
              Pause Android.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/download" className={styles.primaryLightBtn}>
                <Download size={17} aria-hidden="true" />
                <span>Tải ứng dụng Android</span>
              </Link>
            </div>
          </div>

          <div className={styles.ctaShowcaseCard} aria-label="Bản in thực tế từ Pause">
            <div className={styles.ctaStripsFan} aria-hidden="true">
              <div className={`${styles.ctaMiniStrip} ${styles.ctaMiniStripBack}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAMPLE_PHOTO_URLS[0]}
                  alt=""
                  className={styles.ctaMiniStripImg}
                  loading="lazy"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAMPLE_PHOTO_URLS[1]}
                  alt=""
                  className={styles.ctaMiniStripImg}
                  loading="lazy"
                />
                <span className={styles.ctaMiniStripBrand}>Classic White</span>
              </div>

              <div className={`${styles.ctaMiniStrip} ${styles.ctaMiniStripFront}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAMPLE_PHOTO_URLS[3]}
                  alt=""
                  className={styles.ctaMiniStripImg}
                  loading="lazy"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAMPLE_PHOTO_URLS[2]}
                  alt=""
                  className={styles.ctaMiniStripImg}
                  loading="lazy"
                />
                <span className={styles.ctaMiniStripBrandVip}>PAUSE GOLD · 200GSM</span>
              </div>
            </div>

            <div className={styles.ctaShowcaseBody}>
              <span className={styles.ctaShowcaseBadge}>
                <Sparkles size={13} aria-hidden="true" />
                <span>Trọn vẹn từ màn hình đến tay bạn</span>
              </span>
              <ul className={styles.ctaHighlightList}>
                {CTA_HIGHLIGHTS.map((item) => (
                  <li key={item} className={styles.ctaHighlightItem}>
                    <CheckCircle2
                      size={16}
                      className={styles.ctaHighlightIcon}
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
