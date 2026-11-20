export const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
export type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: AllowedPageSize = 20;

export interface ParsedPagination {
  page: number;
  pageSize: AllowedPageSize;
  offset: number;
  limit: number;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function readParam(params: SearchParamsRecord | URLSearchParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses URL pagination query params (?page=1&pageSize=20) according to §5.1.
 * Allowed pageSize values: 10, 20, 50 (defaults to 20).
 */
export function parsePagination(
  searchParams: SearchParamsRecord | URLSearchParams = {},
): ParsedPagination {
  const rawPage = Number.parseInt(readParam(searchParams, "page") ?? "1", 10);
  const rawSize = Number.parseInt(readParam(searchParams, "pageSize") ?? `${DEFAULT_PAGE_SIZE}`, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize: AllowedPageSize = (ALLOWED_PAGE_SIZES as readonly number[]).includes(rawSize)
    ? (rawSize as AllowedPageSize)
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
