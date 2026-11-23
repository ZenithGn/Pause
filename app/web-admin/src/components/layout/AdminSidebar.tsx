"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  CreditCard,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  X,
} from "lucide-react";
import { ADMIN_NAV_GROUPS, type AdminNavIconKey } from "@/lib/nav";
import styles from "./AdminSidebar.module.css";

const NAV_ICON_MAP: Record<AdminNavIconKey, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  users: <Users size={18} />,
  templates: <ImageIcon size={18} />,
  orders: <Package size={18} />,
  plans: <Award size={18} />,
  subscribers: <CreditCard size={18} />,
  transactions: <Receipt size={18} />,
};

export interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isRouteActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Menu điều hướng quản trị"
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brandBar}>
          <Link href="/admin" className={styles.brandLink} onClick={onClose}>
            <span className={styles.brandMark} aria-hidden="true">
              P
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>Pause</span>
              <span className={styles.brandTag}>Admin Portal</span>
            </span>
          </Link>

          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Đóng thanh điều hướng"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navScroll}>
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className={styles.groupTitle}>{group.title}</p>
              <ul className={styles.groupList}>
                {group.items.map((item) => {
                  const active = isRouteActive(item.href, item.exact);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                      >
                        <span aria-hidden="true">{NAV_ICON_MAP[item.icon]}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.footerNote}>
          Pause Admin · Múi giờ VN (UTC+7)
        </div>
      </aside>
    </>
  );
}
