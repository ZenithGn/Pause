import { DownloadFaq } from "@/features/download/DownloadFaq";
import { DownloadCtaSection } from "@/features/home/DownloadCtaSection";
import { FeaturesSection } from "@/features/home/FeaturesSection";
import { HeroSection } from "@/features/home/HeroSection";
import { PricingSection } from "@/features/home/PricingSection";
import { ProcessSection } from "@/features/home/ProcessSection";
import type { PublicMembershipTier, PublicTemplate } from "@/types/catalog";
import styles from "./Home.module.css";

interface HomeExperienceProps {
  templates: PublicTemplate[];
  tiers: PublicMembershipTier[];
}

/**
 * Coordinates the Home page sections with an interactive 3D Photobooth showcase
 * directly inside the Hero right column.
 */
export function HomeExperience({ templates, tiers }: HomeExperienceProps) {
  return (
    <div className={styles.homeStageWrapper}>
      <HeroSection templates={templates} />
      <FeaturesSection />
      <ProcessSection templates={templates} />
      <PricingSection tiers={tiers} />
      <DownloadFaq />
      <DownloadCtaSection />
    </div>
  );
}
