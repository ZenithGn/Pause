"use client";

import React from "react";
import Link from "next/link";
import { Button, ErrorState } from "@/components/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Không thể hiển thị trang quản trị"
      message={
        error.message && process.env.NODE_ENV === "development"
          ? error.message
          : "Đã xảy ra sự cố không mong muốn trong quá trình xử lý dữ liệu. Vui lòng thử lại."
      }
      onRetry={reset}
      action={
        <Link href="/admin">
          <Button variant="text" size="sm">
            Về Dashboard
          </Button>
        </Link>
      }
    />
  );
}
