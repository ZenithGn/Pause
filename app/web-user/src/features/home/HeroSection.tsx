import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { HeroShowcaseSlot } from "@/features/home/HeroShowcaseSlot";
import type { PublicTemplate } from "@/types/catalog";
import styles from "./Home.module.css";

interface HeroSectionProps {
  templates: PublicTemplate[];
}

export function HeroSection({ templates }: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.heroGrain} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>
            LƯU TRỮ &amp; IN PHOTOBOOTH
          </span>

          <h1 id="hero-heading" className={styles.heroTitle}>
            Dừng lại, lưu giữ,{" "}
            <span className={styles.heroAccent}>hiện thực hóa</span> kỷ niệm.
          </h1>

          <p className={styles.heroDescription}>
            Cất ảnh theo từng ngăn kéo riêng tư, chia sẻ cùng bạn bè và đặt in
            photobooth giao tận tay.
          </p>

          <div className={styles.heroActions}>
            <Link href="/preview" className={styles.primaryLightBtn}>
              <span>Thử mẫu in 3D</span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/download" className={styles.secondaryGoldBtn}>
              <Download size={17} aria-hidden="true" />
              <span>Tải ứng dụng Android</span>
            </Link>
          </div>
        </div>

        <div className={styles.heroShowcaseCol}>
          <HeroShowcaseSlot templates={templates} />
        </div>
      </div>
    </section>
  );
}
