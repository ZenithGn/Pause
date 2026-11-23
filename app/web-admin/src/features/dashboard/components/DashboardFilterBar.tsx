"use client";

import React, { useId, useRef, useTransition } from "react";
import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui";
import {
  buildDashboardHref,
  formatIsoDateVi,
  getPresetRange,
  isValidIsoDate,
  type DashboardPreset,
  type DashboardRange,
  type RevenueGranularity,
} from "../date-range";
import styles from "./DashboardFilterBar.module.css";

export interface DashboardFilterBarProps {
  range: DashboardRange;
  todayVn: string;
}

const PRESET_OPTIONS: Array<{
  value: Exclude<DashboardPreset, "custom">;
  label: string;
}> = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "month", label: "Tháng này" },
];

const GRANULARITY_OPTIONS: Array<{
  value: RevenueGranularity;
  label: string;
}> = [
  { value: "day", label: "Theo ngày" },
  { value: "week", label: "Theo tuần" },
  { value: "month", label: "Theo tháng" },
];

export function DashboardFilterBar({ range, todayVn }: DashboardFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const baseId = useId();
  const fromInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = (params: {
    preset: DashboardPreset;
    from: string;
    to: string;
    granularity: RevenueGranularity;
  }) => {
    const href = buildDashboardHref(params);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  const handlePresetSelect = (preset: Exclude<DashboardPreset, "custom">) => {
    const nextDates = getPresetRange(preset);
    navigate({
      preset,
      from: nextDates.from,
      to: nextDates.to,
      granularity: range.granularity,
    });
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    if (!isValidIsoDate(value)) return;
    let nextFrom = field === "from" ? value : range.from;
    let nextTo = field === "to" ? value : range.to;

    if (nextFrom > nextTo) {
      if (field === "from") {
        nextTo = nextFrom;
      } else {
        nextFrom = nextTo;
      }
    }

    navigate({
      preset: "custom",
      from: nextFrom,
      to: nextTo,
      granularity: range.granularity,
    });
  };

  const handleGranularityChange = (granularity: RevenueGranularity) => {
    navigate({
      preset: range.preset,
      from: range.from,
      to: range.to,
      granularity,
    });
  };

  const handleReset = () => {
    const defaultDates = getPresetRange("30d");
    navigate({
      preset: "30d",
      from: defaultDates.from,
      to: defaultDates.to,
      granularity: "day",
    });
  };

  const hasActiveFilters = range.preset !== "30d" || range.granularity !== "day";

  return (
    <section
      aria-label="Bộ lọc thời gian dashboard"
      className={`${styles.filterRow} ${isPending ? styles.filterRowPending : ""}`}
    >
      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        resetLabel="Mặc định (30 ngày)"
        actions={
          <div className={styles.rangeSummary} aria-live="polite">
            <Calendar size={14} aria-hidden="true" />
            <span>
              <strong className={styles.summaryStrong}>
                {formatIsoDateVi(range.from)} – {formatIsoDateVi(range.to)}
              </strong>{" "}
              ({range.dayCount} ngày · GMT+7)
            </span>
          </div>
        }
      >
        <div className={styles.topControls}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Khoảng thời gian</span>
            <div className={styles.segmented} role="group" aria-label="Khoảng thời gian nhanh">
              {PRESET_OPTIONS.map((opt) => {
                const isActive = range.preset === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isActive}
                    disabled={isPending}
                    className={`${styles.segBtn} ${isActive ? styles.segBtnActive : ""}`}
                    onClick={() => handlePresetSelect(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={range.preset === "custom"}
                disabled={isPending}
                className={`${styles.segBtn} ${
                  range.preset === "custom" ? styles.segBtnActive : ""
                }`}
                onClick={() => fromInputRef.current?.focus()}
              >
                Tuỳ chọn
              </button>
            </div>
          </div>

          <div className={styles.dateInputs}>
            <div className={styles.group}>
              <label htmlFor={`${baseId}-from`} className={styles.groupLabel}>
                Từ ngày
              </label>
              <input
                ref={fromInputRef}
                id={`${baseId}-from`}
                type="date"
                value={range.from}
                max={range.to || todayVn}
                disabled={isPending}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className={styles.dateInput}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor={`${baseId}-to`} className={styles.groupLabel}>
                Đến ngày
              </label>
              <input
                id={`${baseId}-to`}
                type="date"
                value={range.to}
                min={range.from}
                max={todayVn}
                disabled={isPending}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.groupLabel}>Độ chia biểu đồ</span>
            <div className={styles.segmented} role="group" aria-label="Độ chia thời gian">
              {GRANULARITY_OPTIONS.map((opt) => {
                const isActive = range.granularity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isActive}
                    disabled={isPending}
                    className={`${styles.segBtn} ${isActive ? styles.segBtnActive : ""}`}
                    onClick={() => handleGranularityChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FilterBar>
    </section>
  );
}
