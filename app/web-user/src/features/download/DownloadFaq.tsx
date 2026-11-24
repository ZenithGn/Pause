"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./DownloadFaq.module.css";

export interface DownloadFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const DOWNLOAD_FAQ_ITEMS: DownloadFaqItem[] = [
  {
    id: "privacy",
    question: "Ảnh lưu trên Pause có an toàn và riêng tư không?",
    answer:
      "Mọi Ngăn kéo Kỷ niệm đều ở chế độ riêng tư theo mặc định và được bảo vệ phân quyền chặt chẽ theo từng tài khoản. Bạn chỉ chia sẻ quyền Xem hoặc Chỉnh sửa khi chủ động gửi lời mời qua email. Riêng trên trang Preview mẫu in 3D tại website, ảnh được xử lý 100% trên trình duyệt của bạn và không tải lên máy chủ.",
  },
  {
    id: "free-tier",
    question: "Gói Miễn phí (Free) dùng được những gì?",
    answer:
      "Ngay khi đăng ký tài khoản trên ứng dụng Android, bạn được sử dụng miễn phí 3 Ngăn kéo Kỷ niệm (tối đa 50 ảnh / ngăn kéo), chia sẻ cùng bạn bè và dùng toàn bộ các mẫu Photobooth cơ bản. Khi cần mở rộng lên 10–50 ngăn kéo và mở khóa 100% mẫu VIP, bạn có thể nâng cấp gói PAUSE Go chỉ từ 30.000đ/năm.",
  },
  {
    id: "payment",
    question: "Ứng dụng hỗ trợ những hình thức thanh toán nào?",
    answer:
      "Pause tích hợp cổng thanh toán VietQR Pro / PayOS giúp xác nhận chuyển khoản tự động trong vài giây khi nâng cấp gói Hội viên hoặc đặt in ảnh. Với đơn đặt in Photobooth, bạn cũng có thể lựa chọn thanh toán khi nhận hàng (COD).",
  },
  {
    id: "printing-delivery",
    question: "Thời gian in ấn và giao hàng mất bao lâu?",
    answer:
      "Đơn đặt in được hoàn thiện trên giấy mỹ thuật 200gsm và đóng gói chống ẩm trong 1–2 ngày làm việc, sau đó giao toàn quốc trong khoảng 2–5 ngày tùy khu vực. Bạn có thể theo dõi trạng thái xử lý và vận chuyển trực tiếp ngay trong ứng dụng Pause.",
  },
];

export function DownloadFaq() {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  function handleToggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className={styles.section} aria-labelledby="download-faq-title">
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>CÂU HỎI THƯỜNG GẶP</p>
            <h2 id="download-faq-title" className={styles.title}>
              Giải đáp nhanh trước khi tải ứng dụng
            </h2>
            <p className={styles.subtitle}>
              Những thông tin cốt lõi về quyền riêng tư, gói miễn phí, thanh
              toán và quy trình giao ảnh in tận tay.
            </p>
          </div>

          <div className={styles.accordionList}>
            {DOWNLOAD_FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;
              const buttonId = `${baseId}-btn-${item.id}`;
              const panelId = `${baseId}-panel-${item.id}`;

              return (
                <div
                  key={item.id}
                  className={`${styles.accordionItem} ${
                    isOpen ? styles.accordionItemOpen : ""
                  }`}
                >
                  <h3 className={styles.questionHeading}>
                    <button
                      type="button"
                      id={buttonId}
                      className={styles.questionButton}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => handleToggle(item.id)}
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        size={19}
                        aria-hidden="true"
                        className={`${styles.chevron} ${
                          isOpen ? styles.chevronOpen : ""
                        }`}
                      />
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className={styles.answerPanel}
                  >
                    <p className={styles.answerText}>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
