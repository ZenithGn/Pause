# 🟡 FR-06 – Quản trị hệ thống (Admin Dashboard)

> **Module**: Admin Dashboard (Next.js Web + Supabase Backend)
> **Trạng thái**: 🟡 Hoàn thành phần Web & Supabase Backend (còn kiểm thử 4 trình duyệt `T-06.H05`, benchmark tải `T-06.H06` trên DB live, và 2 task phối hợp mobile `T-06.X01`/`T-06.X02`)
> **Kế hoạch gốc**: [fr-06-admin-task-breakdown.md](../active/fr-06-admin-task-breakdown.md) · [task-breakdown.md – FR-06](../active/task-breakdown.md#task-breakdown--fr-06-quản-trị-hệ-thống-admin)
> **Yêu cầu**: [FR-06](../01-BA/SRS/01-fr.md#fr-06-quản-trị-hệ-thống-admin) · [FR-05.2](../01-BA/SRS/01-fr.md#fr-05-thanh-toán-payment)
> **Design**: Material Design 3 với bảng màu thương hiệu Pause (`#630D11`, nền `#F7F6F5`, surface `#FFFFFF`, ink `#111111`) – CSS Modules thuần (không TailwindCSS)
> **Lưu trữ ảnh**: [storage-strategy.md](../03-References/storage-strategy.md) (Cloudinary `pause/templates` + fallback bucket `templates`)
> **Tasks**: 80/84 · **Vitest**: 100 passed / 0 failed (7 files) · **SQL checks**: 146/146

---

## 1. Tóm tắt

| Phần | Nội dung |
|---|---|
| **Backend (`supabase/`)** | Migration `20261120120000_fr06_admin.sql`: `is_admin()`, cột khóa tài khoản trên `profiles` (`is_locked`, `locked_at`, `locked_reason`) + trigger chống tự nâng quyền, bảng `admin_audit_logs`, `print_order_status_history`, đồng bộ trigger `notify_print_order_status()` (`processing`/`completed`), RLS bảo vệ quyền riêng tư ảnh ngăn kéo (`photos` chỉ đọc được khi thuộc `print_orders`), validate `layout_config`, index tối ưu, 21 RPC `admin_*` + seed `supabase/seed/admin_seed.sql` |
| **Platform & Bảo mật (`app/web`)** | Next.js 15.5 App Router + TypeScript `strict: true`, `middleware.ts`, `requireAdmin()`, `/admin/login` + `/admin/forbidden`, tách `public-env.ts` và `env.ts` (không lọt secret vào client bundle), `supabase/admin.ts` (`import "server-only"`), security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`), bộ UI kit MD3 + `AdminShell` |
| **FR-06.1 Users** | `/admin/users` (tìm theo tên/email/SĐT, lọc tier/trạng thái/vai trò, sort, phân trang server-side) và `/admin/users/[id]` (chỉ số liệu lưu trữ tổng hợp, không hiển thị ảnh ngăn kéo cá nhân; khóa/mở khóa đồng bộ RPC + Supabase Auth Admin kèm rollback tự động, chặn tự khóa / khóa admin khác) |
| **FR-06.2 Templates** | `/admin/templates`, `/admin/templates/new`, `/admin/templates/[id]`: CRUD, tag Free/VIP, ẩn/hiện optimistic, bảo vệ `TEMPLATE_IN_USE`, ký upload Cloudinary phía server (`sign-upload.ts` với `server-only`, magic-byte check ≤ 5 MB) + fallback Supabase Storage `templates`, trình chỉnh `layout_config` trực quan (SVG kéo-thả/resize snap 10px, 4 preset, JSON line-mapped errors, xem thử crop-fill giống mobile) |
| **FR-06.3 Orders** | `/admin/orders` (tab 6 trạng thái kèm đếm live, lọc khoảng ngày, xuất CSV), `/admin/orders/[id]` (preview + lưới ảnh slot tải ảnh gốc, shipping card + copy, transactions, timeline, `admin_notes`), `/admin/orders/[id]/print` (phiếu giao hàng `@media print`), `/api/admin/orders/[id]/print-pack` (GET zip `order.txt` + ảnh gốc qua `JSZip`), máy trạng thái `status-machine.ts` khớp 100% RPC |
| **FR-06.4 & FR-05.2** | `/admin/membership/plans`, `/admin/membership/plans/new`, `/admin/membership/plans/[id]` (CRUD, quy đổi GB↔bytes, cảnh báo chỉnh sửa chỉ áp dụng cho lượt mua mới, bảo vệ `PLAN_IN_USE`), `/admin/membership/subscribers` (lọc sắp hết hạn 7 ngày, `days_left`), `/admin/transactions` (lọc loại/trạng thái/ngày, tìm `order_code`/`payment_gateway_ref`, modal `metadata` JSON) |
| **FR-06.5 Dashboard** | `/admin`: bộ lọc khoảng ngày + granularity đồng bộ URL theo múi giờ `Asia/Ho_Chi_Minh`, 7 KPI kèm so sánh kỳ trước, biểu đồ doanh thu SVG 2 chuỗi (in ấn vs hội viên + bảng số liệu ẩn/mở), phân bổ trạng thái đơn, phân bố gói hội viên (gồm `Free`), Top 5 template, hoạt động gần đây; bọc `Suspense` + `DashboardWidgetErrorBoundary` từng widget |

---

## 2. Đối chiếu FR-06 & FR-05.2

| FR | Yêu cầu | Hiện thực |
|---|---|---|
| **FR-06.1** | Quản lý người dùng (xem, tìm kiếm, chi tiết, khóa/mở khóa) | `admin_list_users`, `admin_get_user_detail`, `admin_set_user_lock` + `auth.admin.updateUserById`; `/admin/users`, `/admin/users/[id]`; chỉ trả thống kê tổng hợp, không lộ ảnh ngăn kéo (NFR-04.2) |
| **FR-06.2** | Quản lý template (CRUD, ẩn/hiện, free/premium, category) | `admin_list_templates`, `admin_upsert_template`, `admin_set_template_active`, `admin_delete_template`; `/admin/templates*`; ký upload Cloudinary server-side + visual layout editor & mobile preview |
| **FR-06.3** | Quản lý đơn hàng (lọc trạng thái, chi tiết, cập nhật trạng thái) | `admin_list_orders`, `admin_order_status_counts`, `admin_get_order_detail`, `admin_update_order_status`, `admin_update_order_notes`; `/admin/orders*`, phiếu in `/print` & zip `/api/admin/orders/[id]/print-pack` |
| **FR-06.4** | Quản lý gói hội viên (CRUD gói, cấu hình quyền lợi, danh sách hội viên) | `admin_list_membership_plans`, `admin_upsert_membership_plan`, `admin_delete_membership_plan`, `admin_list_memberships`; `/admin/membership/plans*`, `/admin/membership/subscribers` |
| **FR-06.5** | Dashboard thống kê (user, đơn hôm nay, doanh thu tháng, top template) | `admin_dashboard_stats`, `admin_revenue_series`, `admin_top_templates`, `admin_membership_distribution`; `/admin` với streaming `Suspense` & error boundary cô lập theo widget |
| **FR-05.2** *(admin)* | Đối soát giao dịch (`pending/success/failed/refunded`, `order_code`, mã gateway) | `admin_list_transactions` (kèm `metadata jsonb`); `/admin/transactions` có lọc, tìm kiếm, dialog chi tiết và link tới đơn/user |

---

## 3. Quyết định & sai lệch

| # | Quyết định / Sai lệch | Lý do & Ghi chú |
|---|---|---|
| 1 | Đồng bộ trigger `notify_print_order_status()` từ `confirmed`/`delivered` sang `processing`/`completed` | Migration FR-07 cũ dùng tên trạng thái lệch với `domain-glossary.md` và máy trạng thái `print_orders`; sửa trong `20261120120000_fr06_admin.sql` để user nhận đủ thông báo khi admin xử lý/hoàn thành đơn |
| 2 | Tách `src/lib/public-env.ts` khỏi `src/lib/env.ts` | Tránh Webpack đóng gói `serverSecretsSchema` (tên biến `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`) vào client chunk khi `TemplateImageUploader` dùng `createSupabaseBrowserClient()` |
| 3 | Bổ sung `metadata jsonb` vào RPC `admin_list_transactions` | Hỗ trợ panel chi tiết đối soát PayOS/VietQR (`T-06.F05`) mà không cần thêm RPC riêng |
| 4 | Chế độ xem thử offline `USE_MOCK_ADMIN_DATA=true` | Cho phép smoke test giao diện và toàn bộ route khi chưa khởi chạy Supabase local; bị tắt mặc định (`false`) và không bao giờ kích hoạt trên client (`typeof window !== "undefined"` trả `false`) |
| 5 | Giữ `package.json` gọn, thêm `tests/e2e/playwright.d.ts` cục bộ | Chưa cài `@playwright/test` vào `node_modules` để tránh tải binary trình duyệt nặng trong bước CI tĩnh; `playwright.config.ts` và `tests/e2e/*.spec.ts` đã viết chuẩn xác và pass `tsc --noEmit` + `eslint` |
| 6 | Ghi nhận nhỏ ở `src/middleware.ts` khi redirect kèm query string | `request.nextUrl.clone()` giữ lại query params cũ bên cạnh `?next=...` (giá trị `next` vẫn chính xác và qua `sanitizeAdminNextPath()`); có thể làm sạch `loginUrl.search = ""` trước khi set `next` ở đợt polish sau |

---

## 4. Kiểm thử

### 4.1 SQL Migrations & Bảo mật Postgres (Embedded PostgreSQL)

```bash
python supabase/tests/validate_migrations.py
# 146/146 checks passed (ALL SQL CHECKS PASSED, exit code 0)
```

Bao phủ: RLS bật trên toàn bộ bảng public, `is_admin()` chặn non-admin và locked admin (`ADMIN_REQUIRED`), anon bị từ chối thực thi `admin_*`, user thường không thấy `admin_audit_logs` và không thể tự sửa `role`/`is_locked`/`is_premium`, quyền riêng tư `photos` (chỉ thấy ảnh gắn `print_orders`), `admin_get_user_detail` không lộ URL ảnh ngăn kéo, kiểm biên `layout_config`, máy trạng thái đơn in 6 bước, ràng buộc `TEMPLATE_IN_USE`/`PLAN_IN_USE`, tính đúng múi giờ `Asia/Ho_Chi_Minh`, và idempotency của `admin_seed.sql`.

### 4.2 Kiểm tra tĩnh, Unit/Integration Tests & Build (`app/web`)

```bash
cd app/web
npm ci --prefer-offline          # exit code 0
npm run typecheck                # tsc --noEmit -> exit code 0
npm run lint                     # next lint -> ✔ No ESLint warnings or errors
npm run test                     # Vitest: 7 test files, 100 tests passed, 0 failed
npm run build                    # next build -> 20 routes + Middleware (109 kB), exit code 0
```

Chi tiết 7 file Vitest (`100` tests):
- `src/components/ui/ui.test.tsx`: `7` tests (formatters, pagination, `sanitizeAdminNextPath`, 12 error mappings, UI components, `public-env` compatibility)
- `tests/unit/auth-guard.test.ts`: `14` tests (`requireAdmin`, `middleware` mock/env/cookie refresh/redirect, `signInAdminAction` & `signOutAdminAction`)
- `tests/unit/users.test.ts`: `16` tests (Zod lock schema, filters, `setUserLockAction` + Auth rollback, UI tooltips & privacy)
- `tests/unit/templates.test.ts`: `21` tests (`layout_config` boundaries, presets, JSON line mapping, SVG editor & mobile crop-fill preview)
- `tests/unit/orders.test.ts`: `17` tests (tất cả 36 cặp `(from, to)` của state machine, Zod, CSV escaping, `buildPrintPackZipBuffer`, `/api/admin/orders/[id]/print-pack` 401/403/400/404/200)
- `tests/unit/membership.test.ts`: `12` tests (GB↔bytes conversion, plan Zod schemas, toggle/edit safeguards)
- `tests/unit/dashboard.test.ts`: `13` tests (preset ngày `Asia/Ho_Chi_Minh`, SVG chart scaling, percentages, error boundary isolation)

### 4.3 Kiểm tra bảo mật & Live HTTP Smoke Tests

- **Quét bundle `.next/static` & `"use client"` (39 files)**: `0` kết quả cho `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `service_role`, `serverSecretsSchema`, `lib/supabase/admin`, `lib/cloudinary/sign-upload`, `createSupabaseAdminClient`, `signCloudinaryUploadParams`.
- **Kiểm tra Server Actions & Route Handlers**: toàn bộ 5 file `"use server"` và `app/api/admin/orders/[id]/print-pack/route.ts` đều gọi `requireAdmin()` (ngoại trừ `signInAdminAction`/`signOutAdminAction` ở trang login vốn kiểm tra `is_admin()` + `is_locked`). `0` occurrences `dangerouslySetInnerHTML`. `0` TailwindCSS packages/directives.
- **Live Next.js Production Server Smoke (`USE_MOCK_ADMIN_DATA=true`, port `3099`)**: tất cả `16/16` route (`/`, `/admin/login`, `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/templates`, `/admin/templates/new`, `/admin/templates/[id]`, `/admin/orders`, `/admin/orders/[id]`, `/admin/orders/[id]/print`, `/admin/membership/plans`, `/admin/membership/plans/new`, `/admin/membership/plans/[id]`, `/admin/membership/subscribers`, `/admin/transactions`) trả về HTTP `200`, `0` error overlay/boundary, đủ 3 header bảo mật (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Live Next.js Auth Guard Smoke (`USE_MOCK_ADMIN_DATA=false`, port `3098`)**: `/admin`, `/admin/users`, `/admin/orders` không có cookie đều trả về HTTP `307` redirect tới `/admin/login?next=...`; `/admin/login` trả HTTP `200`; `/api/admin/orders/.../print-pack` trả HTTP `401`.

---

## 5. Còn lại / ngoài phạm vi

- **Chạy Playwright E2E trên trình duyệt thật & Supabase live (`T-06.H05`, một phần `H01`–`H03`)**: cần cài `@playwright/test` (`npm i -D @playwright/test && npx playwright install`) và trỏ tới Supabase local đã chạy `supabase db reset` + `admin_seed.sql` để chạy `tests/e2e/auth.spec.ts` và `tests/e2e/admin-flows.spec.ts` trên 4 trình duyệt (`chromium`, `firefox`, `webkit`, `msedge`).
- **Benchmark hiệu năng với seed lớn (`T-06.H06`)**: cần đo thời gian phản hồi thực tế ≤ 500ms trên DB có ~5.000 đơn / ~2.000 user (đã có index `T-06.B18` và phân trang server-side).
- **Task phối hợp Mobile (`T-06.X01`, `T-06.X02`)**: xử lý hiển thị thông báo tài khoản bị khóa (`banned`) và xác nhận đọc giá gói hội viên từ bảng `membership_plans` thực hiện trên nhánh `mobile-app_dev`.
- **Trang marketing ngoài phạm vi**: landing page giới thiệu sản phẩm, trang tải app và blog (hiện `/` là trang giới thiệu gọn dẫn sang `/admin/login`).
