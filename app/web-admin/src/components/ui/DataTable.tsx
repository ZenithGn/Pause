"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./Skeleton";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: (row: T) => string;
  sort?: string;
  onSortChange?: (nextSort: string) => void;
  syncUrl?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

function getAlignClass(align?: "left" | "center" | "right"): string {
  if (align === "center") return styles.alignCenter;
  if (align === "right") return styles.alignRight;
  return styles.alignLeft;
}

function resolveCellValue<T>(row: T, key: string): React.ReactNode {
  if (row && typeof row === "object" && key in row) {
    const val = (row as Record<string, unknown>)[key];
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "string" || typeof val === "number") return val;
    if (typeof val === "boolean") return val ? "Có" : "Không";
    return String(val);
  }
  return "—";
}

function resolveRowKey<T>(row: T, index: number, rowKey?: (row: T) => string): string {
  if (rowKey) return rowKey(row);
  if (row && typeof row === "object" && "id" in row) {
    const id = (row as Record<string, unknown>).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return String(index);
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  sort,
  onSortChange,
  syncUrl = true,
  loading = false,
  skeletonRows = 5,
  emptyState,
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = sort ?? searchParams.get("sort") ?? "";
  const [activeSortField, activeSortDir] = currentSort.split(".");

  const handleSort = (field: string) => {
    const nextDir =
      activeSortField === field && activeSortDir === "desc" ? "asc" : "desc";
    const nextSort = `${field}.${nextDir}`;

    if (onSortChange) {
      onSortChange(nextSort);
      return;
    }

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", nextSort);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  if (loading) {
    return (
      <div className={`${styles.wrapper} ${className}`}>
        <TableSkeleton rows={skeletonRows} columns={Math.max(1, columns.length)} />
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState ?? <EmptyState />}</>;
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((column) => {
                const sortField = column.sortKey ?? column.key;
                const isSorted = activeSortField === sortField;
                const alignClass = getAlignClass(column.align);

                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={`${styles.th} ${alignClass}`}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className={styles.sortButton}
                        onClick={() => handleSort(sortField)}
                      >
                        <span>{column.header}</span>
                        {isSorted ? (
                          activeSortDir === "asc" ? (
                            <ArrowUp size={14} className={styles.sortIconActive} />
                          ) : (
                            <ArrowDown size={14} className={styles.sortIconActive} />
                          )
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={resolveRowKey(row, index, rowKey)}
                className={`${styles.tr} ${onRowClick ? styles.trClickable : ""}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${styles.td} ${getAlignClass(column.align)}`}
                  >
                    {column.render ? column.render(row) : resolveCellValue(row, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
