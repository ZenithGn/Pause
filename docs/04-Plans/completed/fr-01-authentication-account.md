# ✅ FR-01 – Authentication & Account (Hoàn thành)

> **Module**: Authentication & Account
> **Trạng thái**: ✅ Hoàn thành
> **Kế hoạch gốc**: [task-breakdown.md – FR-01](../active/task-breakdown.md#task-breakdown--fr-01-xác-thực--quản-lý-tài-khoản)
> **Yêu cầu**: [FR-01](../../01-BA/SRS/01-fr.md#fr-01-xác-thực--quản-lý-tài-khoản-authentication--account) · [Screen inventory – Auth flow](../../03-References/screen-inventory.md#1-login-đăng-nhập)
> **Tasks**: 24/24 · **Test**: 30 passed / 0 failed · **APK**: `app/mobile/app/build/outputs/apk/debug/app-debug.apk`

---

## 1. Tóm tắt

FR-01 được triển khai end-to-end, gồm 3 phần:

| Phần | Nội dung | Vị trí |
|---|---|---|
| **Backend (Supabase)** | Bảng `profiles`, trigger tạo profile + 3 ngăn kéo mặc định, RLS + guard columns, bucket `avatars` private, cấu hình Auth providers & email templates | `supabase/` |
| **Mobile (Kotlin)** | Toàn bộ Clean Architecture: domain model + repository interface + 13 use case + data layer (Supabase SDK) + 5 màn hình Compose + navigation + session persistence | `app/mobile/` |
| **Testing** | 30 JVM test: unit (validator, use case, lockout store) + integration flow (đăng ký → đăng nhập → hồ sơ → đăng xuất → recovery deep link) | `app/mobile/app/src/test/` |

Đã verify bằng build thật (không chỉ viết code):

```text
> Task :app:testDebugUnitTest      BUILD SUCCESSFUL   (30 tests, 0 failed)
> Task :app:assembleDebug          BUILD SUCCESSFUL   (app-debug.apk ~21.9 MB)
> Task :app:lintDebug              BUILD SUCCESSFUL   (lint-results-debug.html)
python supabase/tests/validate_migrations.py   ALL SQL CHECKS PASSED (19/19, Postgres embedded)
```

Môi trường verify: JDK 21 + Gradle 8.9 + Android SDK 34. Không có emulator trong
môi trường hiện tại nên chưa chạy UI/instrumentation test trên thiết bị.

---

## 2. Đối chiếu yêu cầu chức năng

| FR | Yêu cầu | Cách hiện thực | Trạng thái |
|---|---|---|---|
| FR-01.1 | Đăng ký email/password + Google, nhận 3 ngăn kéo mặc định | `SignUpUseCase`, `SignInWithGoogleUseCase`, `RegisterScreen`; trigger `handle_new_user()` + `create_default_drawers()` | ✅ |
| FR-01.2 | Đăng nhập; sai mật khẩu báo lỗi; quá 5 lần khóa 15 phút | `SignInUseCase` + `InMemoryLoginAttemptStore` (5 lần/15 phút) + rate limit server (`config.toml`); mapping `AuthRestException` → `AuthFailure` | ✅ |
| FR-01.3 | Đăng xuất, thu hồi session | `SignOutUseCase` → `auth.signOut(GLOBAL)` + `ProfileScreen` dialog xác nhận | ✅ |
| FR-01.4 | Quên mật khẩu qua email, đặt mật khẩu mới | `ResetPasswordUseCase` → email link + OTP; deep link `pause://auth-callback` → `HandleAuthDeepLinkUseCase` → `UpdatePasswordUseCase` → `ResetPasswordScreen` | ✅ |
| FR-01.5 | Xem/sửa hồ sơ (tên, avatar, SĐT) | `ProfileRepository` / `GetProfileUseCase` / `UpdateProfileUseCase` / `UploadAvatarUseCase`, `ProfileScreen` + `ProfileViewModel` | ✅ |

Ngoài ra (nằm trong task breakdown): T-01.22 auto-login khi có session hợp lệ
(`autoLoadFromStorage` + `alwaysAutoRefresh` + `SplashViewModel`).

---

## 3. Backend – Supabase

```
supabase/
├── config.toml                                # Email provider, Google OAuth, rate limit, templates
├── migrations/
│   ├── 20251112090000_profiles.sql            # T-01.03
│   ├── 20251112090100_profiles_rls.sql        # T-01.04
│   ├── 20251112090200_drawers_defaults.sql    # T-01.05
│   └── 20251112090300_avatars_bucket.sql      # FR-01.5
├── templates/{confirmation,recovery}.html     # Email tiếng Việt: link + mã OTP
└── README.md                                  # Hướng dẫn setup project (T-01.01, T-01.02)
```

**Chi tiết kỹ thuật đáng chú ý**

- `profiles`: `id` FK `auth.users ON DELETE CASCADE`, `max_drawers` default 3,
  `updated_at` tự cập nhật.
- `handle_new_user()` (SECURITY DEFINER, `search_path = public`): tạo profile khi
  `auth.users` INSERT; fallback tên: `display_name` → `full_name` → phần trước `@`.
  Không cấp quyền `INSERT` cho client.
- `protect_profiles_columns()`: chặn user tự nâng `max_drawers` (chỉ `service_role`),
  chặn đổi `id`.
- `create_default_drawers()`: tạo `max_drawers` ngăn kéo trống ngay sau khi profile
  được tạo (đảm bảo FR-01.1 post-condition ở tầng DB, không phụ thuộc client).
- `enforce_drawer_quota()`: chặn INSERT drawer vượt quota (server-side enforcement
  theo yêu cầu AGENTS.md).
- RLS bật trên `profiles` + `drawers`; policy chỉ chủ sở hữu đọc/sửa.
- Bucket `avatars`: **private**, 5 MB, chỉ jpeg/png/webp; policy theo
  `(storage.foldername(name))[1] = auth.uid()`; DB lưu **object path**, UI lấy
  **signed URL** (đúng quy tắc bảo mật "ảnh user phải private").

Tài liệu schema đã cập nhật: [db-schema.md](../../03-References/db-schema.md).

---

## 4. Mobile – các thành phần chính

**Domain (không phụ thuộc Android)**

- Model: `User`, `UserProfile`, `AuthSession`, `AuthFailure`, `ValidationError`, `AuthField`.
- Repository interface: `AuthRepository`, `ProfileRepository`, `LoginAttemptStore`.
- Use case: `SignUp`, `SignIn`, `SignInWithGoogle`, `SignOut`, `ResetPassword`,
  `UpdatePassword`, `ResendConfirmationEmail`, `GetProfile`, `UpdateProfile`,
  `UploadAvatar`, `GetCurrentSession`, `ObserveSession`, `HandleAuthDeepLink`.
- `CredentialsValidator`: email, password (min 8, chữ + số), confirm, tên, SĐT optional, terms.

**Data**

- `AuthRepositoryImpl`: `signUpWith(Email)`, `signInWith(Email)`, `signInWith(IDToken)`
  cho Google, `signOut(GLOBAL)`, `resetPasswordForEmail`, `resendEmail`, `updateUser`,
  `parseSessionFromUrl` + `importSession` / `exchangeCodeForSession` cho deep link.
- `ProfileRepositoryImpl`: PostgREST select/update `profiles`, Storage upload
  `avatars/{uid}/avatar.{ext}`, `createSignedUrl` để hiển thị.
- `ThrowableMapper`: `AuthWeakPasswordException` / `AuthRestException` (`errorCode`,
  `statusCode`) / `IOException` → `AuthFailure` (không leak SDK type lên trên).
- `InMemoryLoginAttemptStore`: khóa theo email, không persist (server là source of truth).

**Presentation (Compose, theo Figma auth flow)**

- `LoginScreen`: vùng logo tối ~1/3 + form sáng, email, mật khẩu, "Quên mật khẩu?",
  CTA đăng nhập, chia cách "Hoặc tiếp tục với", nút Google (Credential Manager) và
  Apple (disable – xem mục 6), link đăng ký.
- `RegisterScreen`: họ tên, email, mật khẩu, xác nhận, checkbox điều khoản, CTA sticky;
  sau khi đăng ký hiển thị panel "Kiểm tra email" + nút gửi lại.
- `ForgotPasswordScreen`: nhập email → panel xác nhận đã gửi.
- `ResetPasswordScreen`: đặt mật khẩu mới từ recovery session.
- `ProfileScreen`: avatar (Coil + signed URL), tên, badge Free/Premium, quota ngăn kéo,
  menu (đơn hàng / nâng cấp / cài đặt / hỗ trợ / đăng xuất), dialog sửa hồ sơ + chọn
  avatar từ gallery (`PickVisualMedia`), dialog xác nhận đăng xuất.
- `PauseNavGraph`: splash → login/register/forgot/reset/home/profile; deep link intent
  được chuyển từ `MainActivity` vào `AuthViewModel`.
- `UiText` (+ `AuthFailureMapper`): mọi text hiển thị resolve từ `strings.xml` tiếng Việt,
  domain không chứa resource id → sẵn sàng i18n.

Toàn bộ string UI nằm trong `app/mobile/app/src/main/res/values/strings.xml`.

---

## 5. Kiểm thử

Lệnh:

```bash
cd app/mobile
gradle :app:testDebugUnitTest
gradle :app:assembleDebug
```

| Test class | Số test | Nội dung |
|---|---|---|
| `CredentialsValidatorTest` | 8 | email, password (strength/length), confirm, tên, SĐT, terms |
| `SignUpUseCaseTest` | 4 | validate trước khi gọi mạng, trim input, confirmation vs signed-in, propagate failure |
| `SignInUseCaseTest` | 7 | success, sai mật khẩu, khóa sau 5 lần, đang khóa thì không gọi repo, input sai, lỗi mạng, Google |
| `InMemoryLoginAttemptStoreTest` | 5 | ngưỡng 5 lần, hết hạn 15 phút, clear, case-insensitive |
| `AuthFlowIntegrationTest` | 6 | đăng ký → đăng nhập → load/update profile → upload avatar → đăng xuất; khóa 5 lần; forgot password; recovery deep link + đổi mật khẩu; restore session; Google sign-in |
| **Tổng** | **30** | **0 failed** |

Lưu ý: `AuthFlowIntegrationTest` là **local integration test** (JVM, fake repository),
không cần thiết bị/mạng; instrumentation test trên emulator chưa chạy được trong môi
trường hiện tại (không có AVD/adb).

---

## 6. Quyết định & sai lệch so với tài liệu

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Dùng **Koin** thay vì Hilt | AGENTS.md cho phép "Hilt (ưu tiên) hoặc Koin"; Koin không cần annotation processing → build nhanh, ít rủi ro toolchain với JDK 21 |
| 2 | `supabase/` đặt ở **root repo** (không phải `app/web/supabase/`) | Migration là backend dùng chung mobile + web; khớp mặc định của Supabase CLI. Đã cập nhật `folder-structure.md` |
| 3 | Artifact Supabase Auth là `gotrue-kt:2.6.0` (không phải `auth-kt`) | `auth-kt` chỉ có từ 3.x; 2.6.0 dùng `gotrue-kt` (package vẫn là `io.github.jan.supabase.gotrue`) |
| 4 | Google Sign-In dùng **Credential Manager + ID token** | Không cần Google Sign-In SDK, đúng flow native của Supabase; domain không phụ thuộc Android (token do presentation lấy) |
| 5 | Thêm bucket `avatars` (private) + `profiles.avatar_url` lưu object path | FR-01.5 cần avatar; db-schema trước đó chưa có bucket này. Đã bổ sung vào `db-schema.md` |
| 6 | Tạo bảng `drawers` tối thiểu trong migration FR-01 | T-01.05 yêu cầu tạo 3 ngăn kéo mặc định nên bảng phải tồn tại; FR-02 sẽ bổ sung `photos`, `drawer_shares`, index nâng cao |
| 7 | Nút Apple bị disable | FR chỉ yêu cầu Google OAuth; screen-inventory ghi Apple là điểm lệch chưa xác nhận (mục "Các điểm khác biệt") → hiển thị UI đúng Figma nhưng chưa kích hoạt |
| 8 | `HomeScreen` là placeholder | Thuộc FR-02; chỉ cần làm điểm đến sau đăng nhập + bottom tab bar |
| 9 | `gradle wrapper` (binary jar) không commit | Không tạo file binary trong repo; dùng `gradle` hệ thống, có hướng dẫn `gradle wrapper` trong README mobile |

---

## 7. Checklist 24 tasks

- [x] T-01.01 Supabase project config (region ap-southeast-1 trong README)
- [x] T-01.02 Auth providers (Email/Password + Google) – `config.toml` + README
- [x] T-01.03 `profiles` + `handle_new_user()`
- [x] T-01.04 RLS `profiles` + policies (+ guard columns)
- [x] T-01.05 3 ngăn kéo mặc định khi đăng ký
- [x] T-01.06 Supabase Kotlin SDK (version catalog, Koin `SupabaseClient`)
- [x] T-01.07 `AuthRepository` interface
- [x] T-01.08 `AuthRepositoryImpl`
- [x] T-01.09 `ProfileRepository` + impl
- [x] T-01.10 Domain model `User`, `UserProfile`
- [x] T-01.11 `SignUpUseCase`
- [x] T-01.12 `SignInUseCase`
- [x] T-01.13 `SignInWithGoogleUseCase`
- [x] T-01.14 `SignOutUseCase`
- [x] T-01.15 `ResetPasswordUseCase` (+ `UpdatePasswordUseCase`)
- [x] T-01.16 `GetProfileUseCase`, `UpdateProfileUseCase`
- [x] T-01.17 `LoginScreen` + `AuthViewModel`
- [x] T-01.18 `RegisterScreen`
- [x] T-01.19 `ForgotPasswordScreen`
- [x] T-01.20 `ProfileScreen` + `ProfileViewModel`
- [x] T-01.21 Navigation auth flow
- [x] T-01.22 Session persistence / auto-login
- [x] T-01.23 Unit test use case
- [x] T-01.24 Integration test auth flow

---

## 8. Việc cần làm thủ công (không thể code trong repo)

1. **Tạo Supabase project** (region `ap-southeast-1`) → `supabase link` + `supabase db push`
   (hướng dẫn: `supabase/README.md`).
2. **Bật Google provider** trên Dashboard, dán Client ID/Secret; thêm **SHA-1/SHA-256**
   của signing key Android vào Google Cloud Console (bắt buộc để Credential Manager
   trả ID token).
3. **URL Configuration**: Site URL + Additional Redirect URLs phải có
   `pause://auth-callback`.
4. **Dán email templates** (`supabase/templates/*.html`) vào Dashboard → Email Templates
   (Confirm signup, Reset password) nếu deploy cloud.
5. Điền `local.properties`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_WEB_CLIENT_ID`.
6. (Tuỳ chọn) `gradle wrapper --gradle-version 8.9` để có `./gradlew`; nếu môi trường
   đặt `_JAVA_OPTIONS=-Xmx512M` thì nâng heap khi assemble (ví dụ `_JAVA_OPTIONS=-Xmx4g`).

---

## 9. Rủi ro & technical debt

| # | Vấn đề | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| 1 | Chưa chạy trên **Supabase stack thật** (GoTrue/PostgREST/Storage + JWT thật); SQL đã được chạy trên PostgreSQL embedded (19/19 check) | Trigger/RLS logic đã chứng minh, nhưng khác biệt môi trường vẫn có thể lộ lỗi | Chạy `supabase db reset` + test RLS bằng 2 user thật trước release (hướng dẫn trong `supabase/README.md`) |
| 2 | Lockout 5 lần là client-side (+ rate limit server) | Xóa app/data sẽ reset bộ đếm | Chấp nhận cho MVP; nếu cần chặt hơn → bật Supabase Auth attack protection / captcha |
| 3 | Chưa có màn "đổi mật khẩu khi đã đăng nhập" và xóa avatar | Thiếu tính năng phụ của FR-01.5 | Làm ở sprint sau (dùng lại `UpdatePasswordUseCase`) |
| 4 | Chưa có instrumentation/UI test trên emulator | UI chỉ được verify qua compile + review code | Bổ sung Compose UI test khi có CI có emulator |
| 5 | UI chưa đối chiếu pixel-perfect với Figma (không truy cập được file Figma, chỉ dựa vào screen-inventory) | Có thể lệch spacing/màu nhỏ | Review với design; design tokens đã tập trung ở `presentation/theme` |
| 6 | `profiles` chưa có policy cho phép tìm user theo email (phục vụ chia sẻ ngăn kéo) | FR-02 sẽ cần | Thêm RPC `security definer` giới hạn field khi làm FR-02, không mở SELECT toàn bộ |

---

## 10. Nguồn gốc & mức độ kiểm chứng (SQL + config)

Phần backend **không copy từ template nào**; được viết tay và đối chiếu như sau:

| Phần | Nguồn |
|---|---|
| Bảng `profiles`, `drawers`, policy mẫu | `docs/03-References/db-schema.md` (repo) |
| Trigger `handle_new_user` + `on_auth_user_created` | Pattern chính thức [Supabase – User Management](https://supabase.com/docs/guides/auth/managing-user-data) (`security definer set search_path = ''`) |
| Storage bucket private + policy `auth.uid()` | [Supabase – Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) |
| Key trong `config.toml` | Đối chiếu `toml:` tag trong source `supabase/cli` (`apps/cli-go/pkg/config/auth.go`, `storage.go`, `config.go`) + [CLI config docs](https://supabase.com/docs/guides/local-development/cli/config) |
| Các thành phần **do tôi thêm**, không có trong tài liệu repo | bucket `avatars`, trigger `protect_profiles_columns`, trigger `enforce_drawer_quota`, trigger `handle_user_metadata_update`, `password_requirements`, nội dung email templates |

**Sai sót đã phát hiện & sửa khi đối chiếu nguồn** (nhờ review lại theo yêu cầu):

1. `enable_confirmations` bị đặt ở block `[auth]` — **không tồn tại** trong schema CLI
   (chỉ có ở `[auth.email]` / `[auth.sms]`) → đã xoá khỏi `[auth]`.
2. `content_path` của email template ghi `./templates/...` → **sai**: CLI resolve
   email-template path **tương đối với repo root**, không phải thư mục `supabase/`
   → sửa thành `./supabase/templates/...`.
3. 4 function `security definer` dùng `set search_path = public` → đổi thành
   `set search_path = ''` theo best practice của Supabase (mọi identifier đã
   schema-qualified nên an toàn).
4. Bổ sung `password_requirements = "letters_digits"` để server cũng enforce
   "chữ + số" giống `CredentialsValidator` ở client.
5. Hai file migration bị **UTF-8 BOM** (do lệnh PowerShell sửa file trước đó) →
   Postgres báo `syntax error at or near "\ufeff"`. Đã strip BOM và thêm cảnh báo
   trong `supabase/README.md`.

**Đã kiểm chứng bằng cách chạy thật**: `supabase/tests/validate_migrations.py` dựng
PostgreSQL thật (embedded, không cần Docker), stub `auth.users`/`auth.uid()`/`storage.*`
rồi apply cả 4 migration → **19/19 check PASS**: tạo profile + 3 drawer khi signup,
fallback `display_name`, quota chặn drawer thứ 4, guard `max_drawers` (chỉ service_role),
trigger `updated_at`, RLS (chỉ thấy/sửa profile của mình), bucket `avatars` private 5 MB
với 4 policy.

**Chưa kiểm chứng**: chưa chạy trên **Supabase stack thật** (GoTrue/PostgREST/Storage
thật + JWT thật) — stub chỉ mô phỏng schema. Trước release vẫn nên `supabase db reset`
và test RLS bằng 2 user thật.

---

## 11. File tham chiếu nhanh

| Nội dung | Đường dẫn |
|---|---|
| Hướng dẫn mobile (setup/build/scope) | [app/mobile/README.md](../../../app/mobile/README.md) |
| Hướng dẫn Supabase | [supabase/README.md](../../../supabase/README.md) |
| Màn hình auth (Figma mapping) | [screen-inventory.md](../../03-References/screen-inventory.md#1-login-đăng-nhập) |
| Schema DB | [db-schema.md](../../03-References/db-schema.md) |
| Task breakdown FR-02 (tiếp theo) | [task-breakdown.md](../active/task-breakdown.md#task-breakdown--fr-02-ngăn-kéo-kỷ-niệm-memory-drawers) |
