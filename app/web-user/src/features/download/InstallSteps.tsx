import { Cpu, HardDrive, Wifi } from "lucide-react";
import styles from "./InstallSteps.module.css";

interface InstallStepItem {
  number: string;
  title: string;
  description: string;
  hint: string;
}

const INSTALL_STEPS: InstallStepItem[] = [
  {
    number: "01",
    title: "Tải file APK",
    description:
      "Nhấn nút Tải file APK Android ở trên hoặc quét mã QR bằng camera điện thoại để tải bộ cài đặt chính thức từ GitHub Releases.",
    hint: "Tệp cài đặt nhẹ, không chứa quảng cáo hay phần mềm đi kèm.",
  },
  {
    number: "02",
    title: "Cho phép cài đặt ứng dụng",
    description:
      "Mở tệp .apk vừa tải về trên điện thoại. Nếu Android hiển thị thông báo bảo mật, hãy chọn Cài đặt và bật Cho phép từ nguồn này.",
    hint: "Chỉ cần cấp quyền một lần cho trình duyệt hoặc trình quản lý tệp.",
  },
  {
    number: "03",
    title: "Đăng nhập & mở Ngăn kéo đầu tiên",
    description:
      "Đăng nhập nhanh bằng Google hoặc Email để nhận ngay 3 Ngăn kéo miễn phí, tải ảnh kỷ niệm và bắt đầu thiết kế dải ảnh Photobooth.",
    hint: "Ảnh của bạn được đồng bộ an toàn và riêng tư theo từng ngăn kéo.",
  },
];

const DEVICE_SPECS = [
  { icon: Cpu, label: "Hệ điều hành: Android 8.0 trở lên (API 26+)" },
  { icon: HardDrive, label: "Dung lượng trống khuyến nghị: ~45 MB" },
  { icon: Wifi, label: "Kết nối mạng khi đồng bộ ảnh & đặt in" },
];

export function InstallSteps() {
  return (
    <section className={styles.section} aria-labelledby="install-steps-title">
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>HƯỚNG DẪN CÀI ĐẶT</p>
          <h2 id="install-steps-title" className={styles.title}>
            Bắt đầu trên Android chỉ với 3 bước
          </h2>
          <p className={styles.subtitle}>
            Quy trình cài đặt file APK an toàn, hoàn tất trong chưa đầy 2 phút.
          </p>
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
              <p className={styles.stepHint}>{step.hint}</p>
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
