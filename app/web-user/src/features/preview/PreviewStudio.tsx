"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import dynamic from "next/dynamic";
import { Upload } from "lucide-react";
import { PrintPreviewFallback2D } from "@/components/three/PrintPreviewFallback2D";
import { WebGLErrorBoundary } from "@/components/three/WebGLErrorBoundary";
import { FALLBACK_TEMPLATES, SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import type { CoverType, PaperType, PhotoTone, PublicTemplate } from "@/types/catalog";
import { MaterialControls } from "./MaterialControls";
import { PhotoSlotManager } from "./PhotoSlotManager";
import {
  assignEntriesToSlots,
  clearAllSlotEntries,
  fillSampleSlotEntries,
  filterTemplates,
  getActiveSlotPhotoUrls,
  partitionImageFiles,
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

export type StudioSectionKey = "templates" | "photos" | "materials";

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
 * Interactive 3D Print Preview Studio with 60/40 split stage, pre-filled sample preview,
 * direct drag-and-drop onto the 3D stage, and unified single-scroll customization panel.
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
  const [activeJumpKey, setActiveJumpKey] = useState<StudioSectionKey>("templates");

  // Pre-fill sample photos on initial render so the 3D card shows a rich preview immediately
  const [slotPhotos, setSlotPhotos] = useState<SlotPhotoMap>(() => {
    const initialId = resolveInitialTemplateId(safeTemplates, initialTemplateId);
    const initialTpl =
      safeTemplates.find((tpl) => tpl.id === initialId) ?? safeTemplates[0];
    const seedSlots = Math.max(4, initialTpl?.layout_config.slots.length ?? 4);
    return fillSampleSlotEntries({}, SAMPLE_PHOTO_URLS, seedSlots).nextMap;
  });

  const [caption, setCaption] = useState("");
  const [photoTone, setPhotoTone] = useState<PhotoTone>("original");
  const [coverType, setCoverType] = useState<CoverType>("soft");
  const [paperType, setPaperType] = useState<PaperType>("standard");
  const [isStageDragging, setIsStageDragging] = useState(false);

  const panelRef = useRef<HTMLElement>(null);
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

  const totalSlotCount = selectedTemplate.layout_config.slots.length;
  const filledSlotCount = useMemo(
    () => Object.values(activeSlotPhotoUrls).filter(Boolean).length,
    [activeSlotPhotoUrls]
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
    const slotCount = Math.max(4, selectedTemplate.layout_config.slots.length);
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

  const handleStageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer?.types?.includes("Files")) {
      event.preventDefault();
      setIsStageDragging(true);
    }
  };

  const handleStageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsStageDragging(false);
    }
  };

  const handleStageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsStageDragging(false);
    const { valid } = partitionImageFiles(event.dataTransfer.files);
    if (valid.length > 0) {
      handleFilesSelected(valid);
    }
  };

  const jumpToSection = (key: StudioSectionKey) => {
    setActiveJumpKey(key);
    const targetEl = document.getElementById(`studio-section-${key}`);
    if (targetEl && typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={styles.studioPage}>
      <div className={styles.studioGrid}>
        {/* Left 60% 3D Stage (supports direct file drop) */}
        <div
          className={styles.stageColumn}
          onDragOver={handleStageDragOver}
          onDragLeave={handleStageDragLeave}
          onDrop={handleStageDrop}
        >
          <WebGLErrorBoundary
            fallback={
              <PrintPreviewFallback2D
                template={selectedTemplate}
                slotPhotoUrls={activeSlotPhotoUrls}
                caption={caption}
                photoTone={photoTone}
                coverType={coverType}
                paperType={paperType}
                reason="unsupported"
              />
            }
          >
            <DynamicPrintPreviewScene3D
              template={selectedTemplate}
              slotPhotoUrls={activeSlotPhotoUrls}
              caption={caption}
              photoTone={photoTone}
              coverType={coverType}
              paperType={paperType}
            />
          </WebGLErrorBoundary>

          {isStageDragging ? (
            <div className={styles.stageDropOverlay} aria-live="polite">
              <div className={styles.stageDropBox}>
                <Upload size={26} aria-hidden="true" />
                <strong>Thả ảnh vào đây để điền vào mẫu 3D</strong>
                <span>Ảnh chỉ xử lý trên trình duyệt, không tải lên server</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right 40% Unified Single-Scroll Customization Panel */}
        <aside
          ref={panelRef}
          className={styles.panelColumn}
          aria-label="Bảng tùy chỉnh mẫu in"
        >
          <div className={styles.panelHeader}>
            <span className={styles.eyebrow}>STUDIO PREVIEW 3D</span>
            <h1 className={styles.panelTitle}>Thử ảnh trên bản in thật</h1>
          </div>

          <nav className={styles.jumpBar} aria-label="Đi nhanh tới phần tùy chỉnh">
            <button
              type="button"
              className={`${styles.jumpButton} ${
                activeJumpKey === "templates" ? styles.jumpButtonActive : ""
              }`}
              onClick={() => jumpToSection("templates")}
            >
              1. Mẫu in
            </button>
            <button
              type="button"
              className={`${styles.jumpButton} ${
                activeJumpKey === "photos" ? styles.jumpButtonActive : ""
              }`}
              onClick={() => jumpToSection("photos")}
            >
              <span>2. Ảnh &amp; Tone</span>
              <span
                className={styles.tabCountBadge}
                aria-label={`Đã điền ${filledSlotCount} trên ${totalSlotCount} ảnh`}
              >
                {filledSlotCount}/{totalSlotCount}
              </span>
            </button>
            <button
              type="button"
              className={`${styles.jumpButton} ${
                activeJumpKey === "materials" ? styles.jumpButtonActive : ""
              }`}
              onClick={() => jumpToSection("materials")}
            >
              3. Chất liệu
            </button>
          </nav>

          <div className={styles.panelBody}>
            <TemplateSelector
              templates={safeTemplates}
              filteredTemplates={filteredTemplates}
              selectedTemplateId={selectedTemplate.id}
              activeFilter={activeFilter}
              slotPhotos={slotPhotos}
              onFilterChange={setActiveFilter}
              onSelectTemplate={handleSelectTemplate}
            />

            <div className={styles.sectionDivider} />

            <PhotoSlotManager
              template={selectedTemplate}
              slotPhotos={slotPhotos}
              caption={caption}
              photoTone={photoTone}
              onCaptionChange={setCaption}
              onPhotoToneChange={setPhotoTone}
              onFilesSelected={handleFilesSelected}
              onReplaceSlotFile={handleReplaceSlotFile}
              onSwapSlots={handleSwapSlots}
              onRemoveSlot={handleRemoveSlot}
              onFillSamplePhotos={handleFillSamplePhotos}
              onClearAllPhotos={handleClearAllPhotos}
            />

            <div className={styles.sectionDivider} />

            <MaterialControls
              template={selectedTemplate}
              coverType={coverType}
              paperType={paperType}
              onCoverChange={setCoverType}
              onPaperChange={setPaperType}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
