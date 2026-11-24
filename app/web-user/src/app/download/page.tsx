import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAndroidApkMetadata } from "@/features/download/apk-config";
import { DownloadHero } from "@/features/download/DownloadHero";
import { InstallSteps } from "@/features/download/InstallSteps";
import { DownloadFaq } from "@/features/download/DownloadFaq";
import styles from "@/features/download/DownloadBottomCta.module.css";

export const metadata: Metadata = {
  title: "Tải phần mềm",
  description:
    "Tải ứng dụng Pause cho Android (APK), quét mã QR cài đặt nhanh trong 3 bước và khám phá kho lưu trữ Ngăn kéo Kỷ niệm cùng dịch vụ in Photobooth 200gsm.",
};

export default function DownloadPage() {
  const apkMeta = getAndroidApkMetadata(process.env.NEXT_PUBLIC_ANDROID_APK_URL);

  return (
    <>
      <DownloadHero apkMeta={apkMeta} />
      <InstallSteps />
      <DownloadFaq />

      <section className={styles.ctaSection} aria-labelledby="download-preview-cta">
        <div className={styles.container}>
          <div className={styles.banner}>
            <div className={styles.textBlock}>
              <p className={styles.eyebrow}>TRẢI NGHIỆM TRƯỚC KHI CÀI ĐẶT</p>
              <h2 id="download-preview-cta" className={styles.title}>
                Thử ghép ảnh vào mẫu Photobooth 3D ngay trên trình duyệt
              </h2>
              <p className={styles.description}>
                Xoay 360° vật thể in, thử chất liệu bìa cứng và giấy mỹ thuật
                200gsm mà không cần tải ảnh lên máy chủ.
              </p>
            </div>
            <Link href="/preview" className={styles.ctaButton}>
              <span>Mở Studio Preview 3D</span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
