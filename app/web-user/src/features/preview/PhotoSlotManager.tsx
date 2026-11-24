"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { PublicTemplate } from "@/types/catalog";
import { ACCEPTED_IMAGE_MIME_TYPES, type SlotPhotoMap } from "./preview-state";
import styles from "./PreviewStudio.module.css";

interface PhotoSlotManagerProps {
  template: PublicTemplate;
  slotPhotos: SlotPhotoMap;
  caption: string;
  onCaptionChange: (nextCaption: string) => void;
  onFilesSelected: (files: File[]) => void;
  onReplaceSlotFile: (slotIndex: number, file: File) => void;
  onSwapSlots: (indexA: number, indexB: number) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onFillSamplePhotos: () => void;
  onClearAllPhotos: () => void;
}

function filterAcceptedImageFiles(fileList: FileList | null): File[] {
  if (!fileList || fileList.length === 0) return [];
  return Array.from(fileList).filter((file) => {
    if (ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
      return true;
    }
    const lowerName = file.name.toLowerCase();
    return (
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".webp")
    );
  });
}

/**
 * Client-side multi-file upload, drag-and-drop, per-slot editing, and live caption controls.
 */
export function PhotoSlotManager({
  template,
  slotPhotos,
  caption,
  onCaptionChange,
  onFilesSelected,
  onReplaceSlotFile,
  onSwapSlots,
  onRemoveSlot,
  onFillSamplePhotos,
  onClearAllPhotos,
}: PhotoSlotManagerProps) {
  const multiInputRef = useRef<HTMLInputElement>(null);
  const slotInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [isDragging, setIsDragging] = useState(false);

  const slots = template.layout_config.slots;
  const filledCount = slots.filter((slot) => Boolean(slotPhotos[slot.index])).length;
  const defaultCaptionHint =
    template.layout_config.texts[0]?.content || "Kỷ niệm cùng Pause";

  const handleMultiFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const validFiles = filterAcceptedImageFiles(event.target.files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
    event.target.value = "";
  };

  const handleSingleSlotChange = (
    slotIndex: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const validFiles = filterAcceptedImageFiles(event.target.files);
    const first = validFiles[0];
    if (first) {
      onReplaceSlotFile(slotIndex, first);
    }
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const validFiles = filterAcceptedImageFiles(event.dataTransfer.files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  return (
    <section aria-label="Chọn ảnh và lời nhắn" className={styles.sectionStack}>
      <div className={styles.sectionIntro}>
        <h2 className={styles.sectionHeading}>Chọn ảnh & Chữ kỷ niệm</h2>
        <p className={styles.sectionDescription}>
          Đã điền {filledCount}/{slots.length} khung ảnh trên mẫu{" "}
          <strong>{template.name}</strong>.
        </p>
      </div>

      {/* Dropzone & multi-upload */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={multiInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Chọn nhiều ảnh từ máy"
          onChange={handleMultiFileChange}
        />

        <div className={styles.dropZoneIcon} aria-hidden="true">
          <Upload size={20} />
        </div>
        <p className={styles.dropZoneTitle}>Kéo & thả ảnh vào đây</p>
        <p className={styles.dropZoneSub}>
          Hỗ trợ JPG, PNG, WebP · Tự động điền lần lượt vào khung trống
        </p>

        <div className={styles.dropZoneActions}>
          <button
            type="button"
            className={styles.primarySmallButton}
            onClick={() => multiInputRef.current?.click()}
          >
            <ImagePlus size={15} aria-hidden="true" />
            <span>Chọn ảnh từ máy</span>
          </button>

          <button
            type="button"
            className={styles.goldOutlineButton}
            onClick={onFillSamplePhotos}
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Điền ảnh mẫu nhanh</span>
          </button>

          <button
            type="button"
            className={styles.ghostDangerButton}
            disabled={filledCount === 0}
            onClick={onClearAllPhotos}
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Xóa toàn bộ ảnh</span>
          </button>
        </div>
      </div>

      <p className={styles.privacyNotice}>
        <ShieldCheck size={15} aria-hidden="true" />
        <span>
          Ảnh chỉ hiển thị trực tiếp trên trình duyệt của bạn, không tải lên máy chủ.
        </span>
      </p>

      {/* Per-slot list */}
      <div className={styles.slotList}>
        {slots.map((slot, listIdx) => {
          const entry = slotPhotos[slot.index];
          const isFirst = listIdx === 0;
          const isLast = listIdx === slots.length - 1;
          const prevSlotIndex = !isFirst ? slots[listIdx - 1].index : -1;
          const nextSlotIndex = !isLast ? slots[listIdx + 1].index : -1;

          return (
            <div key={slot.index} className={styles.slotRow}>
              <input
                ref={(el) => {
                  slotInputRefs.current[slot.index] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label={`Đổi ảnh cho khung ${slot.index + 1}`}
                onChange={(event) => handleSingleSlotChange(slot.index, event)}
              />

              <div className={styles.slotThumbWrap}>
                {entry ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.url}
                    alt={`Xem trước ảnh khung ${slot.index + 1}`}
                    className={styles.slotThumb}
                  />
                ) : (
                  <span className={styles.slotThumbEmpty}>{slot.index + 1}</span>
                )}
              </div>

              <div className={styles.slotInfo}>
                <span className={styles.slotTitle}>Khung {slot.index + 1}</span>
                <span className={styles.slotFilename}>
                  {entry ? entry.name : "Chưa có ảnh"}
                </span>
              </div>

              <div className={styles.slotActions}>
                <button
                  type="button"
                  className={styles.slotIconButton}
                  title="Đổi ảnh"
                  aria-label={`Đổi ảnh khung ${slot.index + 1}`}
                  onClick={() => slotInputRefs.current[slot.index]?.click()}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={styles.slotIconButton}
                  title="Đưa lên trên"
                  aria-label={`Đưa khung ${slot.index + 1} lên`}
                  disabled={isFirst}
                  onClick={() => onSwapSlots(slot.index, prevSlotIndex)}
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={styles.slotIconButton}
                  title="Đưa xuống dưới"
                  aria-label={`Đưa khung ${slot.index + 1} xuống`}
                  disabled={isLast}
                  onClick={() => onSwapSlots(slot.index, nextSlotIndex)}
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={`${styles.slotIconButton} ${styles.slotDeleteButton}`}
                  title="Xóa ảnh"
                  aria-label={`Xóa ảnh khung ${slot.index + 1}`}
                  disabled={!entry}
                  onClick={() => onRemoveSlot(slot.index)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live caption input */}
      <div className={styles.captionField}>
        <label htmlFor="preview-caption-input" className={styles.fieldLabel}>
          Lời nhắn / Chú thích in trên khung
        </label>
        <input
          id="preview-caption-input"
          type="text"
          maxLength={60}
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder={`Ví dụ: ${defaultCaptionHint}`}
          className={styles.textInput}
        />
        <span className={styles.fieldHelper}>
          Cập nhật trực tiếp lên mặt trước bản in 3D (tối đa 60 ký tự).
        </span>
      </div>
    </section>
  );
}
