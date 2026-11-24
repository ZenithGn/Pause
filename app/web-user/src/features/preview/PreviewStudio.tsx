"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { WebGLErrorBoundary } from "@/components/three/WebGLErrorBoundary";
import { FALLBACK_TEMPLATES, SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import type { CoverType, PaperType, PublicTemplate } from "@/types/catalog";
import { MaterialControls } from "./MaterialControls";
import { PhotoSlotManager } from "./PhotoSlotManager";
import {
  assignEntriesToSlots,
  clearAllSlotEntries,
  fillSampleSlotEntries,
  filterTemplates,
  getActiveSlotPhotoUrls,
  removeSlotEntry,
  replaceSlotEntry,
  resolveInitialTemplateId,
  swapSlotEntries,
  type SlotPhotoEntry,
  type SlotPhotoMap,
  type TemplateFilterKey,
} from "./preview-state";
import styles from "./PreviewStudio.module.css";
import { TemplateSelector } from "./TemplateSelector";

export type StudioTabKey = "templates" | "photos" | "materials";

const DynamicPrintPreviewScene3D = dynamic(
  () =>
    import("@/components/three/PrintPreviewScene3D").then(
      (mod) => mod.PrintPreviewScene3D
    ),
  {
    ssr: false,
    loading: () => (
      <div className={styles.stageLoading} aria-live="polite">
        <div className={styles.stageSpinner} aria-hidden="true" />
        <p>Đang khởi tạo sân khấu 3D...</p>
      </div>
    ),
  }
);

function revokeUrls(urls: readonly string[]): void {
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
    return;
  }
  for (const url of urls) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

export interface PreviewStudioProps {
  templates: PublicTemplate[];
  initialTemplateId?: string;
}

/**
 * Interactive 3D Print Preview Studio with 60/40 split stage and 3-step customization panel.
 * Strictly client-side photo testing; primary conversion CTA directs users to `/download`.
 */
export function PreviewStudio({
  templates,
  initialTemplateId,
}: PreviewStudioProps) {
  const safeTemplates = templates.length > 0 ? templates : FALLBACK_TEMPLATES;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() =>
    resolveInitialTemplateId(safeTemplates, initialTemplateId)
  );
  const [activeFilter, setActiveFilter] = useState<TemplateFilterKey>("all");
  const [activeTab, setActiveTab] = useState<StudioTabKey>("templates");

  const [slotPhotos, setSlotPhotos] = useState<SlotPhotoMap>({});
  const [caption, setCaption] = useState("");
  const [coverType, setCoverType] = useState<CoverType>("soft");
  const [paperType, setPaperType] = useState<PaperType>("standard");

  const slotPhotosRef = useRef<SlotPhotoMap>(slotPhotos);
  slotPhotosRef.current = slotPhotos;

  // Revoke any remaining client object URLs on unmount
  useEffect(() => {
    return () => {
      const urls: string[] = [];
      for (const entry of Object.values(slotPhotosRef.current)) {
        if (entry?.isObjectUrl) {
          urls.push(entry.url);
        }
      }
      revokeUrls(urls);
    };
  }, []);

  const selectedTemplate = useMemo(
    () =>
      safeTemplates.find((tpl) => tpl.id === selectedTemplateId) ??
      safeTemplates[0],
    [safeTemplates, selectedTemplateId]
  );

  const filteredTemplates = useMemo(
    () => filterTemplates(safeTemplates, activeFilter),
    [safeTemplates, activeFilter]
  );

  const activeSlotPhotoUrls = useMemo(
    () =>
      getActiveSlotPhotoUrls(
        slotPhotos,
        selectedTemplate.layout_config.slots.length
      ),
    [slotPhotos, selectedTemplate]
  );

  const handleSelectTemplate = useCallback((template: PublicTemplate) => {
    setSelectedTemplateId(template.id);
  }, []);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const entries: SlotPhotoEntry[] = files.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
        isObjectUrl: true,
      }));
      const slotCount = selectedTemplate.layout_config.slots.length;

      setSlotPhotos((prev) => {
        const { nextMap, urlsToRevoke } = assignEntriesToSlots(
          prev,
          entries,
          slotCount
        );
        revokeUrls(urlsToRevoke);
        return nextMap;
      });
    },
    [selectedTemplate]
  );

  const handleReplaceSlotFile = useCallback((slotIndex: number, file: File) => {
    const entry: SlotPhotoEntry = {
      url: URL.createObjectURL(file),
      name: file.name,
      isObjectUrl: true,
    };
    setSlotPhotos((prev) => {
      const { nextMap, urlToRevoke } = replaceSlotEntry(prev, slotIndex, entry);
      if (urlToRevoke) {
        revokeUrls([urlToRevoke]);
      }
      return nextMap;
    });
  }, []);

  const handleSwapSlots = useCallback((indexA: number, indexB: number) => {
    setSlotPhotos((prev) => swapSlotEntries(prev, indexA, indexB));
  }, []);

  const handleRemoveSlot = useCallback((slotIndex: number) => {
    setSlotPhotos((prev) => {
      const { nextMap, urlToRevoke } = removeSlotEntry(prev, slotIndex);
      if (urlToRevoke) {
        revokeUrls([urlToRevoke]);
      }
      return nextMap;
    });
  }, []);

  const handleFillSamplePhotos = useCallback(() => {
    const slotCount = selectedTemplate.layout_config.slots.length;
    setSlotPhotos((prev) => {
      const { nextMap, urlsToRevoke } = fillSampleSlotEntries(
        prev,
        SAMPLE_PHOTO_URLS,
        slotCount
      );
      revokeUrls(urlsToRevoke);
      return nextMap;
    });
  }, [selectedTemplate]);

  const handleClearAllPhotos = useCallback(() => {
    setSlotPhotos((prev) => {
      const { nextMap, urlsToRevoke } = clearAllSlotEntries(prev);
      revokeUrls(urlsToRevoke);
      return nextMap;
    });
  }, []);

  return (
    <div className={styles.studioPage}>
      <div className={styles.studioGrid}>
        {/* Left 60% 3D Stage */}
        <div className={styles.stageColumn}>
          <WebGLErrorBoundary
            title="Không gian 3D đang tạm nghỉ"
            description="Trình duyệt chưa hỗ trợ WebGL để hiển thị mô hình bản in 3D. Bạn vẫn có thể chọn mẫu, thử ảnh và xem giá ước tính ở bảng bên cạnh."
          >
            <DynamicPrintPreviewScene3D
              template={selectedTemplate}
              slotPhotoUrls={activeSlotPhotoUrls}
              caption={caption}
              coverType={coverType}
              paperType={paperType}
            />
          </WebGLErrorBoundary>
        </div>

        {/* Right 40% Customization Panel */}
        <aside className={styles.panelColumn} aria-label="Bảng tùy chỉnh mẫu in">
          <div className={styles.panelHeader}>
            <span className={styles.eyebrow}>STUDIO PREVIEW 3D</span>
            <h1 className={styles.panelTitle}>Thử ảnh trên bản in thật</h1>
          </div>

          <div className={styles.tabBar} role="tablist" aria-label="Các bước tùy chỉnh">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "templates"}
              className={`${styles.tabButton} ${
                activeTab === "templates" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("templates")}
            >
              1. Chọn mẫu in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "photos"}
              className={`${styles.tabButton} ${
                activeTab === "photos" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("photos")}
            >
              2. Chọn ảnh &amp; Chữ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "materials"}
              className={`${styles.tabButton} ${
                activeTab === "materials" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("materials")}
            >
              3. Chất liệu &amp; Đặt in
            </button>
          </div>

          <div className={styles.panelBody} role="tabpanel">
            {activeTab === "templates" ? (
              <>
                <TemplateSelector
                  templates={safeTemplates}
                  filteredTemplates={filteredTemplates}
                  selectedTemplateId={selectedTemplate.id}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  onSelectTemplate={handleSelectTemplate}
                />
                <div className={styles.panelFooterNav}>
                  <button
                    type="button"
                    className={styles.stepNextButton}
                    onClick={() => setActiveTab("photos")}
                  >
                    <span>Tiếp: Chọn ảnh &amp; Chữ</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : null}

            {activeTab === "photos" ? (
              <>
                <PhotoSlotManager
                  template={selectedTemplate}
                  slotPhotos={slotPhotos}
                  caption={caption}
                  onCaptionChange={setCaption}
                  onFilesSelected={handleFilesSelected}
                  onReplaceSlotFile={handleReplaceSlotFile}
                  onSwapSlots={handleSwapSlots}
                  onRemoveSlot={handleRemoveSlot}
                  onFillSamplePhotos={handleFillSamplePhotos}
                  onClearAllPhotos={handleClearAllPhotos}
                />
                <div className={styles.panelFooterNav}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setActiveTab("templates")}
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    <span>Chọn mẫu</span>
                  </button>
                  <button
                    type="button"
                    className={styles.stepNextButton}
                    onClick={() => setActiveTab("materials")}
                  >
                    <span>Tiếp: Chất liệu &amp; Đặt in</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : null}

            {activeTab === "materials" ? (
              <>
                <MaterialControls
                  template={selectedTemplate}
                  coverType={coverType}
                  paperType={paperType}
                  onCoverChange={setCoverType}
                  onPaperChange={setPaperType}
                />
                <div className={styles.panelFooterNav}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setActiveTab("photos")}
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    <span>Quay lại ảnh &amp; chữ</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
