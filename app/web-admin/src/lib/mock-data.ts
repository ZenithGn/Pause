import type {
  DashboardStats,
  MembershipDistributionItem,
  MembershipPlan,
  MembershipSubscriber,
  OrderDetail,
  OrderStatusCount,
  OrderSummary,
  RevenueSeriesPoint,
  TemplateDetail,
  TemplateSummary,
  TopTemplateStat,
  TransactionItem,
  UserDetail,
  UserSummary,
} from "@/types/admin";

/**
 * Realistic Vietnamese mock fixtures matching §5 contracts for Wave 1 & offline UI previews
 * when USE_MOCK_ADMIN_DATA=true.
 */

export const MOCK_ADMIN_SESSION = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@pause.vn",
  },
  profile: {
    id: "00000000-0000-4000-8000-000000000001",
    display_name: "Quản trị viên Pause",
    avatar_url: null,
    phone: "0901234567",
    role: "admin" as const,
    is_locked: false,
  },
};

export const MOCK_USERS: UserSummary[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    display_name: "Quản trị viên Pause",
    email: "admin@pause.vn",
    phone: "0901234567",
    avatar_url: null,
    role: "admin",
    tier: "PAUSE Premium",
    is_locked: false,
    drawer_count: 2,
    created_at: "2026-09-15T08:00:00.000Z",
    last_sign_in_at: "2026-11-20T09:15:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111101",
    display_name: "Nguyễn Minh Anh",
    email: "minhanh.nguyen@gmail.com",
    phone: "0912345678",
    avatar_url: null,
    role: "user",
    tier: "PAUSE Plus",
    is_locked: false,
    drawer_count: 8,
    created_at: "2026-10-02T10:30:00.000Z",
    last_sign_in_at: "2026-11-19T14:22:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    display_name: "Trần Hoàng Nam",
    email: "hoangnam.tran@gmail.com",
    phone: "0987654321",
    avatar_url: null,
    role: "user",
    tier: "PAUSE Go",
    is_locked: false,
    drawer_count: 5,
    created_at: "2026-10-18T06:45:00.000Z",
    last_sign_in_at: "2026-11-20T02:10:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    display_name: "Lê Thảo Vy",
    email: "thaovy.le@outlook.com",
    phone: "0934567890",
    avatar_url: null,
    role: "user",
    tier: "Free",
    is_locked: true,
    drawer_count: 3,
    created_at: "2026-11-01T12:00:00.000Z",
    last_sign_in_at: "2026-11-10T08:00:00.000Z",
  },
];

export const MOCK_TEMPLATES: TemplateDetail[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    name: "Classic White",
    category: "couple",
    preview_url: "https://placehold.co/600x900/png?text=Classic+White",
    slot_count: 2,
    is_premium: false,
    is_active: true,
    usage_count: 128,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-11-15T09:00:00.000Z",
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#FFFFFF",
      slots: [
        { index: 0, x: 60, y: 120, width: 1080, height: 700 },
        { index: 1, x: 60, y: 900, width: 1080, height: 700 },
      ],
      texts: [{ content: "Pause", x: 600, y: 1700, font_size: 48, color: "#111111" }],
      frame_url: null,
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    name: "Vintage Memories",
    category: "friends",
    preview_url: "https://placehold.co/600x900/png?text=Vintage",
    slot_count: 4,
    is_premium: false,
    is_active: true,
    usage_count: 245,
    created_at: "2026-10-05T00:00:00.000Z",
    updated_at: "2026-11-16T10:30:00.000Z",
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#F6EFE4",
      slots: [
        { index: 0, x: 60, y: 90, width: 520, height: 390 },
        { index: 1, x: 620, y: 90, width: 520, height: 390 },
        { index: 2, x: 60, y: 510, width: 520, height: 390 },
        { index: 3, x: 620, y: 510, width: 520, height: 390 },
      ],
      texts: [
        { content: "Vintage Memories", x: 600, y: 1700, font_size: 52, color: "#5B4636" },
      ],
      frame_url: null,
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    name: "Premium Gold",
    category: "couple",
    preview_url: "https://placehold.co/600x900/png?text=Premium+Gold",
    slot_count: 4,
    is_premium: true,
    is_active: true,
    usage_count: 96,
    created_at: "2026-10-12T00:00:00.000Z",
    updated_at: "2026-11-18T11:00:00.000Z",
    layout_config: {
      width: 1200,
      height: 1800,
      background_color: "#111111",
      slots: [
        { index: 0, x: 60, y: 80, width: 520, height: 620 },
        { index: 1, x: 620, y: 80, width: 520, height: 620 },
        { index: 2, x: 60, y: 740, width: 520, height: 620 },
        { index: 3, x: 620, y: 740, width: 520, height: 620 },
      ],
      texts: [
        { content: "PAUSE GOLD", x: 600, y: 1700, font_size: 56, color: "#D4AF37" },
      ],
      frame_url: null,
    },
  },
];

export const MOCK_TEMPLATE_SUMMARIES: TemplateSummary[] = MOCK_TEMPLATES.map(
  ({ layout_config: _layout, created_at: _created, ...summary }) => summary,
);

export const MOCK_ORDERS: OrderSummary[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    short_code: "33333301",
    user_id: "11111111-1111-4111-8111-111111111101",
    customer_name: "Nguyễn Minh Anh",
    shipping_phone: "0912345678",
    template_name: "Vintage Memories",
    preview_url: "https://placehold.co/600x900/png?text=Order+01",
    quantity: 2,
    total_price_vnd: 120000,
    status: "pending",
    payment_status: "pending",
    payment_method: "cod",
    created_at: "2026-11-20T07:30:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    short_code: "33333302",
    user_id: "11111111-1111-4111-8111-111111111102",
    customer_name: "Trần Hoàng Nam",
    shipping_phone: "0987654321",
    template_name: "Premium Gold",
    preview_url: "https://placehold.co/600x900/png?text=Order+02",
    quantity: 1,
    total_price_vnd: 85000,
    status: "processing",
    payment_status: "success",
    payment_method: "vietqr_payos",
    created_at: "2026-11-19T16:45:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    short_code: "33333303",
    user_id: "11111111-1111-4111-8111-111111111101",
    customer_name: "Nguyễn Minh Anh",
    shipping_phone: "0912345678",
    template_name: "Classic White",
    preview_url: "https://placehold.co/600x900/png?text=Order+03",
    quantity: 3,
    total_price_vnd: 150000,
    status: "completed",
    payment_status: "success",
    payment_method: "vietqr_payos",
    created_at: "2026-11-17T09:10:00.000Z",
  },
];

export const MOCK_ORDER_STATUS_COUNTS: OrderStatusCount[] = [
  { status: "pending", count: 4 },
  { status: "processing", count: 6 },
  { status: "printing", count: 3 },
  { status: "shipping", count: 5 },
  { status: "completed", count: 42 },
  { status: "cancelled", count: 2 },
];

export const MOCK_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "44444444-4444-4444-8444-444444444401",
    name: "PAUSE Go",
    description: "Gói hội viên PAUSE Go: 5GB/năm, 10 ngăn kéo, mở khóa VIP Templates",
    price_vnd: 30000,
    duration_type: "yearly",
    extra_drawers: 10,
    extra_storage_bytes: 5368709120,
    access_premium_templates: true,
    is_active: true,
    created_at: "2026-10-01T00:00:00.000Z",
    subscriber_count: 68,
    active_subscriber_count: 61,
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    name: "PAUSE Plus",
    description: "Gói hội viên PAUSE Plus: 10GB/năm, 25 ngăn kéo, mở khóa VIP Templates",
    price_vnd: 55000,
    duration_type: "yearly",
    extra_drawers: 25,
    extra_storage_bytes: 10737418240,
    access_premium_templates: true,
    is_active: true,
    created_at: "2026-10-01T00:00:00.000Z",
    subscriber_count: 42,
    active_subscriber_count: 39,
  },
  {
    id: "44444444-4444-4444-8444-444444444403",
    name: "PAUSE Premium",
    description: "Gói hội viên PAUSE Premium: 20GB/năm, 50 ngăn kéo, mở khóa toàn diện VIP Templates",
    price_vnd: 100000,
    duration_type: "yearly",
    extra_drawers: 50,
    extra_storage_bytes: 21474836480,
    access_premium_templates: true,
    is_active: true,
    created_at: "2026-10-01T00:00:00.000Z",
    subscriber_count: 21,
    active_subscriber_count: 18,
  },
];

export const MOCK_SUBSCRIBERS: MembershipSubscriber[] = [
  {
    id: "55555555-5555-4555-8555-555555555501",
    user_id: "11111111-1111-4111-8111-111111111101",
    display_name: "Nguyễn Minh Anh",
    email: "minhanh.nguyen@gmail.com",
    plan_id: "44444444-4444-4444-8444-444444444402",
    plan_name: "PAUSE Plus",
    started_at: "2026-10-15T00:00:00.000Z",
    expires_at: "2027-10-15T00:00:00.000Z",
    days_left: 329,
    status: "active",
  },
  {
    id: "55555555-5555-4555-8555-555555555502",
    user_id: "11111111-1111-4111-8111-111111111102",
    display_name: "Trần Hoàng Nam",
    email: "hoangnam.tran@gmail.com",
    plan_id: "44444444-4444-4444-8444-444444444401",
    plan_name: "PAUSE Go",
    started_at: "2025-11-24T00:00:00.000Z",
    expires_at: "2026-11-24T00:00:00.000Z",
    days_left: 4,
    status: "active",
  },
];

export const MOCK_TRANSACTIONS: TransactionItem[] = [
  {
    id: "66666666-6666-4666-8666-666666666601",
    user_id: "11111111-1111-4111-8111-111111111102",
    display_name: "Trần Hoàng Nam",
    type: "print_order",
    amount_vnd: 85000,
    payment_method: "vietqr_payos",
    payment_gateway_ref: "PAYOS_842910234",
    order_code: 842910234,
    status: "success",
    order_id: "33333333-3333-4333-8333-333333333302",
    metadata: { payment_type: "print_order", order_code: 842910234 },
    created_at: "2026-11-19T16:46:00.000Z",
  },
  {
    id: "66666666-6666-4666-8666-666666666602",
    user_id: "11111111-1111-4111-8111-111111111101",
    display_name: "Nguyễn Minh Anh",
    type: "membership",
    amount_vnd: 55000,
    payment_method: "vietqr_payos",
    payment_gateway_ref: "PAYOS_591028374",
    order_code: 591028374,
    status: "success",
    order_id: null,
    metadata: { payment_type: "pause_plus", order_code: 591028374 },
    created_at: "2026-10-15T08:12:00.000Z",
  },
];

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  total_users: 428,
  new_users: 36,
  orders_today: 7,
  pending_orders: 4,
  revenue_month_vnd: 14850000,
  revenue_range_vnd: 4230000,
  active_members: 118,
};

export const MOCK_REVENUE_SERIES: RevenueSeriesPoint[] = [
  { bucket: "2026-11-14", print_revenue_vnd: 420000, membership_revenue_vnd: 185000, order_count: 5 },
  { bucket: "2026-11-15", print_revenue_vnd: 580000, membership_revenue_vnd: 240000, order_count: 7 },
  { bucket: "2026-11-16", print_revenue_vnd: 390000, membership_revenue_vnd: 115000, order_count: 4 },
  { bucket: "2026-11-17", print_revenue_vnd: 720000, membership_revenue_vnd: 300000, order_count: 9 },
  { bucket: "2026-11-18", print_revenue_vnd: 510000, membership_revenue_vnd: 155000, order_count: 6 },
  { bucket: "2026-11-19", print_revenue_vnd: 640000, membership_revenue_vnd: 210000, order_count: 8 },
  { bucket: "2026-11-20", print_revenue_vnd: 485000, membership_revenue_vnd: 190000, order_count: 7 },
];

export const MOCK_TOP_TEMPLATES: TopTemplateStat[] = [
  {
    template_id: "22222222-2222-4222-8222-222222222202",
    name: "Vintage Memories",
    preview_url: "https://placehold.co/600x900/png?text=Vintage",
    order_count: 42,
    revenue_vnd: 3570000,
  },
  {
    template_id: "22222222-2222-4222-8222-222222222201",
    name: "Classic White",
    preview_url: "https://placehold.co/600x900/png?text=Classic+White",
    order_count: 31,
    revenue_vnd: 2170000,
  },
  {
    template_id: "22222222-2222-4222-8222-222222222203",
    name: "Premium Gold",
    preview_url: "https://placehold.co/600x900/png?text=Premium+Gold",
    order_count: 24,
    revenue_vnd: 2040000,
  },
];

export const MOCK_MEMBERSHIP_DISTRIBUTION: MembershipDistributionItem[] = [
  { plan_name: "Free", active_count: 310 },
  { plan_name: "PAUSE Go", active_count: 61 },
  { plan_name: "PAUSE Plus", active_count: 39 },
  { plan_name: "PAUSE Premium", active_count: 18 },
];

export function getMockUserDetail(userId: string): UserDetail | null {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) return null;

  return {
    profile: {
      id: user.id,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      phone: user.phone,
      max_drawers: user.tier === "PAUSE Plus" ? 25 : user.tier === "PAUSE Go" ? 10 : 3,
      role: user.role,
      is_premium: user.tier !== "Free",
      is_locked: user.is_locked,
      locked_at: user.is_locked ? "2026-11-12T10:00:00.000Z" : null,
      locked_reason: user.is_locked ? "Vi phạm quy định cộng đồng (mock)" : null,
      created_at: user.created_at,
      updated_at: user.created_at,
    },
    email: user.email,
    memberships: MOCK_SUBSCRIBERS.filter((m) => m.user_id === user.id).map((m) => ({
      id: m.id,
      plan_id: m.plan_id ?? "44444444-4444-4444-8444-444444444401",
      plan_name: m.plan_name,
      started_at: m.started_at,
      expires_at: m.expires_at,
      status: m.status,
      created_at: m.started_at,
    })),
    drawer_stats: {
      drawer_count: user.drawer_count,
      photo_count: user.drawer_count * 14,
      storage_used_bytes: user.drawer_count * 24_500_000,
    },
    orders_summary: {
      total_orders: MOCK_ORDERS.filter((o) => o.user_id === user.id).length,
      total_spent_vnd: MOCK_ORDERS.filter((o) => o.user_id === user.id).reduce(
        (sum, o) => sum + o.total_price_vnd,
        0,
      ),
      pending_orders: MOCK_ORDERS.filter(
        (o) => o.user_id === user.id && o.status === "pending",
      ).length,
      completed_orders: MOCK_ORDERS.filter(
        (o) => o.user_id === user.id && o.status === "completed",
      ).length,
    },
    recent_orders: MOCK_ORDERS.filter((o) => o.user_id === user.id),
    recent_transactions: MOCK_TRANSACTIONS.filter((t) => t.user_id === user.id),
  };
}

export function getMockOrderDetail(orderId: string): OrderDetail | null {
  const order = MOCK_ORDERS.find((o) => o.id === orderId);
  if (!order) return null;

  const user = MOCK_USERS.find((u) => u.id === order.user_id) ?? MOCK_USERS[1];
  const template = MOCK_TEMPLATES.find((t) => t.name === order.template_name) ?? MOCK_TEMPLATES[0];

  return {
    order: {
      id: order.id,
      short_code: order.short_code,
      user_id: order.user_id,
      photobooth_item_id: "77777777-7777-4777-8777-777777777701",
      quantity: order.quantity,
      unit_price_vnd: Math.round(order.total_price_vnd / Math.max(1, order.quantity)),
      total_price_vnd: order.total_price_vnd,
      shipping_name: order.customer_name,
      shipping_phone: order.shipping_phone,
      shipping_address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
      note: "Giao giờ hành chính",
      cover_type: "hard",
      paper_type: "premium",
      status: order.status,
      admin_notes: null,
      created_at: order.created_at,
      updated_at: order.created_at,
    },
    customer: {
      id: user.id,
      display_name: user.display_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
    },
    photobooth_item: {
      id: "77777777-7777-4777-8777-777777777701",
      template_id: template.id,
      preview_url: order.preview_url,
      status: "ordered",
      created_at: order.created_at,
    },
    template: {
      id: template.id,
      name: template.name,
      category: template.category,
      preview_url: template.preview_url,
      slot_count: template.slot_count,
      layout_config: template.layout_config,
    },
    slot_photos: Array.from({ length: template.slot_count }, (_, idx) => ({
      slot_index: idx,
      original_url: `https://placehold.co/1200x900/png?text=Slot+${idx + 1}`,
      thumbnail_url: `https://placehold.co/480x360/png?text=Slot+${idx + 1}`,
      width: 1200,
      height: 900,
    })),
    transactions: MOCK_TRANSACTIONS.filter((t) => t.order_id === order.id),
    status_history: [
      {
        id: "88888888-8888-4888-8888-888888888801",
        order_id: order.id,
        from_status: null,
        to_status: "pending",
        changed_by: order.user_id,
        changed_by_name: order.customer_name,
        note: "Khách hàng tạo đơn hàng",
        created_at: order.created_at,
      },
    ],
  };
}
