import styles from "./Home.module.css";

interface ProcessStepDef {
  number: string;
  title: string;
  description: string;
}

const STEPS: readonly ProcessStepDef[] = [
  {
    number: "01",
    title: "Chọn mẫu Photobooth",
    description: "6+ bố cục từ cổ điển đến ép kim VIP Gold.",
  },
  {
    number: "02",
    title: "Ghép ảnh & chỉnh màu",
    description: "Tự căn khung chuẩn tỷ lệ, thêm tone film và lời nhắn.",
  },
  {
    number: "03",
    title: "Đặt in giao tận nhà",
    description: "Giấy satin 200gsm chống ẩm, thanh toán VietQR hoặc COD.",
  },
] as const;

/**
 * Compact 3-step horizontal Photobooth workflow strip leading into the
 * interactive template showcase.
 */
export function ProcessInteractiveSteps() {
  return (
    <ol className={styles.processStepsRail} aria-label="Quy trình 3 bước">
      {STEPS.map((step) => (
        <li key={step.number} className={styles.processStepItem}>
          <div className={styles.processStepCard}>
            <span className={styles.stepNumber}>{step.number}</span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepDesc}>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
