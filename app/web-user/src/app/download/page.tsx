import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAndroidApkMetadata } from "@/features/download/apk-config";
import {
  DownloadHero,
  type DownloadSelectedPreview,
} from "@/features/download/DownloadHero";
import { InstallSteps } from "@/features/download/InstallSteps";
import { DownloadFaq } from "@/features/download/DownloadFaq";
import {
  estimatePrintPriceVnd,
  formatVnd,
  getPublicTemplates,
} from "@/lib/catalog-data";
import type { CoverType, PaperType } from "@/types/catalog";
import styles from "@/features/download/DownloadBottomCta.module.css";

export const metadata: Metadata = {
  title: "Tải phần mềm",
  description:
    "Tải ứng dụng Pause cho Android (APK), quét mã QR cài đặt nhanh trong 3 bước và khám phá kho lưu trữ Ngăn kéo Kỷ niệm cùng dịch vụ in Photobooth 200gsm.",
};

interface DownloadPageProps {
  searchParams?: Promise<{
    template?: string | string[];
    cover?: string | string[];
    paper?: string | string[];
  }>;
}

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DownloadPage({ searchParams }: DownloadPageProps) {
  const apkMeta = getAndroidApkMetadata(process.env.NEXT_PUBLIC_ANDROID_APK_URL);
  const resolvedParams = searchParams ? await searchParams : undefined;
  const requestedTemplateId = firstParam(resolvedParams?.template);

  let selectedPreview: DownloadSelectedPreview | undefined;
  if (requestedTemplateId) {
    const templates = await getPublicTemplates();
    const matched = templates.find((tpl) => tpl.id === requestedTemplateId);
    if (matched) {
      const coverType: CoverType =
        firstParam(resolvedParams?.cover) === "hard" ? "hard" : "soft";
      const paperType: PaperType =
        firstParam(resolvedParams?.paper) === "premium" ? "premium" : "standard";
      const totalVnd = estimatePrintPriceVnd(matched.slot_count, coverType, paperType);

      selectedPreview = {
        templateId: matched.id,
        templateName: matched.name,
        coverLabel: coverType === "hard" ? "Bìa cứng cao cấp" : "Bìa mềm",
        paperLabel:
          paperType === "premium" ? "Giấy mỹ thuật 200gsm" : "Giấy tiêu chuẩn",
        estimatedPriceLabel: formatVnd(totalVnd),
      };
    }
  }

  return (
    <>
      <DownloadHero apkMeta={apkMeta} selectedPreview={selectedPreview} />
      <InstallSteps />
      <DownloadFaq />

      {!selectedPreview ? (
        <section className={styles.ctaSection} aria-labelledby="download-preview-cta">
          <div className={styles.container}>
            <div className={styles.banner}>
              <div className={styles.textBlock}>
                <p className={styles.eyebrow}>TRẢI NGHIỆM TRƯỚC KHI CÀI</p>
                <h2 id="download-preview-cta" className={styles.title}>
                  Thử ghép ảnh lên mẫu Photobooth 3D
                </h2>
                <p className={styles.description}>
                  Xoay 360° và thử chất liệu giấy ngay trên trình duyệt mà không
                  tải ảnh lên máy chủ.
                </p>
              </div>
              <Link href="/preview" className={styles.ctaButton}>
                <span>Mở Studio Preview 3D</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
