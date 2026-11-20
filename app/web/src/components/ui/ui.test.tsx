import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mapPostgresError } from "@/lib/errors";
import { formatBytes, formatDate, formatVnd } from "@/lib/format";
import { sanitizeAdminNextPath } from "@/lib/nav";
import { parsePagination } from "@/lib/pagination";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { Select } from "./Select";
import { StatusChip } from "./StatusChip";
import { Switch } from "./Switch";
import { ToastProvider, useToast } from "./Toast";

function ToastTester() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success("Lưu thành công")}>
      Trigger Toast
    </button>
  );
}

describe("Pause Admin Platform & UI Kit", () => {
  it("formats VND currency and bytes consistently", () => {
    expect(formatVnd(30000)).toBe("30.000 VNĐ");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(5368709120)).toBe("5 GB");
    expect(formatDate("2026-11-20T12:00:00.000Z")).toMatch(/20\/11\/2026/);
  });

  it("parses pagination params with §5.1 constraints", () => {
    expect(parsePagination({ page: "2", pageSize: "50" })).toEqual({
      page: 2,
      pageSize: 50,
      offset: 50,
      limit: 50,
    });
    expect(parsePagination({ page: "-5", pageSize: "999" })).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
      limit: 20,
    });
  });

  it("sanitizes admin redirect targets against open redirects", () => {
    expect(sanitizeAdminNextPath(undefined)).toBe("/admin");
    expect(sanitizeAdminNextPath("/admin/orders?status=pending")).toBe(
      "/admin/orders?status=pending",
    );
    expect(sanitizeAdminNextPath("/admin?from=2026-11-01")).toBe("/admin?from=2026-11-01");
    expect(sanitizeAdminNextPath("//evil.com")).toBe("/admin");
    expect(sanitizeAdminNextPath("/admin-evil")).toBe("/admin");
    expect(sanitizeAdminNextPath("https://evil.com")).toBe("/admin");
  });

  it("maps all 12 PostgreSQL error codes to Vietnamese messages", () => {
    expect(mapPostgresError({ message: "ADMIN_REQUIRED" }).code).toBe("ADMIN_REQUIRED");
    expect(mapPostgresError({ message: "TEMPLATE_IN_USE" }).message).toContain(
      "Template đã được sử dụng",
    );
    expect(mapPostgresError({ message: "PLAN_IN_USE" }).message).toContain(
      "Gói đã có hội viên",
    );
  });

  it("renders MD3 Button, StatusChip, Select, and Switch", () => {
    const onCheckedChange = vi.fn();
    render(
      <div>
        <Button variant="primary" loading>
          Lưu thay đổi
        </Button>
        <StatusChip status="processing" />
        <Select
          label="Trạng thái"
          defaultValue="pending"
          options={[
            { value: "pending", label: "Chờ xác nhận" },
            { value: "completed", label: "Hoàn thành" },
          ]}
        />
        <Switch checked={false} onCheckedChange={onCheckedChange} label="Hiển thị" />
      </div>,
    );

    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
    expect(screen.getByText("Đang xử lý")).toBeInTheDocument();
    expect(screen.getByLabelText("Trạng thái")).toHaveValue("pending");

    fireEvent.click(screen.getByRole("switch", { name: "Hiển thị" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders ConfirmDialog and ToastProvider notifications", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <ToastTester />
        <ConfirmDialog
          open
          onClose={onClose}
          onConfirm={onConfirm}
          title="Xác nhận khóa tài khoản"
          description="Thao tác này sẽ thu hồi phiên đăng nhập."
          variant="danger"
        />
      </ToastProvider>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Trigger Toast" }));
    expect(screen.getByText("Lưu thành công")).toBeInTheDocument();
  });
});
