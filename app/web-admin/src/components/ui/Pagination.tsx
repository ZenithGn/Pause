"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ALLOWED_PAGE_SIZES, getTotalPages, type AllowedPageSize } from "@/lib/pagination";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: AllowedPageSize) => void;
  syncUrl?: boolean;
  className?: string;
}

function buildPageList(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  syncUrl = true,
  className = "",
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = getTotalPages(totalCount, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, safePage * pageSize);

  const navigate = (nextPage: number, nextSize?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    if (nextSize !== undefined) {
      params.set("pageSize", String(nextSize));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === safePage) return;
    if (onPageChange) {
      onPageChange(nextPage);
    } else if (syncUrl) {
      navigate(nextPage);
    }
  };

  const handleSize = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value) as AllowedPageSize;
    if (onPageSizeChange) {
      onPageSizeChange(nextSize);
    } else if (syncUrl) {
      navigate(1, nextSize);
    }
  };

  const pageList = buildPageList(safePage, totalPages);

  return (
    <nav
      aria-label="Phân trang"
      className={`${styles.container} ${className}`}
    >
      <p className={styles.summary}>
        {totalCount === 0
          ? "Không có mục nào"
          : `Hiển thị ${startItem}–${endItem} trên ${totalCount} mục`}
      </p>

      <div className={styles.controls}>
        <label className={styles.sizePicker}>
          <span>Số dòng:</span>
          <select
            aria-label="Số dòng mỗi trang"
            className={styles.sizeSelect}
            value={pageSize}
            onChange={handleSize}
          >
            {ALLOWED_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.pages}>
          <button
            type="button"
            className={styles.pageBtn}
            aria-label="Trang trước"
            disabled={safePage <= 1}
            onClick={() => handlePage(safePage - 1)}
          >
            <ChevronLeft size={16} />
          </button>

          {pageList.map((entry, idx) =>
            entry === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className={styles.ellipsis} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className={`${styles.pageBtn} ${entry === safePage ? styles.pageBtnActive : ""}`}
                aria-current={entry === safePage ? "page" : undefined}
                onClick={() => handlePage(entry)}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            className={styles.pageBtn}
            aria-label="Trang sau"
            disabled={safePage >= totalPages}
            onClick={() => handlePage(safePage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
