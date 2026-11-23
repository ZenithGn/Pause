import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "admin@pause.app";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "PauseAdmin123!";
const USER_EMAIL = process.env.PLAYWRIGHT_USER_EMAIL ?? "linh@pause.app";
const USER_PASSWORD = process.env.PLAYWRIGHT_USER_PASSWORD ?? "PauseUser123!";
const LOCKED_ADMIN_EMAIL = process.env.PLAYWRIGHT_LOCKED_ADMIN_EMAIL ?? "";
const LOCKED_ADMIN_PASSWORD = process.env.PLAYWRIGHT_LOCKED_ADMIN_PASSWORD ?? "";

const isLiveSupabaseMode =
  process.env.USE_MOCK_ADMIN_DATA !== "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

test.describe("T-06.H02 Admin Auth Guard E2E", () => {
  test("redirects unauthenticated guest from protected /admin routes to /admin/login?next=", async ({
    page,
  }) => {
    test.skip(
      process.env.USE_MOCK_ADMIN_DATA === "true",
      "Mock mode explicitly bypasses auth middleware",
    );

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?.*next=%2Fadmin/);
    await expect(
      page.getByRole("heading", { name: "Đăng nhập Quản trị" }),
    ).toBeVisible();

    await page.goto("/admin/orders?status=pending");
    await expect(page).toHaveURL(
      /\/admin\/login\?.*next=%2Fadmin%2Forders%3Fstatus%3Dpending/,
    );
  });

  test("rejects unauthenticated requests to admin print-pack API route with 401", async ({
    request,
  }) => {
    test.skip(
      process.env.USE_MOCK_ADMIN_DATA === "true",
      "Mock mode explicitly allows preview access",
    );

    const response = await request.get(
      "/api/admin/orders/55555555-5555-4555-8555-555555555501/print-pack",
    );
    expect(response.status()).toBe(401);
  });

  test("displays Vietnamese forbidden and locked query error banners on /admin/login", async ({
    page,
  }) => {
    await page.goto("/admin/login?error=forbidden");
    await expect(page.getByRole("alert")).toContainText(
      "Bạn không có quyền quản trị",
    );

    await page.goto("/admin/login?error=locked");
    await expect(page.getByRole("alert")).toContainText("đã bị khóa");
  });

  test("blocks non-admin user from signing into /admin", async ({ page }) => {
    test.skip(
      !isLiveSupabaseMode,
      "Requires live Supabase instance with seeded users (supabase/seed/admin_seed.sql)",
    );

    await page.goto("/admin/login");
    await page.getByLabel("Email quản trị viên").fill(USER_EMAIL);
    await page.getByLabel("Mật khẩu").fill(USER_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("alert")).toContainText(
      "không có quyền truy cập trang quản trị",
    );
  });

  test("blocks locked admin account from signing into /admin", async ({
    page,
  }) => {
    test.skip(
      !isLiveSupabaseMode || !LOCKED_ADMIN_EMAIL || !LOCKED_ADMIN_PASSWORD,
      "Requires PLAYWRIGHT_LOCKED_ADMIN_EMAIL and PLAYWRIGHT_LOCKED_ADMIN_PASSWORD",
    );

    await page.goto("/admin/login");
    await page.getByLabel("Email quản trị viên").fill(LOCKED_ADMIN_EMAIL);
    await page.getByLabel("Mật khẩu").fill(LOCKED_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("alert")).toContainText("đã bị khóa");
  });

  test("allows valid admin to sign in, browse /admin, and sign out", async ({
    page,
  }) => {
    test.skip(
      !isLiveSupabaseMode,
      "Requires live Supabase instance with seeded admin@pause.app",
    );

    await page.goto("/admin/login");
    await page.getByLabel("Email quản trị viên").fill(ADMIN_EMAIL);
    await page.getByLabel("Mật khẩu").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await page.waitForURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard thống kê" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL(/\/admin\/login/);
  });
});
