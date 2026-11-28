import { QrCode } from "lucide-react";
import { buildQrSvgData } from "./qr-svg";
import styles from "./DownloadHero.module.css";

interface QrCodeCardProps {
  apkUrl: string;
}

export function QrCodeCard({ apkUrl }: QrCodeCardProps) {
  const qr = buildQrSvgData(apkUrl, 2);

  return (
    <aside className={styles.qrCard} aria-label="Quét mã QR tải ứng dụng">
      <div className={styles.qrHeader}>
        <div className={styles.qrTitleGroup}>
          <QrCode size={18} className={styles.qrHeaderIcon} aria-hidden="true" />
          <h2 className={styles.qrTitle}>Quét mã QR bằng điện thoại</h2>
        </div>
        <span className={styles.qrTag}>Android APK</span>
      </div>

      <p className={styles.qrSubtitle}>
        Mở camera trên điện thoại Android để tải trực tiếp tệp cài đặt mới
        nhất.
      </p>

      <div className={styles.qrFrame}>
        <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />

        <svg
          viewBox={`0 0 ${qr.totalSize} ${qr.totalSize}`}
          className={styles.qrSvg}
          role="img"
          aria-label={`Mã QR dẫn tới ${apkUrl}`}
          shapeRendering="crispEdges"
        >
          <rect width={qr.totalSize} height={qr.totalSize} fill="#FFFFFF" />
          <path d={qr.pathData} fill="#630D11" />
        </svg>
      </div>
    </aside>
  );
}
