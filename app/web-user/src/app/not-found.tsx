import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import styles from "./status-page.module.css";

export default function NotFoundPage() {
  return (
    <section className={styles.wrapper} aria-labelledby="not-found-title">
      <div className={styles.card}>
        <span className={styles.codePill}>404 · Không tìm thấy trang</span>
        <h1 id="not-found-title" className={styles.title}>
          Ngăn kéo này chưa có kỷ niệm nào
        </h1>
        <p className={styles.description}>
          Liên kết bạn truy cập có thể đã thay đổi hoặc không tồn tại trên Pause.
          Hãy quay về trang chủ hoặc thử xoay mẫu in Photobooth 3D ngay nhé.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryBtn}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Về trang chủ</span>
          </Link>
          <Link href="/preview" className={styles.secondaryBtn}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Mở Preview mẫu in 3D</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
