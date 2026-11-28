/**
 * Shared TypeScript contracts for Pause FR-06 Admin Dashboard.
 * Aligned with docs/04-Plans/active/fr-06-admin-task-breakdown.md §5.
 */

export type AdminErrorCode =
  | "ADMIN_REQUIRED"
  | "NOT_FOUND"
  | "CANNOT_LOCK_SELF"
  | "CANNOT_LOCK_ADMIN"
  | "LOCK_REASON_REQUIRED"
  | "INVALID_STATUS_TRANSITION"
  | "CANCEL_NOTE_REQUIRED"
  | "TEMPLATE_NAME_TAKEN"
  | "TEMPLATE_IN_USE"
  | "INVALID_LAYOUT_CONFIG"
  | "PLAN_NAME_TAKEN"
  | "PLAN_IN_USE"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type UserRole = "user" | "admin";

export interface UserSummary {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  tier: string;
  is_locked: boolean;
  drawer_count: number;
  created_at: string;
  last_sign_in_at: string | null;
  total_count?: number;
}

export interface UserProfileDetail {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  max_drawers: number;
  role: UserRole;
  is_premium: boolean;
  is_locked: boolean;
  locked_at: string | null;
  locked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserMembershipHistoryItem {
  id: string;
  plan_id: string;
  plan_name: string;
  started_at: string;
  expires_at: string;
  status: MembershipStatus;
  created_at: string;
}

export interface UserDrawerStats {
  drawer_count: number;
  photo_count: number;
  storage_used_bytes: number;
}

export interface UserOrdersSummary {
  total_orders: number;
  total_spent_vnd: number;
  pending_orders: number;
  completed_orders: number;
}

export interface UserDetail {
  profile: UserProfileDetail;
  email: string | null;
  memberships: UserMembershipHistoryItem[];
  drawer_stats: UserDrawerStats;
  orders_summary: UserOrdersSummary;
  recent_orders: OrderSummary[];
  recent_transactions: TransactionItem[];
}

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

export interface TemplateSummary {
  id: string;
  name: string;
  category: TemplateCategory | string;
  preview_url: string;
  slot_count: number;
  is_premium: boolean;
  is_active: boolean;
  usage_count: number;
  updated_at: string;
  total_count?: number;
}

export interface TemplateDetail extends TemplateSummary {
  layout_config: LayoutConfig;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "printing"
  | "shipping"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "success" | "failed" | "refunded" | "cancelled";

export interface OrderSummary {
  id: string;
  short_code: string;
  user_id: string;
  customer_name: string;
  shipping_phone: string;
  template_name: string;
  preview_url: string | null;
  quantity: number;
  total_price_vnd: number;
  status: OrderStatus;
  payment_status: PaymentStatus | string | null;
  payment_method: string | null;
  created_at: string;
  total_count?: number;
}

export interface OrderStatusCount {
  status: OrderStatus;
  count: number;
}

export interface PrintOrderStatusHistoryItem {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  changed_by_name?: string | null;
  note: string | null;
  created_at: string;
}

export interface OrderSlotPhoto {
  slot_index: number;
  original_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
}

export interface OrderDetail {
  order: {
    id: string;
    short_code: string;
    user_id: string;
    photobooth_item_id: string;
    quantity: number;
    unit_price_vnd: number;
    total_price_vnd: number;
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    note: string | null;
    cover_type: "soft" | "hard" | string;
    paper_type: "standard" | "premium" | string;
    status: OrderStatus;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
  };
  customer: {
    id: string;
    display_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  photobooth_item: {
    id: string;
    template_id: string;
    preview_url: string | null;
    status: string;
    created_at: string;
  };
  template: {
    id: string;
    name: string;
    category: string;
    preview_url: string;
    slot_count: number;
    layout_config: LayoutConfig;
  };
  slot_photos: OrderSlotPhoto[];
  transactions: TransactionItem[];
  status_history: PrintOrderStatusHistoryItem[];
}

export type MembershipDurationType = "monthly" | "yearly";

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price_vnd: number;
  duration_type: MembershipDurationType;
  extra_drawers: number;
  extra_storage_bytes: number;
  access_premium_templates: boolean;
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
  active_subscriber_count?: number;
}

export type MembershipStatus = "active" | "expired" | "cancelled";

export interface MembershipSubscriber {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  plan_id?: string;
  plan_name: string;
  started_at: string;
  expires_at: string;
  days_left: number;
  status: MembershipStatus;
  total_count?: number;
}

export type TransactionType = "print_order" | "membership" | "drawer_purchase";

export interface TransactionItem {
  id: string;
  user_id: string;
  display_name: string;
  type: TransactionType;
  amount_vnd: number;
  payment_method: string | null;
  payment_gateway_ref: string | null;
  order_code: number | string | null;
  status: PaymentStatus;
  order_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  total_count?: number;
}

export interface DashboardStats {
  total_users: number;
  new_users: number;
  orders_today: number;
  pending_orders: number;
  revenue_month_vnd: number;
  revenue_range_vnd: number;
  active_members: number;
}

export interface RevenueSeriesPoint {
  bucket: string;
  print_revenue_vnd: number;
  membership_revenue_vnd: number;
  order_count: number;
}

export interface TopTemplateStat {
  template_id: string;
  name: string;
  preview_url: string;
  order_count: number;
  revenue_vnd: number;
}

export interface MembershipDistributionItem {
  plan_name: string;
  active_count: number;
}
