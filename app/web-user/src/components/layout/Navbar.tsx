"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";

interface NavLinkItem {
  href: string;
  label: string;
  hasGoldDot?: boolean;
  isCta?: boolean;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/preview", label: "Preview mẫu in", hasGoldDot: true },
  { href: "/download", label: "Tải phần mềm", isCta: true },
];

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }

      if (event.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  const isTransparentHero = isHome && !isScrolled;

  return (
    <>
      <header
        className={`${styles.header} ${isTransparentHero ? styles.headerHero : styles.headerSolid
          }`}
      >
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label="Pause - Trang chủ">
            <span className={styles.brandMark} aria-hidden="true">
              P
            </span>
            <span className={styles.brandWordmark}>Pause</span>
          </Link>

          <nav className={styles.desktopNav} aria-label="Điều hướng chính">
            {NAV_LINKS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              if (item.isCta) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.ctaLink} ${isTransparentHero ? styles.ctaLinkHero : styles.ctaLinkSolid
                      } ${isActive ? styles.ctaActive : ""}`}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""
                    }`}
                >
                  <span>{item.label}</span>
                  {item.hasGoldDot ? (
                    <span className={styles.goldDot} aria-hidden="true" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={drawerOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            {drawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {drawerOpen ? (
        <div
          className={styles.drawerBackdrop}
          role="presentation"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            className={styles.drawerPanel}
            aria-label="Menu di động"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <Link
                href="/"
                className={styles.brand}
                onClick={() => setDrawerOpen(false)}
              >
                <span className={styles.brandMark} aria-hidden="true">
                  P
                </span>
                <span className={styles.brandWordmark}>Pause</span>
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.drawerClose}
                aria-label="Đóng menu"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <nav className={styles.drawerNav} aria-label="Điều hướng di động">
              {NAV_LINKS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`${styles.drawerLink} ${item.isCta ? styles.drawerCta : ""
                      } ${isActive ? styles.drawerLinkActive : ""}`}
                  >
                    <span>{item.label}</span>
                    {item.hasGoldDot ? (
                      <span className={styles.goldDot} aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
