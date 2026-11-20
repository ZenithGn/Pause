export type AdminNavIconKey =
  | "dashboard"
  | "users"
  | "templates"
  | "orders"
  | "plans"
  | "subscribers"
  | "transactions";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: AdminNavIconKey;
  exact?: boolean;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

/**
 * Complete Wave 0 navigation config (§2.1 & T-06.A07).
 * Populated upfront so Wave 1 feature modules do not modify nav.ts.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "Tổng quan",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: "dashboard",
        exact: true,
      },
    ],
  },
  {
    title: "Quản trị nội dung & đơn hàng",
    items: [
      {
        label: "Người dùng",
        href: "/admin/users",
        icon: "users",
      },
      {
        label: "Templates",
        href: "/admin/templates",
        icon: "templates",
      },
      {
        label: "Đơn hàng",
        href: "/admin/orders",
        icon: "orders",
      },
    ],
  },
  {
    title: "Hội viên & Tài chính",
    items: [
      {
        label: "Gói hội viên",
        href: "/admin/membership/plans",
        icon: "plans",
      },
      {
        label: "Hội viên",
        href: "/admin/membership/subscribers",
        icon: "subscribers",
      },
      {
        label: "Giao dịch",
        href: "/admin/transactions",
        icon: "transactions",
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/**
 * Ensures post-login redirect targets remain strictly within /admin to prevent open redirects.
 */
export function sanitizeAdminNextPath(rawNext: string | undefined): string {
  if (!rawNext) return "/admin";
  const isAdminRoute =
    rawNext === "/admin" ||
    rawNext.startsWith("/admin/") ||
    rawNext.startsWith("/admin?");
  if (isAdminRoute && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")) {
    return rawNext;
  }
  return "/admin";
}
