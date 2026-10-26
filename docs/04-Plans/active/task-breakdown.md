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
- [x] **T-02.16** – Use case: `UpdateDrawerUseCase` (sửa tên, mô tả, bìa)
- [x] **T-02.17** – Use case: `DeleteDrawerUseCase` (chỉ owner, xóa cascade)
- [x] **T-02.18** – Use case: `UploadPhotosUseCase` (kiểm tra dung lượng + batch upload)
- [x] **T-02.19** – Use case: `GetPhotosUseCase` (load ảnh trong ngăn kéo + pagination)
- [x] **T-02.20** – Use case: `DeletePhotosUseCase` (xóa batch)
- [x] **T-02.21** – Use case: `ShareDrawerUseCase` (gửi lời mời chia sẻ trạng thái pending qua email)
- [x] **T-02.22** – Use case: `RespondShareInvitationUseCase` (người nhận chấp nhận hoặc từ chối lời mời)
- [x] **T-02.23** – Use case: `GetShareInvitationsUseCase` (danh sách lời mời đang chờ phản hồi)
- [x] **T-02.24** – Use case: `RevokeShareUseCase` (thu hồi lời mời/hủy quyền chia sẻ)

## Mobile – Presentation Layer (UI theo Figma)

- [x] **T-02.25** – `DrawerListScreen` + `DrawerViewModel` (danh sách ngăn kéo, badge lời mời pending, phân biệt owned/shared)
- [x] **T-02.26** – `CreateDrawerSheet` (bottom sheet tạo mới)
- [x] **T-02.27** – `DrawerDetailScreen` (xem ngăn kéo + grid ảnh)
- [x] **T-02.28** – `PhotoViewerScreen` (xem full-screen, pinch-to-zoom, swipe)
- [x] **T-02.29** – `ShareDrawerScreen` (quản lý chia sẻ: mời qua email, danh sách chia sẻ và lời mời pending)
- [x] **T-02.30** – `ShareInvitationsSheet` (xem danh sách lời mời nhận được + nút Chấp nhận / Từ chối)
- [x] **T-02.31** – Upload progress UI (progress bar khi upload batch)
- [x] **T-02.32** – Storage indicator (hiển thị dung lượng đã dùng / giới hạn)
- [x] **T-02.33** – Empty state UI (ngăn kéo trống, chưa có ảnh)
- [x] **T-02.34** – Multi-select mode (chọn nhiều ảnh để xóa)
- [x] **T-02.35** – Upsell prompt khi đạt giới hạn ngăn kéo (gợi ý nâng cấp/mua lẻ)

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
> **Trạng thái**: 🔲 Chưa bắt đầu
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-04-gói-hội-viên-membership)

---

## Supabase Setup

- [ ] **T-04.01** – Tạo bảng `membership_plans` + seed data các gói
- [ ] **T-04.02** – Tạo bảng `memberships` + RLS
- [ ] **T-04.03** – Edge Function: kiểm tra membership expiry (cron job hàng ngày)
- [ ] **T-04.04** – Edge Function: cập nhật `max_drawers` khi membership thay đổi

## Mobile – Data Layer

- [ ] **T-04.05** – `MembershipRepository` interface + impl

## Mobile – Domain Layer

- [ ] **T-04.06** – Domain models: `MembershipPlan`, `Membership`, `MembershipStatus`
- [ ] **T-04.07** – Use case: `GetPlansUseCase`
- [ ] **T-04.08** – Use case: `SubscribeUseCase`
- [ ] **T-04.09** – Use case: `GetActiveMembershipUseCase`
- [ ] **T-04.10** – Use case: `PurchaseDrawerUseCase` (mua lẻ ngăn kéo)

## Mobile – Presentation Layer (UI theo Figma)

- [ ] **T-04.11** – `MembershipScreen` + `MembershipViewModel` (so sánh gói, CTA)
- [ ] **T-04.12** – Membership badge UI (hiển thị trạng thái hội viên ở profile)
- [ ] **T-04.13** – Purchase drawer flow (mua lẻ khi đạt giới hạn)

## Testing

- [ ] **T-04.14** – Unit test: quyền lợi membership áp dụng đúng
- [ ] **T-04.15** – Unit test: mua lẻ ngăn kéo + cập nhật giới hạn

---

**Tổng tasks**: 15
**Estimated effort**: 4–5 ngày

---

# Task Breakdown – FR-05: Thanh toán (Payment)

> **Module**: Payment Integration
> **Trạng thái**: 🔲 Chưa bắt đầu
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-05-thanh-toán-payment)

---

## Supabase Setup

- [ ] **T-05.01** – Tạo bảng `transactions` + RLS
- [ ] **T-05.02** – Edge Function: `process-payment` (tạo payment URL → redirect)
- [ ] **T-05.03** – Edge Function: `payment-callback` (webhook nhận kết quả từ gateway)
- [ ] **T-05.04** – Edge Function: cập nhật order/membership status sau thanh toán thành công

## Mobile – Data Layer

- [ ] **T-05.05** – `PaymentRepository` interface + impl
- [ ] **T-05.06** – Deep link handler: nhận callback từ payment app (MoMo, VNPay...)

## Mobile – Domain Layer

- [ ] **T-05.07** – Domain model: `Transaction`, `PaymentMethod`, `TransactionStatus`
- [ ] **T-05.08** – Use case: `InitiatePaymentUseCase` (tạo giao dịch + redirect)
- [ ] **T-05.09** – Use case: `GetTransactionsUseCase` (lịch sử giao dịch)

## Mobile – Presentation Layer

- [ ] **T-05.10** – Payment method selection UI
- [ ] **T-05.11** – Payment result screen (thành công / thất bại)
- [ ] **T-05.12** – `TransactionHistoryScreen` (lịch sử giao dịch)

## Testing

- [ ] **T-05.13** – Integration test: Payment flow end-to-end (sandbox)
- [ ] **T-05.14** – Edge case: payment timeout, double payment

---

**Tổng tasks**: 14
**Estimated effort**: 5–6 ngày

---

# Task Breakdown – FR-06: Quản trị hệ thống (Admin)

> **Module**: Admin Dashboard (Next.js Web)
> **Trạng thái**: 🔲 Chưa bắt đầu
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-06-quản-trị-hệ-thống-admin)

---

## Web – Setup

- [ ] **T-06.01** – Khởi tạo Next.js project (App Router, TypeScript)
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

- [ ] **T-06.13** – Thêm cột `role` vào `profiles` (hoặc bảng riêng `user_roles`)
- [ ] **T-06.14** – RLS policies cho admin access (bypass hoặc role-based)
- [ ] **T-06.15** – Service role key cho admin API calls (server-side only)

## Testing

- [ ] **T-06.16** – Auth guard test: non-admin bị redirect
- [ ] **T-06.17** – CRUD test: template management

---

**Tổng tasks**: 17
**Estimated effort**: 5–7 ngày

---

# Task Breakdown – FR-07: Thông báo (Notifications)

> **Module**: Push Notifications
> **Trạng thái**: 🔲 Chưa bắt đầu
> **Liên kết FR**: [01-fr.md](../../01-BA/SRS/01-fr.md#fr-07-thông-báo-notifications)

---

## Setup

- [ ] **T-07.01** – Tạo Firebase project + enable Cloud Messaging
- [ ] **T-07.02** – Tích hợp FCM SDK vào mobile app
- [ ] **T-07.03** – Lưu FCM device token vào bảng `profiles` (hoặc bảng `device_tokens`)

## Supabase

- [ ] **T-07.04** – Tạo bảng `notifications` (lưu lịch sử thông báo)
- [ ] **T-07.05** – Edge Function: `send-notification` (gọi FCM API)
- [ ] **T-07.06** – Database trigger: gửi notification khi `drawer_shares` INSERT
- [ ] **T-07.07** – Database trigger: gửi notification khi `print_orders` UPDATE status

## Mobile

- [ ] **T-07.08** – FCM service: nhận + hiển thị notification
- [ ] **T-07.09** – Notification handling: tap notification → navigate đến màn hình tương ứng
- [ ] **T-07.10** – `NotificationListScreen` (lịch sử thông báo in-app)

## Testing

- [ ] **T-07.11** – Test: nhận notification khi được share ngăn kéo
- [ ] **T-07.12** – Test: nhận notification khi đơn hàng đổi trạng thái

---

**Tổng tasks**: 12
**Estimated effort**: 3–4 ngày

---

# Tổng hợp toàn bộ

| Module | Tasks | Effort ước tính | Dependencies |
|---|---|---|---|
| FR-01: Auth | 24 | 3–4 ngày | Supabase project setup |
| FR-02: Drawers | 39 | 7–10 ngày | FR-01 |
| FR-03: Photobooth | 25 | 7–9 ngày | FR-02 |
| FR-04: Membership | 15 | 4–5 ngày | FR-01 |
| FR-05: Payment | 14 | 5–6 ngày | FR-03, FR-04 |
| FR-06: Admin | 17 | 5–7 ngày | FR-01, FR-03 |
| FR-07: Notification | 12 | 3–4 ngày | FR-01, FR-02 |
| **Tổng** | **146** | **34–45 ngày** | |

## Thứ tự thực hiện đề xuất

```
Week 1-2:  FR-01 (Auth)
    ↓
Week 2-4:  FR-02 (Drawers) ← Core feature
    ↓
Week 4-5:  FR-04 (Membership) ← Song song với FR-02 cuối
    ↓
Week 5-7:  FR-03 (Photobooth) ← Core feature #2
    ↓
Week 7-8:  FR-05 (Payment)
    ↓
Week 8-10: FR-06 (Admin) + FR-07 (Notification) ← Song song
```
