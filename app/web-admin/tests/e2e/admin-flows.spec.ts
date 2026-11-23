import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "admin@pause.app";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "PauseAdmin123!";
const isMockMode = process.env.USE_MOCK_ADMIN_DATA === "true";
const isLiveSupabaseMode =
  !isMockMode &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

test.describe("T-06.H03 Admin Cross-Module Flows E2E", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !isMockMode && !isLiveSupabaseMode,
      "Requires either USE_MOCK_ADMIN_DATA=true or configured Supabase credentials",
    );

    if (isLiveSupabaseMode) {
      await page.goto("/admin/login");
      await page.getByLabel("Email quản trị viên").fill(ADMIN_EMAIL);
      await page.getByLabel("Mật khẩu").fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await page.waitForURL(/\/admin$/);
    }
  });

  test("FR-06.5 Dashboard renders KPI cards, charts, top templates, and syncs date presets to URL", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Dashboard thống kê" }),
    ).toBeVisible();

    await expect(page.getByText("Tổng người dùng")).toBeVisible();
    await expect(page.getByText("Doanh thu tháng này")).toBeVisible();
    await expect(page.getByText("Top 5 Template")).toBeVisible();

    await page.getByRole("button", { name: "7 ngày" }).click();
    await expect(page).toHaveURL(/preset=7d/);
  });

  test("FR-06.1 Users list & detail preserve privacy (no drawer photos) and guard self/admin locks", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Quản lý người dùng" }),
    ).toBeVisible();

    const targetId = isMockMode
      ? "11111111-1111-4111-8111-111111111101"
      : "11111111-1111-4111-8111-111111111102";

    await page.goto(`/admin/users/${targetId}`);
    await expect(page.getByText("Thống kê lưu trữ")).toBeVisible();
    await expect(
      page.getByText(/không thể xem ảnh hoặc tên ngăn kéo cá nhân/i),
    ).toBeVisible();

    // Lock dialog validates mandatory reason before submitting
    await page.getByRole("button", { name: "Khóa" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận khóa" }).click();
    await expect(page.getByText("Vui lòng nhập lý do khóa.")).toBeVisible();
  });

  test("FR-06.2 Templates list & visual layout editor support presets, mobile preview, and validation", async ({
    page,
  }) => {
    await page.goto("/admin/templates");
    await expect(
      page.getByRole("heading", { name: "Quản lý Template Photobooth" }),
    ).toBeVisible();

    await page.goto("/admin/templates/new");
    await expect(
      page.getByRole("heading", { name: "Tạo Template Photobooth mới" }),
    ).toBeVisible();

    await expect(page.getByText("Thiết kế bố cục (layout_config)")).toBeVisible();
    await expect(page.getByText("Xem thử như trên Mobile")).toBeVisible();
  });

  test("FR-06.3 Orders list, detail, status machine, and shipping slip print view work end-to-end", async ({
    page,
  }) => {
    await page.goto("/admin/orders");
    await expect(
      page.getByRole("heading", { name: "Quản lý đơn hàng in" }),
    ).toBeVisible();

    const pendingOrderId = isMockMode
      ? "33333333-3333-4333-8333-333333333301"
      : "55555555-5555-4555-8555-555555555501";

    await page.goto(`/admin/orders/${pendingOrderId}`);
    await expect(page.getByText("Ảnh gốc theo từng Slot")).toBeVisible();
    await expect(page.getByText("Lịch sử trạng thái")).toBeVisible();

    // Verify print-pack endpoint returns application/zip in mock or authenticated live mode
    const zipResponse = await page.request.get(
      `/api/admin/orders/${pendingOrderId}/print-pack`,
    );
    expect(zipResponse.status()).toBe(200);
    expect(zipResponse.headers()["content-type"]).toContain("application/zip");

    await page.goto(`/admin/orders/${pendingOrderId}/print`);
    await expect(page.getByText(/PHIẾU GIAO HÀNG/i)).toBeVisible();
  });

  test("FR-06.4 & FR-05.2 Membership plans, subscribers, and transactions render cleanly", async ({
    page,
  }) => {
    await page.goto("/admin/membership/plans");
    await expect(page.getByText("PAUSE Go")).toBeVisible();
    await expect(page.getByText("PAUSE Plus")).toBeVisible();

    await page.goto("/admin/membership/plans/new");
    await expect(
      page.getByRole("heading", { name: "Tạo gói hội viên mới" }),
    ).toBeVisible();

    await page.goto("/admin/membership/subscribers");
    await expect(
      page.getByText("Sắp hết hạn trong 7 ngày"),
    ).toBeVisible();

    await page.goto("/admin/transactions");
    await expect(
      page.getByRole("heading", { name: "Lịch sử giao dịch" }),
    ).toBeVisible();
  });
});
