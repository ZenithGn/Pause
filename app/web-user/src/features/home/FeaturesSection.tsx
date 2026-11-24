import { FolderHeart, Lock, Printer, Users } from "lucide-react";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
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
                    src={SAMPLE_PHOTO_URLS[0]}
                    alt="Ảnh kỷ niệm chuyến đi Đà Lạt"
                    className={styles.drawerImg}
                    loading="lazy"
                  />
                </div>
                <div className={styles.drawerPhotoCol}>
                  <div className={styles.drawerPhotoSmall}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={SAMPLE_PHOTO_URLS[1]}
                      alt="Khoảnh khắc cà phê sáng"
                      className={styles.drawerImg}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.drawerPhotoSmall}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={SAMPLE_PHOTO_URLS[2]}
                      alt="Ảnh chụp cùng nhóm bạn"
                      className={styles.drawerImg}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.drawerCardFooter}>
                <span className={styles.drawerCount}>38 / 50 ảnh</span>
                <span className={styles.drawerReadyTag}>Sẵn sàng in Photobooth</span>
              </div>
            </div>

            <div className={styles.drawerCardSecondary}>
              <div className={styles.drawerSecondaryThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAMPLE_PHOTO_URLS[3]}
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
