"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterBar, SearchInput, Select } from "@/components/ui";
import {
  DEFAULT_USER_SORT,
  USER_ROLE_FILTER_OPTIONS,
  USER_SORT_SELECT_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  USER_TIER_FILTER_OPTIONS,
  type UserRoleFilter,
  type UserSortOption,
  type UserStatusFilter,
  type UserTierFilter,
} from "../schemas";
import styles from "./UsersFilters.module.css";

export interface UsersFiltersProps {
  initialFilters: {
    q: string;
    tier: UserTierFilter | "";
    status: UserStatusFilter | "";
    role: UserRoleFilter | "";
    sort: UserSortOption;
  };
}

export function UsersFilters({ initialFilters }: UsersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTier = searchParams.get("tier") ?? initialFilters.tier;
  const currentStatus = searchParams.get("status") ?? initialFilters.status;
  const currentRole = searchParams.get("role") ?? initialFilters.role;
  const currentSort = searchParams.get("sort") ?? initialFilters.sort;
  const currentSearch = searchParams.get("q") ?? initialFilters.q;

  const hasActiveFilters = Boolean(
    currentSearch ||
      currentTier ||
      currentStatus ||
      currentRole ||
      (currentSort && currentSort !== DEFAULT_USER_SORT),
  );

  const updateQueryParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleReset = () => {
    router.push(pathname, { scroll: false });
  };

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
      resetLabel="Xóa bộ lọc"
    >
      <div className={styles.searchField}>
        <span className={styles.fieldLabel}>Tìm kiếm</span>
        <SearchInput
          className={styles.searchInput}
          paramName="q"
          defaultValue={initialFilters.q}
          placeholder="Tên, email hoặc số điện thoại..."
          ariaLabel="Tìm kiếm người dùng theo tên, email hoặc số điện thoại"
        />
      </div>

      <div className={styles.selectField}>
        <Select
          label="Gói hội viên"
          aria-label="Lọc theo gói hội viên"
          value={currentTier}
          options={USER_TIER_FILTER_OPTIONS}
          onChange={(event) => updateQueryParam("tier", event.target.value)}
        />
      </div>

      <div className={styles.selectField}>
        <Select
          label="Trạng thái"
          aria-label="Lọc theo trạng thái tài khoản"
          value={currentStatus}
          options={USER_STATUS_FILTER_OPTIONS}
          onChange={(event) => updateQueryParam("status", event.target.value)}
        />
      </div>

      <div className={styles.selectField}>
        <Select
          label="Vai trò"
          aria-label="Lọc theo vai trò"
          value={currentRole}
          options={USER_ROLE_FILTER_OPTIONS}
          onChange={(event) => updateQueryParam("role", event.target.value)}
        />
      </div>

      <div className={styles.sortField}>
        <Select
          label="Sắp xếp"
          aria-label="Sắp xếp danh sách người dùng"
          value={currentSort || DEFAULT_USER_SORT}
          options={USER_SORT_SELECT_OPTIONS}
          onChange={(event) => updateQueryParam("sort", event.target.value)}
        />
      </div>
    </FilterBar>
  );
}
