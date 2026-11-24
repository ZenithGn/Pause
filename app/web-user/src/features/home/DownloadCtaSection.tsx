import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import styles from "./Home.module.css";

export function DownloadCtaSection() {
  return (
    <section
      className={styles.ctaSection}
      aria-labelledby="final-cta-heading"
      data-camera-zone="cta"
    >
      <div className={styles.sectionContainer}>
        <div className={styles.ctaGrid}>
          <div className={styles.ctaCard}>
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

          <div aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
