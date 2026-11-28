"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { PhotoTone, PublicTemplate } from "@/types/catalog";
import {
  partitionImageFiles,
  PHOTO_TONE_OPTIONS,
  type SlotPhotoMap,
} from "./preview-state";
import styles from "./PreviewStudio.module.css";

interface PhotoSlotManagerProps {
  template: PublicTemplate;
  slotPhotos: SlotPhotoMap;
  caption: string;
  photoTone: PhotoTone;
  onCaptionChange: (nextCaption: string) => void;
  onPhotoToneChange: (nextTone: PhotoTone) => void;
  onFilesSelected: (files: File[]) => void;
  onReplaceSlotFile: (slotIndex: number, file: File) => void;
  onSwapSlots: (indexA: number, indexB: number) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onFillSamplePhotos: () => void;
  onClearAllPhotos: () => void;
}

/**
 * Client-side multi-file upload, drag-and-drop, per-slot editing, film tone presets, and live caption controls.
 */
export function PhotoSlotManager({
  template,
  slotPhotos,
  caption,
  photoTone,
  onCaptionChange,
  onPhotoToneChange,
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const slots = template.layout_config.slots;
  const filledCount = slots.filter((slot) => Boolean(slotPhotos[slot.index])).length;
  const defaultCaptionHint =
    template.layout_config.texts[0]?.content || "Kỷ niệm cùng Pause";

  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  useEffect(() => {
    if (filledCount === 0 && confirmClear) {
      setConfirmClear(false);
    }
  }, [filledCount, confirmClear]);

  const reportRejectedFiles = (rejectedNames: string[]) => {
    if (rejectedNames.length === 0) {
      setUploadError(null);
      return;
    }
    const previewNames = rejectedNames.slice(0, 2).join(", ");
    const extra = rejectedNames.length > 2 ? ` và ${rejectedNames.length - 2} tệp khác` : "";
    setUploadError(
      `Không hỗ trợ định dạng của ${previewNames}${extra}. Vui lòng chọn ảnh JPG, PNG hoặc WebP.`
    );
  };

  const handleMultiFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { valid, rejectedNames } = partitionImageFiles(event.target.files);
    reportRejectedFiles(rejectedNames);
    if (valid.length > 0) {
      setConfirmClear(false);
      onFilesSelected(valid);
    }
    event.target.value = "";
  };

  const handleSingleSlotChange = (
    slotIndex: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { valid, rejectedNames } = partitionImageFiles(event.target.files);
    reportRejectedFiles(rejectedNames);
    const first = valid[0];
    if (first) {
      setConfirmClear(false);
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
    const { valid, rejectedNames } = partitionImageFiles(event.dataTransfer.files);
    reportRejectedFiles(rejectedNames);
    if (valid.length > 0) {
      setConfirmClear(false);
      onFilesSelected(valid);
    }
  };

  const handleClearClick = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setUploadError(null);
    onClearAllPhotos();
  };

  return (
    <section
      id="studio-section-photos"
      aria-label="Chọn ảnh và lời nhắn"
      className={styles.sectionStack}
    >
      <div className={styles.sectionIntro}>
        <span className={styles.stepIndexTag}>BƯỚC 02</span>
        <h2 className={styles.sectionHeading}>Chọn ảnh, Tone màu &amp; Chữ</h2>
        <p className={styles.sectionDescription}>
          Đã điền{" "}
          <strong className={styles.monoInline}>
            {filledCount}/{slots.length}
          </strong>{" "}
          khung ảnh trên mẫu <strong>{template.name}</strong>.
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
        <p className={styles.dropZoneTitle}>Kéo &amp; thả ảnh vào đây hoặc lên khung 3D</p>
        <p className={styles.dropZoneSub}>
          Hỗ trợ JPG, PNG, WebP · Tự động căn khung không méo ảnh
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
            className={styles.secondarySmallButton}
            onClick={onFillSamplePhotos}
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Điền ảnh mẫu nhanh</span>
          </button>

          <button
            type="button"
            className={
              confirmClear ? styles.ghostDangerConfirmButton : styles.ghostDangerButton
            }
            disabled={filledCount === 0}
            onClick={handleClearClick}
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>{confirmClear ? "Xác nhận xóa tất cả?" : "Xóa toàn bộ ảnh"}</span>
          </button>
        </div>
      </div>

      {uploadError ? (
        <div className={styles.uploadErrorAlert} role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{uploadError}</span>
        </div>
      ) : null}

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
                <div className={styles.slotTitleRow}>
                  <span className={styles.slotTitle}>Khung {slot.index + 1}</span>
                  {entry && !entry.isObjectUrl ? (
                    <span className={styles.sampleSourceTag}>Ảnh mẫu</span>
                  ) : null}
                </div>
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

      {/* Film color tone presets */}
      <div className={styles.optionGroup}>
        <div className={styles.optionGroupHeader}>
          <Palette size={15} aria-hidden="true" />
          <span>Tone màu ảnh trên khung</span>
        </div>
        <div className={styles.toneRow} role="group" aria-label="Chọn tone màu ảnh">
          {PHOTO_TONE_OPTIONS.map((tone) => {
            const isActive = photoTone === tone.key;
            return (
              <button
                key={tone.key}
                type="button"
                aria-pressed={isActive}
                className={`${styles.toneChip} ${
                  isActive ? styles.toneChipActive : ""
                }`}
                onClick={() => onPhotoToneChange(tone.key)}
              >
                {tone.label}
              </button>
            );
          })}
        </div>
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
      </div>
    </section>
  );
}
