import { FolderHeart, ImagePlus, Lock, Users } from "lucide-react";
import { DRAWER_SAMPLE_PHOTOS } from "@/lib/catalog-data";
import styles from "./Home.module.css";

const FEATURE_ITEMS = [
  {
    title: "Phân loại theo từng dịp",
    description:
      "Tách riêng chuyến đi, buổi hẹn hò và gia đình khỏi ảnh vặt hằng ngày.",
    Icon: FolderHeart,
  },
  {
    title: "Chia sẻ quyền Xem / Sửa",
    description:
      "Mời bạn bè hoặc người thương cùng góp ảnh vào ngăn kéo chung.",
    Icon: Users,
  },
  {
    title: "Sẵn sàng để ghép mẫu in",
    description:
      "Chọn thẳng những khoảnh khắc ưng ý nhất từ ngăn kéo khi cần in.",
    Icon: ImagePlus,
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
          {/* Tactile Memory Drawer visual showcase with real sample photography */}
          <div className={styles.drawerShowcase} aria-label="Minh họa Ngăn kéo Kỷ niệm">
            <div className={styles.drawerCardPrimary}>
              <div className={styles.drawerCardTop}>
                <div>
                  <span className={styles.drawerLabel}>NGĂN KÉO CHUNG</span>
                  <h3 className={styles.drawerTitle}>Đà Lạt 2026</h3>
                </div>
                <span className={styles.drawerPermPill}>
                  <Users size={12} aria-hidden="true" />
                  <span>Chỉnh sửa · 4 bạn</span>
                </span>
              </div>

              <div className={styles.drawerMosaic}>
                <div className={styles.drawerPhotoLarge}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={DRAWER_SAMPLE_PHOTOS.dalatLead}
                    alt="Nhóm bạn chụp ảnh kỷ niệm giữa đồi thông Đà Lạt"
                    className={styles.drawerImg}
                    loading="lazy"
                  />
                </div>
                <div className={styles.drawerPhotoCol}>
                  <div className={styles.drawerPhotoSmall}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={DRAWER_SAMPLE_PHOTOS.dalatCoffee}
                      alt="Khoảnh khắc cà phê sáng bên cửa sổ nắng"
                      className={styles.drawerImg}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.drawerPhotoSmall}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={DRAWER_SAMPLE_PHOTOS.dalatHomestay}
                      alt="Hiên gỗ homestay Đà Lạt ngập nắng và hoa dã quỳ"
                      className={styles.drawerImg}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.drawerCardFooter}>
                <span className={styles.drawerCount}>38 / 50 ảnh</span>
                <span className={styles.drawerReadyTag}>Sẵn sàng chọn in</span>
              </div>
            </div>

            <div className={styles.drawerCardSecondary}>
              <div className={styles.drawerSecondaryThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DRAWER_SAMPLE_PHOTOS.anniversaryCover}
                  alt="Ảnh bìa ngăn kéo Kỷ niệm 1 năm"
                  className={styles.drawerImg}
                  loading="lazy"
                />
              </div>
              <div className={styles.drawerSecondaryInfo}>
                <span className={styles.drawerSecondaryTitle}>Kỷ niệm 1 năm</span>
                <span className={styles.drawerSecondaryMeta}>
                  <Lock size={12} aria-hidden="true" />
                  <span>Riêng tư · 24/50 ảnh</span>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.featuresContent}>
            <span className={styles.eyebrow}>GIỚI THIỆU</span>
            <h2 id="drawers-heading" className={styles.sectionHeading}>
              Gọn gàng hơn thư viện ảnh: Ngăn kéo Kỷ niệm
            </h2>

            <ul className={styles.featureList}>
              {FEATURE_ITEMS.map(({ title, description, Icon }, idx) => (
                <li key={title} className={styles.featureRow}>
                  <span className={styles.featureIndex}>0{idx + 1}</span>
                  <div className={styles.featureBody}>
                    <div className={styles.featureHeadingRow}>
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                        className={styles.featureRowIcon}
                        aria-hidden="true"
                      />
                      <h3 className={styles.featureCardTitle}>{title}</h3>
                    </div>
                    <p className={styles.featureCardDesc}>{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
