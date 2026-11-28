import { Download, FolderHeart, HardDrive, ShieldCheck, Wifi } from "lucide-react";
import styles from "./InstallSteps.module.css";

interface InstallStepItem {
  number: string;
  title: string;
  description: string;
}

const INSTALL_STEPS: InstallStepItem[] = [
  {
    number: "01",
    title: "Tải file APK",
    description:
      "Nhấn Tải file APK hoặc quét mã QR để tải bộ cài đặt chính thức từ GitHub Releases.",
  },
  {
    number: "02",
    title: "Cho phép cài đặt",
    description:
      "Mở tệp .apk vừa tải; nếu có thông báo bảo mật, bật Cho phép từ nguồn này (chỉ 1 lần).",
  },
  {
    number: "03",
    title: "Đăng nhập & mở Ngăn kéo",
    description:
      "Đăng nhập bằng Google hoặc Email để bắt đầu lưu ảnh và đặt in Photobooth.",
  },
];

const DEVICE_SPECS = [
  { icon: HardDrive, label: "Dung lượng trống khuyến nghị: ~45 MB" },
  { icon: Wifi, label: "Cần kết nối mạng khi đồng bộ ảnh & đặt in" },
];

function StepIllustration({ stepNumber }: { stepNumber: string }) {
  if (stepNumber === "01") {
    return (
      <div className={styles.stepMockup} aria-hidden="true">
        <div className={styles.mockupRow}>
          <span className={styles.mockupIconCircle}>
            <Download size={14} />
          </span>
          <div className={styles.mockupTextCol}>
            <strong>Pause-v0.1.0.apk</strong>
            <span>GitHub Releases · Đang sẵn sàng</span>
          </div>
          <span className={styles.mockupActionPill}>Tải về</span>
        </div>
      </div>
    );
  }

  if (stepNumber === "02") {
    return (
      <div className={styles.stepMockup} aria-hidden="true">
        <div className={styles.mockupRow}>
          <span className={styles.mockupIconCircle}>
            <ShieldCheck size={14} />
          </span>
          <div className={styles.mockupTextCol}>
            <strong>Cho phép từ nguồn này</strong>
            <span>Cài đặt ứng dụng Android</span>
          </div>
          <span className={styles.mockupSwitch}>
            <span className={styles.mockupSwitchThumb} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepMockup} aria-hidden="true">
      <div className={styles.mockupRow}>
        <span className={styles.mockupIconCircle}>
          <FolderHeart size={14} />
        </span>
        <div className={styles.mockupTextCol}>
          <strong>3 Ngăn kéo miễn phí</strong>
          <span>50 ảnh / ngăn · Chia sẻ &amp; Đặt in</span>
        </div>
        <span className={styles.mockupActionPill}>Mở ngay</span>
      </div>
    </div>
  );
}

export function InstallSteps() {
  return (
    <section className={styles.section} aria-labelledby="install-steps-title">
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>HƯỚNG DẪN CÀI ĐẶT</p>
          <h2 id="install-steps-title" className={styles.title}>
            Cài đặt trên Android trong 3 bước
          </h2>
        </div>

        <ol className={styles.stepsGrid}>
          {INSTALL_STEPS.map((step) => (
            <li key={step.number} className={styles.stepCard}>
              <div className={styles.stepTop}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.number}
                </span>
                <span className={styles.stepRule} aria-hidden="true" />
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
              <StepIllustration stepNumber={step.number} />
            </li>
          ))}
        </ol>

        <ul className={styles.specsBar} aria-label="Yêu cầu thiết bị Android">
          {DEVICE_SPECS.map((spec) => {
            const Icon = spec.icon;
            return (
              <li key={spec.label} className={styles.specItem}>
                <Icon size={16} className={styles.specIcon} aria-hidden="true" />
                <span>{spec.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
