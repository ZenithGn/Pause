import type { Metadata } from "next";
import { getAndroidApkMetadata } from "@/features/download/apk-config";
import {
  DownloadHero,
  type DownloadSelectedPreview,
} from "@/features/download/DownloadHero";
import { InstallSteps } from "@/features/download/InstallSteps";
import {
  estimatePrintPriceVnd,
  formatVnd,
  getPublicTemplates,
} from "@/lib/catalog-data";
import type { CoverType, PaperType } from "@/types/catalog";

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
    </>
  );
}
