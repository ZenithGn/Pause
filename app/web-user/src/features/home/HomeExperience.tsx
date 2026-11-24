"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { DownloadCtaSection } from "@/features/home/DownloadCtaSection";
import { FeaturesSection } from "@/features/home/FeaturesSection";
import { HeroSection } from "@/features/home/HeroSection";
import { PricingSection } from "@/features/home/PricingSection";
import { ProcessSection } from "@/features/home/ProcessSection";
import type { PublicMembershipTier, PublicTemplate } from "@/types/catalog";
import styles from "./Home.module.css";

const CameraScrollStage = dynamic(
  () =>
    import("@/components/three/CameraScrollStage").then(
      (mod) => mod.CameraScrollStage
    ),
  { ssr: false }
);

interface HomeExperienceProps {
  templates: PublicTemplate[];
  tiers: PublicMembershipTier[];
}

/**
 * Client coordinator for the Home page: mounts the dynamic SSR-safe 3D camera stage
 * over the 5 editorial sections while stopping cleanly before the Footer.
 */
export function HomeExperience({ templates, tiers }: HomeExperienceProps) {
  const stageContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={stageContainerRef} className={styles.homeStageWrapper}>
      <CameraScrollStage
        containerRef={stageContainerRef}
        mode="desktop-scroll"
      />

      <HeroSection
        mobileCameraSlot={<CameraScrollStage mode="hero-mobile" />}
      />
      <FeaturesSection />
      <ProcessSection templates={templates} />
      <PricingSection tiers={tiers} />
      <DownloadCtaSection />
    </div>
  );
}
