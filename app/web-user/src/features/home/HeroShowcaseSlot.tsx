"use client";

import dynamic from "next/dynamic";
import type { PublicTemplate } from "@/types/catalog";
import styles from "@/components/three/HeroPhotoboothStage.module.css";

const DynamicHeroPhotoboothStage = dynamic(
  () =>
    import("@/components/three/HeroPhotoboothStage").then(
      (mod) => mod.HeroPhotoboothStage
    ),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loadingSkeleton} aria-live="polite">
        <div className={styles.loadingSpinner} aria-hidden="true" />
        <span>Đang chuẩn bị dải ảnh Photobooth 3D...</span>
      </div>
    ),
  }
);

interface HeroShowcaseSlotProps {
  templates: PublicTemplate[];
}

export function HeroShowcaseSlot({ templates }: HeroShowcaseSlotProps) {
  return <DynamicHeroPhotoboothStage templates={templates} />;
}
