"use client";

import { useEffect, useLayoutEffect } from "react";
import { resetDocumentScrollTop } from "./preview-state";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Ensures the `/preview` loading boundary paints at scrollTop 0 when navigated to
 * from a scrolled page like `/` or `/download`.
 */
export function PreviewScrollReset() {
  useIsomorphicLayoutEffect(() => {
    resetDocumentScrollTop();
  }, []);

  return null;
}
