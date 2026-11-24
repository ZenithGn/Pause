/**
 * Public catalog data contracts for Pause Web User.
 * Aligned with Supabase `photobooth_templates` and `membership_plans` tables.
 */

export type TemplateCategory = "couple" | "friends" | "family" | "general";

export interface LayoutSlot {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutText {
  content: string;
  x: number;
  y: number;
  font_size: number;
  color: string;
}

export interface LayoutConfig {
  width: number;
  height: number;
  background_color: string;
  slots: LayoutSlot[];
  texts: LayoutText[];
  frame_url: string | null;
}

export interface PublicTemplate {
  id: string;
  name: string;
  category: TemplateCategory | string;
  preview_url: string;
  slot_count: number;
  is_premium: boolean;
  is_active: boolean;
  layout_config: LayoutConfig;
}

export type MembershipDurationType = "monthly" | "yearly";

export interface PublicMembershipTier {
  id: string;
  name: string;
  description: string;
  price_vnd: number;
  duration_type: MembershipDurationType;
  drawer_limit_label: string;
  storage_label: string;
  features: string[];
  access_premium_templates: boolean;
  is_popular?: boolean;
  is_free?: boolean;
}

export type CoverType = "soft" | "hard";
export type PaperType = "standard" | "premium";

export interface PrintPriceBreakdown {
  baseVnd: number;
  coverSurchargeVnd: number;
  paperSurchargeVnd: number;
  totalVnd: number;
}
