import { FolderHeart, Printer, Users } from "lucide-react";
import styles from "./Home.module.css";

const FEATURE_ITEMS = [
  {
    title: "Ngăn kéo theo chủ đề",
    description:
      "Tách biệt kỷ niệm Đà Lạt, kỷ niệm 1 năm, ảnh gia đình khỏi ảnh công việc lộn xộn.",
    Icon: FolderHeart,
  },
  {
    title: "Chia sẻ phân quyền (Xem / Chỉnh sửa)",
    description:
      "Mời bạn bè, người yêu qua email cùng góp ảnh vào một ngăn kéo chung an toàn.",
    Icon: Users,
  },
  {
    title: "Chuyển hóa thành bản in thật",
    description:
      "Chọn mẫu thiết kế sẵn, ghép ảnh từ ngăn kéo và đặt in giao tận nhà, thanh toán VietQR/PayOS hoặc COD.",
    Icon: Printer,
  },
] as const;

export function FeaturesSection() {
  return (
    <section
      className={styles.featuresSection}
      aria-labelledby="drawers-heading"
    >
      <div className={styles.sectionContainer}>
        <div className={styles.featuresGrid}>
          {/* Open stage column on the left for the 3D vintage camera */}
          <div className={styles.featuresSpacer} aria-hidden="true" />

          <div className={styles.featuresContent}>
            <span className={styles.eyebrow}>NGĂN KÉO KỶ NIỆM</span>
            <h2 id="drawers-heading" className={styles.sectionHeading}>
              Không chỉ là thư viện ảnh, mà là Ngăn kéo Kỷ niệm
            </h2>
            <p className={styles.sectionLead}>
              Mỗi ngăn kéo là một hộp lưu giữ riêng tư nơi những bức ảnh cùng
              câu chuyện được sắp xếp gọn gàng và sẵn sàng để in thành kỷ vật
              trên tay.
            </p>

            <div className={styles.featureCards}>
              {FEATURE_ITEMS.map(({ title, description, Icon }) => (
                <article key={title} className={styles.featureCard}>
                  <div className={styles.featureIconWrap} aria-hidden="true">
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className={styles.featureCardTitle}>{title}</h3>
                    <p className={styles.featureCardDesc}>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
