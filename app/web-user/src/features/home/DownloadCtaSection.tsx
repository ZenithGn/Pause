import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, Sparkles } from "lucide-react";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import styles from "./Home.module.css";

const CTA_HIGHLIGHTS = [
  "Miễn phí 3 ngăn kéo đầu tiên (tối đa 50 ảnh / ngăn)",
  "Thanh toán VietQR / PayOS tự động hoặc COD khi nhận ảnh",
  "Giấy mỹ thuật satin 200gsm chống ẩm, giao hàng toàn quốc",
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
            <span className={styles.ctaEyebrow}>BẮT ĐẦU CÙNG PAUSE</span>
            <h2 id="final-cta-heading" className={styles.ctaHeading}>
              Sẵn sàng mở ngăn kéo kỷ niệm đầu tiên?
            </h2>
            <p className={styles.ctaCopy}>
              Tải ứng dụng Pause cho Android để lưu giữ miễn phí 3 ngăn kéo đầu
              tiên, chia sẻ cùng bạn bè và đặt in photobooth giao tận tay.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/download" className={styles.primaryLightBtn}>
                <Download size={17} aria-hidden="true" />
                <span>Tải ứng dụng</span>
              </Link>
              <Link href="/preview" className={styles.secondaryGoldBtn}>
                <span>Preview mẫu in 3D</span>
                <ArrowRight size={17} aria-hidden="true" />
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
