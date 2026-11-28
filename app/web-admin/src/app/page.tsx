import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.badge}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Pause Platform</span>
        </span>
        <h1 className={styles.title}>Dừng lại, lưu giữ, hiện thực hóa kỷ niệm</h1>
        <p className={styles.description}>
          Trang chủ giới thiệu sản phẩm Pause đang được hoàn thiện riêng. Đội ngũ vận hành có thể truy cập trực tiếp vào cổng quản trị hệ thống.
        </p>
        <div className={styles.actions}>
          <Link href="/admin/login" className={styles.cta}>
            <span>Đăng nhập Quản trị viên</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
