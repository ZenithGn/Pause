# Task Breakdown – FR-01: Xác thực & Quản lý tài khoản

> **Module**: Authentication & Account
> **Trạng thái**: ✅ Hoàn thành – xem [completed/fr-01-authentication-account.md](../completed/fr-01-authentication-account.md)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-01-xác-thực--quản-lý-tài-khoản-authentication--account)

---

## Supabase Setup

- [x] **T-01.01** – Tạo Supabase project (region: ap-southeast-1)
- [x] **T-01.02** – Cấu hình Auth providers (Email/Password + Google OAuth)
- [x] **T-01.03** – Tạo bảng `profiles` + trigger `handle_new_user()` (ref: db-schema.md)
- [x] **T-01.04** – Bật RLS cho bảng `profiles` + tạo policies
- [x] **T-01.05** – ~~Tạo 3 ngăn kéo mặc định (trống) khi đăng ký~~ → **sửa sau test**: chỉ cấp quota 3 ngăn kéo, ngăn kéo tạo theo nhu cầu (xem file baseline `20251115090000_init_schema.sql`)

## Mobile – Data Layer

- [x] **T-01.06** – Setup Supabase Kotlin SDK trong project
- [x] **T-01.07** – Tạo `AuthRepository` interface (domain layer)
- [x] **T-01.08** – Implement `AuthRepositoryImpl` (data layer) – gọi Supabase Auth API
- [x] **T-01.09** – Tạo `ProfileRepository` interface + impl – CRUD profile

## Mobile – Domain Layer

- [x] **T-01.10** – Tạo domain model: `User`, `UserProfile`
- [x] **T-01.11** – Use case: `SignUpUseCase` (đăng ký email/password)
- [x] **T-01.12** – Use case: `SignInUseCase` (đăng nhập email/password)
- [x] **T-01.13** – Use case: `SignInWithGoogleUseCase`
- [x] **T-01.14** – Use case: `SignOutUseCase`
- [x] **T-01.15** – Use case: `ResetPasswordUseCase`
- [x] **T-01.16** – Use case: `GetProfileUseCase`, `UpdateProfileUseCase`

## Mobile – Presentation Layer (UI theo Figma)

- [x] **T-01.17** – `LoginScreen` + `AuthViewModel` (đăng nhập)
- [x] **T-01.18** – `RegisterScreen` (đăng ký)
- [x] **T-01.19** – `ForgotPasswordScreen` (quên mật khẩu)
- [x] **T-01.20** – `ProfileScreen` + `ProfileViewModel` (xem/sửa hồ sơ)
- [x] **T-01.21** – Navigation: Auth flow (splash → login/register → home)
- [x] **T-01.22** – Xử lý session persistence (auto-login khi có valid token)

## Testing

- [x] **T-01.23** – Unit test: `SignUpUseCase`, `SignInUseCase`
- [x] **T-01.24** – Integration test: Auth flow end-to-end

---

**Tổng tasks**: 24
**Estimated effort**: 3–4 ngày

---

# Task Breakdown – FR-02: Ngăn kéo Kỷ niệm (Memory Drawers)

> **Module**: Memory Drawers
> **Trạng thái**: ✅ Hoàn thành – xem [completed/fr-02-memory-drawers.md](../completed/fr-02-memory-drawers.md)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-02-ngăn-kéo-kỷ-niệm-memory-drawers)

---

## Supabase Setup

- [x] **T-02.01** – Tạo bảng `drawers` + RLS policies (ref: db-schema.md)
- [x] **T-02.02** – Tạo bảng `photos` + RLS policies
- [x] **T-02.03** – Tạo bảng `drawer_shares` (status: pending, accepted, rejected) + RLS policies
- [x] **T-02.04** – Tạo Storage bucket `photos` (private) + `thumbnails` (private)
- [x] **T-02.05** – Tạo Edge Function: `create-thumbnail` (trigger on upload → resize → save thumbnail)
- [x] **T-02.06** – Tạo indexes (ref: db-schema.md – Indexes tổng hợp)

## Mobile – Data Layer

- [x] **T-02.07** – `DrawerRepository` interface + `DrawerRepositoryImpl`
- [x] **T-02.08** – `PhotoRepository` interface + `PhotoRepositoryImpl`
- [x] **T-02.09** – `ShareRepository` interface + `ShareRepositoryImpl` (gửi lời mời, phản hồi accepted/rejected, thu hồi)
- [x] **T-02.10** – Room DB: `DrawerEntity`, `PhotoEntity`, `ShareEntity` (offline cache)
- [x] **T-02.11** – Upload service: batch upload ảnh + progress tracking
- [x] **T-02.12** – Signed URL helper: lấy URL tạm cho ảnh private

## Mobile – Domain Layer

- [x] **T-02.13** – Domain models: `Drawer`, `Photo`, `DrawerShare`, `SharePermission`, `ShareStatus`
- [x] **T-02.14** – Use case: `GetDrawersUseCase` (list ngăn kéo owned + shared đã accepted)
- [x] **T-02.15** – Use case: `CreateDrawerUseCase` (kiểm tra giới hạn trước khi tạo)
- [x] **T-02.16** – Use case: `UpdateDrawerUseCase` (sửa tên, mô tả, set ảnh bìa / thumbnail ngăn kéo)
- [x] **T-02.17** – Use case: `DeleteDrawerUseCase` (chỉ owner, xóa cascade)
- [x] **T-02.18** – Use case: `UploadPhotosUseCase` (kiểm tra giới hạn tối đa 50 ảnh/ngăn kéo + batch upload)
- [x] **T-02.19** – Use case: `GetPhotosUseCase` (load ảnh trong ngăn kéo + pagination)
- [x] **T-02.20** – Use case: `DeletePhotosUseCase` (xóa batch)
- [x] **T-02.21** – Use case: `ShareDrawerUseCase` (gửi lời mời chia sẻ trạng thái pending qua email)
- [x] **T-02.22** – Use case: `RespondShareInvitationUseCase` (người nhận chấp nhận hoặc từ chối lời mời)
- [x] **T-02.23** – Use case: `GetShareInvitationsUseCase` (danh sách lời mời đang chờ phản hồi)
- [x] **T-02.24** – Use case: `RevokeShareUseCase` (thu hồi lời mời/hủy quyền chia sẻ)

## Mobile – Presentation Layer (UI theo Figma)

- [x] **T-02.25** – `DrawerListScreen` + `DrawerViewModel` (danh sách ngăn kéo, badge lời mời pending, phân biệt owned/shared, hiển thị ngăn kéo được share ngoài Home)
- [x] **T-02.26** – `CreateDrawerSheet` (bottom sheet tạo mới)
- [x] **T-02.27** – `DrawerDetailScreen` (xem ngăn kéo + grid ảnh + huy hiệu ảnh bìa + đặt làm ảnh bìa)
- [x] **T-02.28** – `PhotoViewerScreen` (xem full-screen, pinch-to-zoom, swipe, nút "Đặt làm ảnh bìa")
- [x] **T-02.29** – `ShareDrawerScreen` (quản lý chia sẻ: mời qua email, danh sách chia sẻ và lời mời pending)
- [x] **T-02.30** – `ShareInvitationsSheet` (xem danh sách lời mời nhận được + nút Chấp nhận / Từ chối)
- [x] **T-02.31** – Upload progress UI (progress bar khi upload batch)
- [x] **T-02.32** – Storage indicator (hiển thị số lượng ảnh / 50 ảnh, bỏ chữ Supabase Sync)
- [x] **T-02.33** – Empty state UI (ngăn kéo trống, chưa có ảnh)
- [x] **T-02.34** – Multi-select mode (chọn nhiều ảnh để xóa hoặc đặt làm ảnh bìa khi chọn 1 ảnh)
- [x] **T-02.35** – Upsell prompt khi đạt giới hạn ngăn kéo (gợi ý nâng cấp gói hội viên)

## Testing

- [x] **T-02.36** – Unit test: `CreateDrawerUseCase` (kiểm tra giới hạn)
- [x] **T-02.37** – Unit test: `UploadPhotosUseCase` (kiểm tra dung lượng)
- [x] **T-02.38** – Unit test: `ShareDrawerUseCase`, `RespondShareInvitationUseCase` (lời mời, quyền hạn)
- [x] **T-02.39** – Integration test: Upload → thumbnail generation → display

---

**Tổng tasks**: 39
**Estimated effort**: 7–10 ngày

---

# Task Breakdown – FR-03: In ảnh Photobooth

> **Module**: Photobooth Print-on-Demand
> **Trạng thái**: ✅ Hoàn thành – xem [completed/fr-03-photobooth.md](../completed/fr-03-photobooth.md)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-03-in-ảnh-photobooth-photobooth-print-on-demand)

---

## Supabase Setup

- [x] **T-03.01** – Tạo bảng `photobooth_templates` (ref: db-schema.md)
- [x] **T-03.02** – Tạo bảng `photobooth_items` + `photobooth_photos`
- [x] **T-03.03** – Tạo bảng `print_orders`
- [x] **T-03.04** – Tạo Storage bucket `templates` (public) + `photobooth-previews` (private)
- [x] **T-03.05** – Seed data: upload 5–10 template mẫu ban đầu
- [x] **T-03.06** – RLS policies cho tất cả bảng photobooth

## Mobile – Data Layer

- [x] **T-03.07** – `TemplateRepository` interface + impl
- [x] **T-03.08** – `PhotoboothRepository` interface + impl
- [x] **T-03.09** – `OrderRepository` interface + impl

## Mobile – Domain Layer

- [x] **T-03.10** – Domain models: `PhotoboothTemplate`, `PhotoboothItem`, `PrintOrder`, `OrderStatus`
- [x] **T-03.11** – Use case: `GetTemplatesUseCase` (list + filter by category/premium)
- [x] **T-03.12** – Use case: `CreatePhotoboothUseCase` (chọn template + fill ảnh)
- [x] **T-03.13** – Use case: `CreateOrderUseCase` (đặt in + validate)
- [x] **T-03.14** – Use case: `GetOrdersUseCase` (lịch sử đơn hàng)

## Mobile – Presentation Layer (UI theo Figma)

- [x] **T-03.15** – `TemplateListScreen` + `PhotoboothViewModel` (grid template, filter)
- [x] **T-03.16** – `PhotoboothBuilderScreen` (hiển thị template + fill ảnh vào slot)
- [x] **T-03.17** – Photobooth canvas renderer (render template + ảnh → preview image)
- [x] **T-03.18** – Photo picker từ ngăn kéo (chọn ảnh để fill vào slot)
- [x] **T-03.19** – `PhotoboothPreviewScreen` (xem kết quả cuối cùng)
- [x] **T-03.20** – `OrderFormScreen` (nhập số lượng, địa chỉ, SĐT)
- [x] **T-03.21** – `OrderListScreen` + `OrderDetailScreen` (theo dõi đơn)
- [x] **T-03.22** – Order status timeline UI (hiển thị trạng thái từng bước)

## Testing

- [x] **T-03.23** – Unit test: `CreatePhotoboothUseCase`
- [x] **T-03.24** – Unit test: `CreateOrderUseCase`
- [x] **T-03.25** – Visual test: Template render trên nhiều kích thước màn hình

---

**Ghi chú triển khai**: `TemplateRepository` được gộp vào `PhotoboothRepository`
(`getActiveTemplates` / `getTemplate`) để tránh 2 repository cùng truy vấn 1 bảng.
Photo picker tái sử dụng `PhotoRepository` + `DrawerRepository` của FR-02.

**Tổng tasks**: 25
**Estimated effort**: 7–9 ngày

---

# Task Breakdown – FR-04: Gói Hội viên (Membership)

> **Module**: Membership & Subscription
> **Trạng thái**: 🟡 Đang hoàn thiện (Đã hiện thực UI 3 gói Go, Plus, Premium + Mở khóa VIP Templates + VietQR Flow & Supabase RPC)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-04-gói-hội-viên-membership)

---

## Supabase Setup

- [x] **T-04.01** – Tạo schema/RPC gói hội viên (RPC `subscribe_membership` trong `supabase/seed/upgrade_fr03.sql`)
- [x] **T-04.02** – Cập nhật quota và quyền hạn hội viên khi kích hoạt gói
- [ ] **T-04.03** – Edge Function / Cron: kiểm tra membership expiry (hết hạn định kỳ nếu cần tự động hạ cấp)
- [x] **T-04.04** – Tự động cập nhật `max_drawers` và mở khóa VIP templates khi kích hoạt gói qua RPC & local cache

## Mobile – Data Layer

- [x] **T-04.05** – Tích hợp logic Membership vào `ProfileRepository` + `ProfileRepositoryImpl` (`upgradeMembership`, đồng bộ quota với Supabase & cache)

## Mobile – Domain Layer

- [x] **T-04.06** – Domain models liên quan đến hạn mức & gói: `UserProfile` (`maxDrawers`, `isPremium`), `MembershipPlan`
- [x] **T-04.07** – Quản lý thông tin 3 gói hội viên năm theo yêu cầu:
  - **PAUSE Go** (5GB/năm – 30.000 VNĐ/năm, 10 tủ, mở khóa VIP Templates)
  - **PAUSE Plus** (10GB/năm – 55.000 VNĐ/năm, 25 tủ, mở khóa VIP Templates, khuyên dùng)
  - **PAUSE Premium** (20GB/năm – 100.000 VNĐ/năm, 50 tủ, mở khóa VIP Templates & ưu đãi in)
- [x] **T-04.08** – Luồng kích hoạt gói theo năm và cập nhật trạng thái hội viên
- [x] **T-04.09** – Kiểm tra hạn mức và trạng thái hội viên hiện tại qua `ProfileRepository`
- [x] **T-04.10** – Bỏ hoàn toàn cơ chế mua lẻ ngăn kéo, tập trung 100% vào các gói hội viên năm

## Mobile – Presentation Layer (UI theo Figma)

- [x] **T-04.11** – `UpgradeScreen` (hiển thị 3 gói PAUSE Go, Plus, Premium; bảng so sánh chi tiết quyền lợi; CTA thanh toán)
- [x] **T-04.12** – Hiển thị trạng thái hội viên & badge VIP trên `ProfileScreen`, `HomeScreen`
- [x] **T-04.13** – Mở khóa toàn bộ VIP Templates (`is_premium = true`) cho tất cả user thuộc gói nâng cấp

## Testing

- [x] **T-04.14** – Unit & manual test: quyền lợi quota áp dụng đúng khi nâng cấp
- [x] **T-04.15** – Test chọn gói, sinh mã VietQR thanh toán và kích hoạt gói hội viên

---

**Ghi chú hiện thực**:
- Đã hoàn thiện giao diện `UpgradeScreen.kt` theo đúng bảng giá: Go (30k/năm), Plus (55k/năm), Premium (100k/năm).
- Toàn bộ gói nâng cấp đều có quyền sử dụng kho mẫu VIP Templates.
- Đã loại bỏ hoàn toàn tính năng mua lẻ ngăn kéo (29k).
- Còn lại: Setup cron job / Edge function tự động hạ cấp khi hết hạn sau 1 năm.

---

# Task Breakdown – FR-05: Thanh toán (Payment)

> **Module**: Payment Integration (VietQR & PayOS App-to-App Open Banking)
> **Trạng thái**: 🟢 Hoàn thành 100% (Full App-to-App Launch, Edge Function Webhook, Lifecycle Auto-detection, Auto-navigation & Sandbox Mode)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-05-thanh-toán-payment)

---

## Supabase Setup

- [x] **T-05.01** – Migration `20261112000000_payos_payment.sql`: Thêm `order_code` (BIGINT UNIQUE), cập nhật 3 gói Hội viên (PAUSE Go, Plus, Premium)
- [x] **T-05.02** – RPC `create_payment_checkout`: Tạo giao dịch pending, sinh mã `order_code` và lưu metadata
- [x] **T-05.03** – Edge Function: `payos-webhook` nhận thông báo thanh toán tức thời từ PayOS / VietQR
- [x] **T-05.04** – RPC `complete_payment_transaction`: Idempotent handler đối soát tự động, kích hoạt gói hội viên / cập nhật đơn in `processing` và push in-app notification

## Mobile – Data Layer

- [x] **T-05.05** – `PaymentRepository` & `PaymentRepositoryImpl`: Quản lý checkout, gọi RPC Supabase và tạo liên kết VietQR chuẩn NAPAS
- [x] **T-05.06** – Deep link handler: Thêm `pause://payment-callback` trong `AndroidManifest.xml` và tích hợp app URI schemes ngân hàng

## Mobile – Domain Layer

- [x] **T-05.07** – Model dữ liệu thanh toán: `PaymentStatus` (PENDING, SUCCESS, FAILED, CANCELLED), `PaymentCheckoutInfo`
- [x] **T-05.08** – Luồng tự động đối soát: Background polling mỗi 2.5s, nhận diện trạng thái khi quay lại app (Lifecycle `ON_RESUME`), zero-click auto navigation khi thành công
- [x] **T-05.09** – Theo dõi và hiển thị chi tiết số tiền, phí ship, phụ phí giấy/bìa trên đơn hàng và gói hội viên

## Mobile – Presentation Layer

- [x] **T-05.10** – `PaymentViewModel`: Quản lý state checkout, đếm ngược thời gian, kiểm tra trạng thái tức thì và kích hoạt sandbox simulation
- [x] **T-05.11** – Màn hình mã QR thanh toán `PaymentQrScreen`:
  - Nút **"Mở App Ngân hàng thanh toán"** (App-to-App intent mở trực tiếp ứng dụng ngân hàng)
  - Thẻ mã VietQR Pro (kèm fallback Canvas QR Matrix)
  - Thẻ thông tin tài khoản MB Bank + Sao chép STK/Nội dung chuyển khoản
  - Trạng thái chờ đối soát tự động (pulsing status)
  - Nút **"⚡ Mô phỏng thanh toán thành công (Sandbox Test)"** dành cho kiểm thử demo
- [x] **T-05.12** – Màn hình kết quả / xử lý lỗi `PaymentFailedScreen` (thông báo lỗi, cho phép thử lại hoặc đổi phương thức)

## Testing

- [x] **T-05.13** – Test luồng thanh toán App-to-App, polling tự động và kích hoạt gói hội viên / đơn in
- [x] **T-05.14** – Test chế độ Sandbox Simulation và xử lý hủy bỏ / hết hạn giao dịch

---

**Ghi chú hiện thực**:
- Đã triển khai hoàn chỉnh luồng **PayOS / VietQR App-to-App**: Người dùng có thể nhấn nút để mở ngay app ngân hàng trên máy (MB, VCB, Momo...). Khi chuyển khoản xong và quay lại Pause, app tự động bắt sự kiện `ON_RESUME` và nhận diện giao dịch thành công để tự động chuyển tiếp mà không cần bấm thủ công.
- Tích hợp sẵn nút **Sandbox Simulation** để ban giám khảo / giáo viên có thể kiểm thử toàn bộ luồng thanh toán và nâng cấp gói / duyệt đơn in mà không cần nạp tiền thật.

---

# Task Breakdown – FR-06: Quản trị hệ thống (Admin)

> **Module**: Admin Dashboard (Next.js Web)
> **Trạng thái**: 🔲 Chưa bắt đầu (Thư mục `app/web` đã được khởi tạo sẵn trong cấu trúc dự án)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-06-quản-trị-hệ-thống-admin)

---

## Web – Setup

- [ ] **T-06.01** – Khởi tạo Next.js project (App Router, TypeScript) trong `app/web`
- [ ] **T-06.02** – Setup Supabase JS SDK + auth config
- [ ] **T-06.03** – Admin layout: sidebar navigation, header, auth guard
- [ ] **T-06.04** – Admin role check middleware (chỉ user có role admin mới vào được)

## Web – Pages

- [ ] **T-06.05** – Admin Login page
- [ ] **T-06.06** – Dashboard page (thống kê: tổng user, đơn hàng, doanh thu)
- [ ] **T-06.07** – Users management page (list, search, view, lock/unlock)
- [ ] **T-06.08** – Templates management page (CRUD, upload preview, cấu hình layout_config)
- [ ] **T-06.09** – Orders management page (list, filter by status, update status)
- [ ] **T-06.10** – Order detail page (xem chi tiết + ảnh photobooth + thông tin giao hàng)
- [ ] **T-06.11** – Membership plans management page (CRUD gói)
- [ ] **T-06.12** – Membership subscribers list (xem user đang subscribe)

## Supabase

- [x] **T-06.13** – Đã có phân quyền `role` và admin check trong baseline SQL (`public.profiles.role = 'admin'`)
- [x] **T-06.14** – RLS policies cho admin access trên `print_orders` và `photobooth_templates`
- [ ] **T-06.15** – Service role key cho admin API calls (server-side only)

## Testing

- [ ] **T-06.16** – Auth guard test: non-admin bị redirect
- [ ] **T-06.17** – CRUD test: template management

---

**Tổng tasks**: 17
**Estimated effort**: 5–7 ngày

---

# Task Breakdown – FR-07: Thông báo (Notifications)

> **Module**: Push Notifications & In-app Notifications
> **Trạng thái**: 🟡 Đang hoàn thiện (Đã hoàn thành In-App Notification System, Repository, ViewModel, UI & Database RPC)
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-07-thông-báo-notifications)

---

## Setup

- [ ] **T-07.01** – Tạo Firebase project + enable Cloud Messaging (FCM)
- [ ] **T-07.02** – Tích hợp FCM SDK vào Android app (google-services.json & service worker)
- [ ] **T-07.03** – Lưu FCM device token vào bảng `profiles` (hoặc bảng `device_tokens`)

## Supabase

- [x] **T-07.04** – Bảng `notifications` đã được tích hợp trong DB (`user_id`, `type`, `title`, `body`, `is_read`, `created_at`)
- [ ] **T-07.05** – Edge Function: `send-notification` (gọi FCM push notification API)
- [x] **T-07.06** – Database RPC / Trigger: tạo thông báo tự động khi thay đổi trạng thái gói hội viên hoặc đơn hàng (`create_user_notification` trong `upgrade_fr03.sql`)
- [ ] **T-07.07** – Database trigger: tự động bắn FCM khi có thông báo mới

## Mobile

- [ ] **T-07.08** – FCM service: nhận & push background push notification lên thanh thông báo hệ thống
- [x] **T-07.09** – Notification handling: điều hướng khi click vào thông báo trong ứng dụng
- [x] **T-07.10** – Màn hình danh sách thông báo `NotificationListScreen` (lọc Tất cả / Chưa đọc, đánh dấu đã đọc, xem chi tiết)

## Testing

- [x] **T-07.11** – Test in-app notification: nhận thông báo khi kích hoạt gói hội viên và tạo đơn hàng
- [ ] **T-07.12** – Test push notification qua FCM khi app đang chạy ngầm hoặc tắt hẳn

---

**Ghi chú hiện thực**:
- Đã hoàn thành toàn bộ hệ thống thông báo nội bộ (In-app notification system): bảng dữ liệu Supabase, RPC `create_user_notification`, `NotificationRepositoryImpl`, `NotificationViewModel`, `NotificationListScreen`, và chuông thông báo trên `HomeScreen`.
- Phần push notification qua FCM sẽ được tích hợp khi cấu hình Firebase Credentials (`google-services.json`).

---

# Tổng hợp toàn bộ

| Module | Tasks | Tiến độ | Trạng thái |
|---|---|---|---|
| FR-01: Auth | 24 | 24/24 | ✅ Hoàn thành |
| FR-02: Drawers | 39 | 39/39 | ✅ Hoàn thành |
| FR-03: Photobooth | 25 | 25/25 | ✅ Hoàn thành |
| FR-04: Membership | 15 | 13/15 | 🟡 Core Flow & UI hoàn thành (thiếu cron expiry) |
| FR-05: Payment | 14 | 10/14 | 🟡 VietQR Flow & UI hoàn thành (thiếu payment gateway online webhook) |
| FR-06: Admin | 17 | 2/17 | 🔲 Chưa bắt đầu UI Web (DB Schema đã có) |
| FR-07: Notification | 12 | 6/12 | 🟡 In-App System hoàn thành (thiếu FCM push setup) |
| **Tổng** | **146** | **119/146 (81.5%)** | |

## Thứ tự thực hiện tiếp theo đề xuất

```
ĐÃ HOÀN THÀNH:
FR-01 (Auth)  -->  FR-02 (Drawers)  -->  FR-03 (Photobooth)  -->  FR-04/05/07 (Mobile Core & VietQR & In-App UI)
                                                                          ↓
TIẾP TỤC TRIỂN KHAI:
1. FR-06 (Admin Dashboard Web App - Next.js)
2. Cấu hình FCM Push Notification & Webhook thanh toán tự động (nếu cần)
```
