"use client";

import Link from "next/link";
import { ArrowRight, Crown, Layers, Sparkles } from "lucide-react";
import {
  calculatePrintPriceBreakdown,
  estimatePrintPriceVnd,
  formatVnd,
} from "@/lib/catalog-data";
import type { CoverType, PaperType, PublicTemplate } from "@/types/catalog";
import { buildDownloadPreviewHref } from "./preview-state";
import styles from "./PreviewStudio.module.css";

interface MaterialControlsProps {
  template: PublicTemplate;
  coverType: CoverType;
  paperType: PaperType;
  onCoverChange: (cover: CoverType) => void;
  onPaperChange: (paper: PaperType) => void;
}

/**
 * Tactile cover/paper material selector, estimated print pricing, VIP notice, and /download CTA.
 */
export function MaterialControls({
  template,
  coverType,
  paperType,
  onCoverChange,
  onPaperChange,
}: MaterialControlsProps) {
  const breakdown = calculatePrintPriceBreakdown(
    template.slot_count,
    coverType,
    paperType
  );
  const totalEstimatedVnd = estimatePrintPriceVnd(
    template.slot_count,
    coverType,
    paperType
  );
  const downloadHref = buildDownloadPreviewHref(template.id, coverType, paperType);

  return (
    <section
      id="studio-section-materials"
      aria-label="Chất liệu và đặt in"
      className={styles.sectionStack}
    >
      <div className={styles.sectionIntro}>
        <span className={styles.stepIndexTag}>BƯỚC 03</span>
        <h2 className={styles.sectionHeading}>Chất liệu &amp; Ước tính đặt in</h2>
        <p className={styles.sectionDescription}>
          Thay đổi loại bìa và giấy để quan sát độ dày cạnh và độ bắt sáng ngay trên mô hình 3D.
        </p>
      </div>

      {/* Cover thickness selection */}
      <div className={styles.optionGroup}>
        <div className={styles.optionGroupHeader}>
          <Layers size={15} aria-hidden="true" />
          <span>Loại bìa in</span>
        </div>

        <div className={styles.optionGrid}>
          <button
            type="button"
            aria-pressed={coverType === "soft"}
            className={`${styles.optionCard} ${
              coverType === "soft" ? styles.optionCardActive : ""
            }`}
            onClick={() => onCoverChange("soft")}
          >
            <span className={styles.optionTitle}>Bìa mềm</span>
            <span className={styles.optionPrice}>+0đ</span>
            <span className={styles.optionDesc}>Mỏng nhẹ, dễ kẹp sổ tay kỷ niệm</span>
          </button>

          <button
            type="button"
            aria-pressed={coverType === "hard"}
            className={`${styles.optionCard} ${
              coverType === "hard" ? styles.optionCardActive : ""
            }`}
            onClick={() => onCoverChange("hard")}
          >
            <span className={styles.optionTitle}>Bìa cứng cao cấp</span>
            <span className={styles.optionPrice}>+15.000đ</span>
            <span className={styles.optionDesc}>Cạnh dày chắc tay, trưng bày bàn học</span>
          </button>
        </div>
      </div>

      {/* Paper finish selection */}
      <div className={styles.optionGroup}>
        <div className={styles.optionGroupHeader}>
          <Sparkles size={15} aria-hidden="true" />
          <span>Chất liệu giấy ảnh</span>
        </div>

        <div className={styles.optionGrid}>
          <button
            type="button"
            aria-pressed={paperType === "standard"}
            className={`${styles.optionCard} ${
              paperType === "standard" ? styles.optionCardActive : ""
            }`}
            onClick={() => onPaperChange("standard")}
          >
            <span className={styles.optionTitle}>Giấy tiêu chuẩn</span>
            <span className={styles.optionPrice}>+0đ</span>
            <span className={styles.optionDesc}>Bề mặt mịn mờ tự nhiên, chống chói</span>
          </button>

          <button
            type="button"
            aria-pressed={paperType === "premium"}
            className={`${styles.optionCard} ${
              paperType === "premium" ? styles.optionCardActive : ""
            }`}
            onClick={() => onPaperChange("premium")}
          >
            <span className={styles.optionTitle}>Giấy mỹ thuật 200gsm</span>
            <span className={styles.optionPrice}>+10.000đ</span>
            <span className={styles.optionDesc}>Vân hạt giấy nổi, phủ ánh satin nhẹ</span>
          </button>
        </div>
      </div>

      {/* VIP plan notice if selected template is premium */}
      {template.is_premium ? (
        <div className={styles.vipNoticeCard} role="note">
          <Crown size={18} aria-hidden="true" className={styles.vipNoticeIcon} />
          <div>
            <p className={styles.vipNoticeTitle}>Mẫu thiết kế VIP</p>
            <p className={styles.vipNoticeBody}>
              Mẫu VIP được mở khóa miễn phí khi đăng ký gói <strong>PAUSE Go</strong>{" "}
              trở lên trên ứng dụng Pause.
            </p>
          </div>
        </div>
      ) : null}

      {/* Itemized price estimate */}
      <div className={styles.priceBox}>
        <div className={styles.priceRow}>
          <span>Phôi in ({template.slot_count} khung ảnh)</span>
          <span className={styles.monoInline}>{formatVnd(breakdown.baseVnd)}</span>
        </div>
        <div className={styles.priceRow}>
          <span>{coverType === "hard" ? "Bìa cứng cao cấp" : "Bìa mềm tiêu chuẩn"}</span>
          <span className={styles.monoInline}>+{formatVnd(breakdown.coverSurchargeVnd)}</span>
        </div>
        <div className={styles.priceRow}>
          <span>{paperType === "premium" ? "Giấy mỹ thuật 200gsm" : "Giấy tiêu chuẩn"}</span>
          <span className={styles.monoInline}>+{formatVnd(breakdown.paperSurchargeVnd)}</span>
        </div>
        <div className={styles.priceDivider} />
        <div className={styles.priceTotalRow}>
          <span>Giá in ước tính</span>
          <strong className={styles.priceTotalValue}>
            {formatVnd(totalEstimatedVnd)}
          </strong>
        </div>
      </div>

      {/* Primary conversion CTA -> /download (carries template & material configuration) */}
      <Link href={downloadHref} className={styles.downloadCtaButton}>
        <span>Tải App Pause để lưu Ngăn kéo &amp; đặt in</span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}
