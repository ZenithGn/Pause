import { FolderHeart, PackageCheck, QrCode, ShieldCheck } from "lucide-react";
import { buildQrSvgData } from "./qr-svg";
import styles from "./DownloadHero.module.css";

interface QrCodeCardProps {
  apkUrl: string;
}

const TRUST_HIGHLIGHTS = [
  {
    icon: FolderHeart,
    title: "Lưu trữ Ngăn kéo miễn phí",
    detail: "Tạo ngay 3 ngăn kéo kỷ niệm, tối đa 50 ảnh mỗi ngăn kéo.",
  },
  {
    icon: ShieldCheck,
    title: "VietQR / PayOS tự động",
    detail: "Kích hoạt gói hội viên tức thì hoặc thanh toán COD khi nhận ảnh.",
  },
  {
    icon: PackageCheck,
    title: "In ảnh 200gsm giao toàn quốc",
    detail: "Giấy mỹ thuật sắc nét, chống ẩm và theo dõi đơn hàng realtime.",
  },
];

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
        Mở camera hoặc trình quét QR trên điện thoại Android để truy cập trực
        tiếp trang tải bản cài đặt mới nhất.
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

      <ul className={styles.trustList} aria-label="Điểm nổi bật của ứng dụng Pause">
        {TRUST_HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className={styles.trustItem}>
              <span className={styles.trustIconWrap} aria-hidden="true">
                <Icon size={17} />
              </span>
              <div>
                <p className={styles.trustTitle}>{item.title}</p>
                <p className={styles.trustDetail}>{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
