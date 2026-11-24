import type { Metadata } from "next";
import { PreviewStudio } from "@/features/preview/PreviewStudio";
import { getPublicTemplates } from "@/lib/catalog-data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Studio Preview Mẫu In 3D",
  description:
    "Chọn mẫu in Photobooth, thử ảnh cá nhân ngay trên trình duyệt và xoay 360° vật thể bản in 3D chân thực.",
};

interface PreviewPageProps {
  searchParams: Promise<{ template?: string | string[] }>;
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const [templates, resolvedParams] = await Promise.all([
    getPublicTemplates(),
    searchParams,
  ]);

  const rawTemplate = resolvedParams?.template;
  const initialTemplateId = Array.isArray(rawTemplate)
    ? rawTemplate[0]
    : rawTemplate;

  return (
    <PreviewStudio
      templates={templates}
      initialTemplateId={initialTemplateId}
    />
  );
}
