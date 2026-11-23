"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./SearchInput.module.css";

export interface SearchInputProps {
  paramName?: string;
  defaultValue?: string;
  value?: string;
  onSearch?: (value: string) => void;
  syncUrl?: boolean;
  placeholder?: string;
  debounceMs?: number;
  ariaLabel?: string;
  className?: string;
}

export function SearchInput({
  paramName = "q",
  defaultValue,
  value: controlledValue,
  onSearch,
  syncUrl = true,
  placeholder = "Tìm kiếm...",
  debounceMs = 300,
  ariaLabel = "Tìm kiếm",
  className = "",
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlValue = searchParams.get(paramName) ?? "";
  const [innerValue, setInnerValue] = useState<string>(
    controlledValue ?? defaultValue ?? urlValue,
  );
  const lastCommittedRef = useRef<string>(controlledValue ?? defaultValue ?? urlValue);

  // Keep local state in sync when controlled value or URL param resets externally
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInnerValue(controlledValue);
      lastCommittedRef.current = controlledValue;
    }
  }, [controlledValue]);

  useEffect(() => {
    if (controlledValue === undefined && syncUrl) {
      setInnerValue(urlValue);
      lastCommittedRef.current = urlValue;
    }
  }, [urlValue, controlledValue, syncUrl]);

  const commitSearch = (nextValue: string) => {
    const trimmed = nextValue.trim();
    if (trimmed === lastCommittedRef.current.trim()) return;
    lastCommittedRef.current = trimmed;

    onSearch?.(trimmed);

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set(paramName, trimmed);
      } else {
        params.delete(paramName);
      }
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      commitSearch(innerValue);
    }, debounceMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerValue, debounceMs]);

  const handleClear = () => {
    setInnerValue("");
    commitSearch("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitSearch(innerValue);
    }
  };

  return (
    <div className={`${styles.wrap} ${className}`}>
      <Search size={16} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        value={innerValue}
        onChange={(e) => setInnerValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={styles.input}
      />
      {innerValue ? (
        <button
          type="button"
          className={styles.clearBtn}
          aria-label="Xóa từ khóa tìm kiếm"
          onClick={handleClear}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
