"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Layers, Sparkles, Truck } from "lucide-react";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import styles from "./Home.module.css";

interface ProcessStepDef {
  number: string;
  title: string;
  description: string;
  tag: string;
}

const STEPS: readonly ProcessStepDef[] = [
  {
    number: "01",
    title: "Chọn mẫu Photobooth",
    description:
      "Khám phá các bố cục Cổ điển, Vintage, Minimal, Polaroid vuông và kho mẫu ép kim VIP Gold.",
    tag: "6+ bố cục chuẩn in",
  },
  {
    number: "02",
    title: "Fill ảnh từ Ngăn kéo",
    description:
      "Tự động căn khung chuẩn tỷ lệ không méo ảnh, chọn tone màu film và thêm lời nhắn kỷ niệm riêng.",
    tag: "Crop-fill không méo",
  },
  {
    number: "03",
    title: "Đặt in & Nhận tận tay",
    description:
      "Chọn giấy mỹ thuật 200gsm, bìa cứng hoặc bìa mềm, theo dõi tiến trình in giao tận nơi.",
    tag: "200gsm · Giao toàn quốc",
  },
] as const;

/**
 * Interactive 3-step Photobooth workflow rail paired with a live visual stage
 * demonstrating layout selection, crop-fill framing, and 200gsm print specifications.
 */
export function ProcessInteractiveSteps() {
  const [activeStep, setActiveStep] = useState(0);
  const current = STEPS[activeStep] ?? STEPS[0];

  return (
    <div className={styles.processRailBlock}>
      <ol className={styles.processStepsRail} aria-label="Quy trình 3 bước">
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          return (
            <li
              key={step.number}
              className={`${styles.processStepItem} ${
                isActive ? styles.processStepItemActive : ""
              }`}
            >
              <button
                type="button"
                aria-pressed={isActive}
                className={styles.processStepButton}
                onClick={() => setActiveStep(index)}
              >
                <div className={styles.processStepTop}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <span className={styles.stepTag}>{step.tag}</span>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.processVisualBar} aria-live="polite">
        <div className={styles.processVisualStage}>
          {activeStep === 0 ? (
            <div className={styles.stepVisualRow}>
              <div className={styles.stepMiniStrip}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE_PHOTO_URLS[0]} alt="" className={styles.stepMiniImg} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE_PHOTO_URLS[1]} alt="" className={styles.stepMiniImg} />
                <span className={styles.stepMiniCap}>Classic White</span>
              </div>
              <div className={styles.stepMiniSquare}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE_PHOTO_URLS[2]} alt="" className={styles.stepMiniSquareImg} />
                <span className={styles.stepMiniCap}>Family 1:1</span>
              </div>
              <div className={styles.stepMiniVip}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE_PHOTO_URLS[3]} alt="" className={styles.stepMiniImg} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE_PHOTO_URLS[0]} alt="" className={styles.stepMiniImg} />
                <span className={styles.stepMiniCapVip}>VIP Gold</span>
              </div>
            </div>
          ) : null}

          {activeStep === 1 ? (
            <div className={styles.stepFillPreview}>
              <div className={styles.stepFillFrame}>
                <div className={styles.stepFillSlot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SAMPLE_PHOTO_URLS[0]} alt="" className={styles.stepFillImg} />
                  <span className={styles.stepCropPill}>Crop-fill 100%</span>
                </div>
                <div className={styles.stepFillSlot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SAMPLE_PHOTO_URLS[1]} alt="" className={styles.stepFillImg} />
                </div>
                <span className={styles.stepFillCaption}>&ldquo;Đà Lạt · 2026&rdquo;</span>
              </div>
              <div className={styles.stepFillSpecs}>
                <span className={styles.stepSpecChip}>
                  <Sparkles size={13} aria-hidden="true" />
                  <span>Gốc · Film Ấm · B&amp;W</span>
                </span>
                <span className={styles.stepSpecChip}>
                  <Check size={13} aria-hidden="true" />
                  <span>Giữ nguyên ảnh khi đổi mẫu</span>
                </span>
              </div>
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className={styles.stepPrintPreview}>
              <div className={styles.stepPrintSpecItem}>
                <Layers size={18} className={styles.stepPrintIcon} aria-hidden="true" />
                <div>
                  <strong className={styles.stepPrintTitle}>Bìa cứng / Bìa mềm</strong>
                  <span className={styles.stepPrintSub}>Độ dày mép giấy rõ nét khi cầm tay</span>
                </div>
              </div>
              <div className={styles.stepPrintSpecItem}>
                <Sparkles size={18} className={styles.stepPrintIcon} aria-hidden="true" />
                <div>
                  <strong className={styles.stepPrintTitle}>Giấy mỹ thuật satin 200gsm</strong>
                  <span className={styles.stepPrintSub}>Vân hạt mịn, bắt sáng nhẹ chống ẩm</span>
                </div>
              </div>
              <div className={styles.stepPrintSpecItem}>
                <Truck size={18} className={styles.stepPrintIcon} aria-hidden="true" />
                <div>
                  <strong className={styles.stepPrintTitle}>Hoàn thiện 1–2 ngày · Giao 2–5 ngày</strong>
                  <span className={styles.stepPrintSub}>Thanh toán VietQR tự động hoặc COD</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.processVisualCopy}>
          <span className={styles.processVisualStepCode}>BƯỚC {current.number}</span>
          <p className={styles.calloutText}>
            Thử ghép ảnh từ máy lên mẫu in 3D ngay trên trình duyệt — ảnh xử lý
            100% tại máy bạn, không tải lên server.
          </p>
          <Link href="/preview" className={styles.wineCtaBtn}>
            <span>Trải nghiệm xoay mẫu in 3D ngay</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
