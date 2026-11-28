import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { AndroidApkMetadata } from "./apk-config";
import { DownloadActions } from "./DownloadActions";
import { QrCodeCard } from "./QrCodeCard";
import styles from "./DownloadHero.module.css";

export interface DownloadSelectedPreview {
  templateId: string;
  templateName: string;
  coverLabel: string;
  paperLabel: string;
  estimatedPriceLabel: string;
}

interface DownloadHeroProps {
  apkMeta: AndroidApkMetadata;
  selectedPreview?: DownloadSelectedPreview;
}

export function DownloadHero({ apkMeta, selectedPreview }: DownloadHeroProps) {
  return (
    <section className={styles.heroSection} aria-labelledby="download-hero-title">
      <div className={styles.container}>
        {selectedPreview ? (
          <div className={styles.handoffBanner} role="region" aria-label="Cấu hình bạn vừa chọn">
            <div className={styles.handoffInfo}>
              <span className={styles.handoffTag}>
                <Sparkles size={13} aria-hidden="true" />
                <span>Cấu hình vừa xem ở Studio 3D</span>
              </span>
              <p className={styles.handoffSummary}>
                <strong>{selectedPreview.templateName}</strong> ·{" "}
                {selectedPreview.coverLabel} · {selectedPreview.paperLabel} ·{" "}
                <strong className={styles.handoffPrice}>
                  {selectedPreview.estimatedPriceLabel}
                </strong>
              </p>
            </div>
            <Link
              href={`/preview?template=${encodeURIComponent(selectedPreview.templateId)}`}
              className={styles.handoffBackLink}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Đổi mẫu ở Studio 3D</span>
            </Link>
          </div>
        ) : null}

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
              Tải ứng dụng Pause cho Android để lưu giữ kỷ niệm theo ngăn kéo
              và đặt in ảnh photobooth trực tiếp.
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
