export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

export type DashboardPreset = "7d" | "30d" | "month" | "custom";
export type RevenueGranularity = "day" | "week" | "month";

export interface DashboardRange {
  preset: DashboardPreset;
  from: string;
  to: string;
  granularity: RevenueGranularity;
  prevFrom: string;
  prevTo: string;
  dayCount: number;
}

export type DashboardSearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const vnPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VIETNAM_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function readParam(
  input: DashboardSearchParamsInput | undefined,
  key: string,
): string | undefined {
  if (!input) return undefined;
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatUtcIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoParts(isoDate: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE_PATTERN.exec(isoDate.trim());
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * Validates a strict YYYY-MM-DD calendar date string.
 */
export function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value) return false;
  return parseIsoParts(value) !== null;
}

/**
 * Returns today's calendar date (YYYY-MM-DD) in Asia/Ho_Chi_Minh timezone.
 */
export function getVietnamTodayIso(now: Date = new Date()): string {
  const parts = vnPartsFormatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a YYYY-MM-DD calendar date by deltaDays using pure UTC date math
 * so host timezone and DST never affect VN calendar arithmetic.
 */
export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const parts = parseIsoParts(isoDate);
  if (!parts) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + deltaDays));
  return formatUtcIsoDate(shifted);
}

/**
 * Returns the inclusive number of calendar days between two YYYY-MM-DD dates.
 */
export function diffIsoDaysInclusive(fromIso: string, toIso: string): number {
  const fromParts = parseIsoParts(fromIso);
  const toParts = parseIsoParts(toIso);
  if (!fromParts || !toParts) {
    throw new Error(`Invalid ISO date range: ${fromIso}..${toIso}`);
  }
  const fromUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toUtc = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  return Math.floor((toUtc - fromUtc) / MS_PER_DAY) + 1;
}

/**
 * Computes { from, to } in Asia/Ho_Chi_Minh for a standard dashboard preset.
 */
export function getPresetRange(
  preset: Exclude<DashboardPreset, "custom">,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = getVietnamTodayIso(now);

  switch (preset) {
    case "7d":
      return { from: shiftIsoDate(today, -6), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "30d":
    default:
      return { from: shiftIsoDate(today, -29), to: today };
  }
}

function isMatchingPresetRange(
  preset: Exclude<DashboardPreset, "custom">,
  from: string,
  to: string,
): boolean {
  const days = diffIsoDaysInclusive(from, to);
  if (preset === "7d") return days === 7;
  if (preset === "30d") return days === 30;
  return from.endsWith("-01") && from.slice(0, 7) === to.slice(0, 7);
}

export function parseGranularity(raw: string | undefined): RevenueGranularity {
  if (raw === "day" || raw === "week" || raw === "month") {
    return raw;
  }
  return "day";
}

function parseRawPreset(raw: string | undefined): DashboardPreset | undefined {
  if (raw === "7d" || raw === "30d" || raw === "month" || raw === "custom") {
    return raw;
  }
  return undefined;
}

/**
 * Parses URL search parameters into a normalized VN-timezone DashboardRange,
 * including the equal-length previous comparison period.
 */
export function parseDashboardSearchParams(
  searchParams?: DashboardSearchParamsInput,
  now: Date = new Date(),
): DashboardRange {
  const today = getVietnamTodayIso(now);
  const rawPreset = parseRawPreset(readParam(searchParams, "preset")?.trim());
  const rawFrom = readParam(searchParams, "from")?.trim();
  const rawTo = readParam(searchParams, "to")?.trim();
  const granularity = parseGranularity(readParam(searchParams, "granularity")?.trim());

  const validFrom = isValidIsoDate(rawFrom) ? rawFrom : undefined;
  const validTo = isValidIsoDate(rawTo) ? rawTo : undefined;

  let preset: DashboardPreset = "30d";
  let from: string;
  let to: string;

  if (rawPreset && rawPreset !== "custom") {
    if (validFrom && validTo) {
      const [normFrom, normTo] =
        validFrom <= validTo ? [validFrom, validTo] : [validTo, validFrom];
      from = normFrom;
      to = normTo;
      preset = isMatchingPresetRange(rawPreset, normFrom, normTo) ? rawPreset : "custom";
    } else {
      const resolved = getPresetRange(rawPreset, now);
      preset = rawPreset;
      from = resolved.from;
      to = resolved.to;
    }
  } else if (rawPreset === "custom" || validFrom || validTo) {
    if (validFrom && validTo) {
      const [normFrom, normTo] =
        validFrom <= validTo ? [validFrom, validTo] : [validTo, validFrom];
      from = normFrom;
      to = normTo;
      preset = "custom";
    } else if (validFrom) {
      from = validFrom;
      to = validFrom > today ? validFrom : today;
      preset = "custom";
    } else if (validTo) {
      to = validTo;
      from = shiftIsoDate(validTo, -29);
      preset = "custom";
    } else {
      const fallback = getPresetRange("30d", now);
      preset = "30d";
      from = fallback.from;
      to = fallback.to;
    }
  } else {
    const defaultRange = getPresetRange("30d", now);
    preset = "30d";
    from = defaultRange.from;
    to = defaultRange.to;
  }

  const dayCount = Math.max(1, diffIsoDaysInclusive(from, to));
  const prevTo = shiftIsoDate(from, -1);
  const prevFrom = shiftIsoDate(from, -dayCount);

  return {
    preset,
    from,
    to,
    granularity,
    prevFrom,
    prevTo,
    dayCount,
  };
}

/**
 * Builds canonical dashboard URL query string preserving date range & granularity.
 */
export function buildDashboardHref(params: {
  preset: DashboardPreset;
  from: string;
  to: string;
  granularity: RevenueGranularity;
}): string {
  const qs = new URLSearchParams({
    preset: params.preset,
    from: params.from,
    to: params.to,
    granularity: params.granularity,
  });
  return `/admin?${qs.toString()}`;
}

/**
 * Formats a YYYY-MM-DD date string to DD/MM/YYYY without timezone drift.
 */
export function formatIsoDateVi(isoDate: string): string {
  const parts = parseIsoParts(isoDate.slice(0, 10));
  if (!parts) return isoDate;
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

/**
 * Formats a revenue series bucket date for compact SVG X-axis labels.
 */
export function formatBucketShortLabel(
  bucket: string,
  granularity: RevenueGranularity,
): string {
  const normalized = bucket.slice(0, 10);
  const parts = parseIsoParts(normalized);
  if (!parts) return bucket;

  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month).padStart(2, "0");
  if (granularity === "month") {
    return `${mm}/${parts.year}`;
  }
  return `${dd}/${mm}`;
}

/**
 * Formats a revenue series bucket date for tooltips and accessible data tables.
 */
export function formatBucketFullLabel(
  bucket: string,
  granularity: RevenueGranularity,
): string {
  const normalized = bucket.slice(0, 10);
  const parts = parseIsoParts(normalized);
  if (!parts) return bucket;

  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month).padStart(2, "0");

  if (granularity === "month") {
    return `Tháng ${mm}/${parts.year}`;
  }
  if (granularity === "week") {
    return `Tuần từ ${dd}/${mm}/${parts.year}`;
  }
  return `${dd}/${mm}/${parts.year}`;
}

/**
 * Enumerates YYYY-MM-DD dates from `from` through `to` (inclusive, capped defensively).
 */
export function enumerateIsoDates(from: string, to: string, maxDays = 366): string[] {
  if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to) {
    return [];
  }
  const total = Math.min(diffIsoDaysInclusive(from, to), maxDays);
  const result: string[] = [];
  for (let i = 0; i < total; i += 1) {
    result.push(shiftIsoDate(from, i));
  }
  return result;
}

/**
 * Returns the Monday YYYY-MM-DD bucket start for a YYYY-MM-DD date (matches PostgreSQL date_trunc('week', date)).
 */
export function getIsoWeekBucketStart(isoDate: string): string {
  const parts = parseIsoParts(isoDate.slice(0, 10));
  if (!parts) return isoDate;
  const utcDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const offsetFromMonday = (utcDay + 6) % 7;
  return shiftIsoDate(isoDate.slice(0, 10), -offsetFromMonday);
}
