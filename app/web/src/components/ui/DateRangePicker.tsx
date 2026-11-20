"use client";

import React, { useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./DateRangePicker.module.css";

export interface DateRangeValue {
  from: string;
  to: string;
}

export interface DateRangePickerProps {
  fromParam?: string;
  toParam?: string;
  fromValue?: string;
  toValue?: string;
  onChange?: (range: DateRangeValue) => void;
  syncUrl?: boolean;
  showPresets?: boolean;
  className?: string;
}

const vnIsoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatVietnamIsoDate(date: Date): string {
  return vnIsoFormatter.format(date);
}

function daysAgoVietnamIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return formatVietnamIsoDate(now);
}

function startOfVietnamMonthIso(): string {
  const today = formatVietnamIsoDate(new Date());
  return `${today.slice(0, 8)}01`;
}

export function DateRangePicker({
  fromParam = "from",
  toParam = "to",
  fromValue,
  toValue,
  onChange,
  syncUrl = true,
  showPresets = false,
  className = "",
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseId = useId();

  const currentFrom = fromValue ?? searchParams.get(fromParam) ?? "";
  const currentTo = toValue ?? searchParams.get(toParam) ?? "";

  const applyRange = (nextFrom: string, nextTo: string) => {
    onChange?.({ from: nextFrom, to: nextTo });

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (nextFrom) {
        params.set(fromParam, nextFrom);
      } else {
        params.delete(fromParam);
      }
      if (nextTo) {
        params.set(toParam, nextTo);
      } else {
        params.delete(toParam);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.inputs}>
        <div className={styles.field}>
          <label htmlFor={`${baseId}-from`} className={styles.label}>
            Từ ngày
          </label>
          <input
            id={`${baseId}-from`}
            type="date"
            value={currentFrom}
            max={currentTo || undefined}
            onChange={(e) => applyRange(e.target.value, currentTo)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={`${baseId}-to`} className={styles.label}>
            Đến ngày
          </label>
          <input
            id={`${baseId}-to`}
            type="date"
            value={currentTo}
            min={currentFrom || undefined}
            onChange={(e) => applyRange(currentFrom, e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      {showPresets ? (
        <div className={styles.presets}>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() =>
              applyRange(daysAgoVietnamIso(6), formatVietnamIsoDate(new Date()))
            }
          >
            7 ngày
          </button>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() =>
              applyRange(daysAgoVietnamIso(29), formatVietnamIsoDate(new Date()))
            }
          >
            30 ngày
          </button>
          <button
            type="button"
            className={styles.presetBtn}
            onClick={() =>
              applyRange(startOfVietnamMonthIso(), formatVietnamIsoDate(new Date()))
            }
          >
            Tháng này
          </button>
          {currentFrom || currentTo ? (
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => applyRange("", "")}
            >
              Xóa ngày
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
