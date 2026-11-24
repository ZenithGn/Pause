import type { AndroidApkMetadata } from "./apk-config";
import { DownloadActions } from "./DownloadActions";
import { QrCodeCard } from "./QrCodeCard";
import styles from "./DownloadHero.module.css";

interface DownloadHeroProps {
  apkMeta: AndroidApkMetadata;
}

export function DownloadHero({ apkMeta }: DownloadHeroProps) {
  return (
    <section className={styles.heroSection} aria-labelledby="download-hero-title">
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <div className={styles.versionBadge}>
              <span className={styles.versionDot} aria-hidden="true" />
              <span>{apkMeta.versionLabel}</span>
            </div>

            <h1 id="download-hero-title" className={styles.headline}>
              Mang cả phòng ảnh Photobooth vào{" "}
              <em className={styles.headlineAccent}>túi bạn</em>
            </h1>

            <p className={styles.description}>
              Lưu giữ trọn vẹn kỷ niệm theo từng Ngăn kéo riêng tư, chia sẻ cùng
              người thương và biến ảnh số thành dải ảnh Photobooth cầm tay với
              chất lượng in 200gsm giao tận nhà.
            </p>

            <DownloadActions
              apkUrl={apkMeta.url}
              isDirectApk={apkMeta.isDirectApk}
              isBetaRelease={apkMeta.isBetaRelease}
            />
          </div>

          <div className={styles.rightCol}>
            <QrCodeCard apkUrl={apkMeta.url} />
          </div>
        </div>
      </div>
    </section>
  );
}
