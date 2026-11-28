import Link from "next/link";
import { Check } from "lucide-react";
import { formatVnd } from "@/lib/catalog-data";
import type { PublicMembershipTier } from "@/types/catalog";
import styles from "./Home.module.css";

interface PricingSectionProps {
  tiers: PublicMembershipTier[];
}

export function PricingSection({ tiers }: PricingSectionProps) {
  return (
    <section
      className={styles.pricingSection}
      aria-labelledby="pricing-heading"
    >
      <div className={styles.sectionContainer}>
        <div className={styles.pricingHeader}>
          <span className={styles.eyebrow}>GÓI HỘI VIÊN</span>
          <h2 id="pricing-heading" className={styles.sectionHeading}>
            Nâng cấp không gian lưu giữ
          </h2>
          <p className={styles.sectionLead}>
            Thanh toán 1 lần mỗi năm để mở rộng ngăn kéo và toàn bộ kho mẫu VIP.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {tiers.map((tier) => {
            const isPopular = Boolean(tier.is_popular);
            const priceLabel =
              tier.price_vnd <= 0 ? "0đ" : formatVnd(tier.price_vnd);
            const durationLabel =
              tier.price_vnd <= 0
                ? "Miễn phí"
                : tier.duration_type === "monthly"
                  ? "/ tháng"
                  : "/ năm";

            return (
              <article
                key={tier.id}
                className={`${styles.pricingCard} ${
                  isPopular ? styles.pricingCardPopular : ""
                }`}
              >
                <div>
                  {isPopular ? (
                    <span className={styles.popularBadge}>PHỔ BIẾN NHẤT</span>
                  ) : null}

                  <h3 className={styles.tierName}>{tier.name}</h3>

                  <div className={styles.tierPriceRow}>
                    <span className={styles.tierPrice}>{priceLabel}</span>
                    <span className={styles.tierDuration}>{durationLabel}</span>
                  </div>

                  <p className={styles.tierSpecLine}>
                    {tier.drawer_limit_label} · {tier.storage_label}
                  </p>

                  <ul className={styles.tierFeatures}>
                    {tier.features.map((feature) => (
                      <li key={feature} className={styles.tierFeatureItem}>
                        <Check
                          size={16}
                          className={styles.tierFeatureIcon}
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/download"
                  className={`${styles.tierCta} ${
                    isPopular ? styles.tierCtaPopular : ""
                  }`}
                >
                  {tier.price_vnd <= 0
                    ? "Bắt đầu miễn phí"
                    : `Chọn ${tier.name}`}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
