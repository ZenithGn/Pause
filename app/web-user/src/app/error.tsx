"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import styles from "./status-page.module.css";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ reset }: ErrorPageProps) {
  return (
    <section className={styles.wrapper} aria-labelledby="error-page-title">
      <div className={styles.card}>
        <span className={styles.codePill}>Đã xảy ra sự cố</span>
        <h1 id="error-page-title" className={styles.title}>
          Không thể tải trang lúc này
        </h1>
        <p className={styles.description}>
          Một lỗi tạm thời vừa xảy ra khi hiển thị nội dung. Bạn có thể thử tải
          lại ngay hoặc quay về trang chủ Pause.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={reset} className={styles.primaryBtn}>
            <RefreshCw size={16} aria-hidden="true" />
            <span>Thử tải lại</span>
          </button>
          <Link href="/" className={styles.secondaryBtn}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}
