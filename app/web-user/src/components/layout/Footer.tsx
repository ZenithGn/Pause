import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <div className={styles.brandBlock}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">
                P
              </span>
              <span className={styles.brandWordmark}>Pause</span>
            </Link>
            <p className={styles.slogan}>
              Dừng lại, lưu giữ, hiện thực hóa kỷ niệm.
            </p>
          </div>

          <nav className={styles.links} aria-label="Điều hướng chân trang">
            <Link href="/" className={styles.link}>
              Trang chủ
            </Link>
            <Link href="/preview" className={styles.link}>
              Preview mẫu in
            </Link>
            <Link href="/download" className={styles.link}>
              Tải phần mềm
            </Link>
          </nav>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottomRow}>
          <p className={styles.projectNote}>
            Dự án khởi nghiệp sinh viên FPT University (EXE) — Lưu trữ Ngăn kéo Kỷ niệm &amp; In ấn Photobooth theo yêu cầu.
          </p>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Pause Studio.
          </p>
        </div>
      </div>
    </footer>
  );
}
