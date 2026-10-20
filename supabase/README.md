# Supabase – Pause Backend

Backend duy nhất của dự án (Auth + PostgreSQL + Storage + Edge Functions).
Xem [AGENTS.md](../AGENTS.md) và [db-schema.md](../docs/03-References/db-schema.md).

---

## 1. Cấu trúc

```
supabase/
├── config.toml                     # Cấu hình local stack (auth, storage, email templates)
├── migrations/
│   ├── 20251112090000_profiles.sql          # T-01.03 profiles + handle_new_user()
│   ├── 20251112090100_profiles_rls.sql      # T-01.04 RLS + column guard
│   ├── 20251112090200_drawers_defaults.sql  # T-01.05 3 ngăn kéo mặc định + quota
│   ├── 20251112090300_avatars_bucket.sql    # FR-01.5 bucket avatars (private)
│   ├── 20251113090000_drawer_shares.sql     # FR-02 shares + invitation status
│   ├── 20251113090100_photos.sql            # FR-02 photos + RLS
│   ├── 20251113090200_drawer_storage.sql    # FR-02 quota 256 MB + accounting triggers
│   ├── 20251113090300_photo_storage_buckets.sql # FR-02 photos/thumbnails buckets
│   ├── 20251113090400_drawer_rpcs.sql       # FR-02 RPCs (list/share/invitations)
│   └── 20251114090000_fr02_repair.sql       # Repair: quota, invitation status, RPCs
└── templates/
    ├── confirmation.html           # Email xác nhận (link + OTP)
    └── recovery.html               # Email khôi phục mật khẩu (link + OTP)
```

---

## 2. Tạo project trên Supabase Cloud (T-01.01)

1. Vào <https://supabase.com/dashboard> → **New project**.
2. Đặt tên `pause`, **Region: `ap-southeast-1` (Singapore)** — theo `system-design.md`.
3. Lưu lại **Project URL** và **anon public key** (Settings → API).
4. Push migrations:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   Hoặc copy từng file trong `migrations/` vào SQL Editor (đúng thứ tự tên file).

> ⚠️ **Không** đưa `service_role key` vào app mobile. Key này chỉ dùng server-side
> (Admin dashboard/Edge Functions) và phải nằm trong biến môi trường.

---

## 3. Cấu hình Auth providers (T-01.02)

### 3.1 Email/Password

- Authentication → Sign In / Providers → **Email**: bật *Enable Email provider*.
- Bật *Confirm email* (FR-01.1 yêu cầu xác nhận email).
- Password: min length **8**, yêu cầu chữ + số (`minimum_password_length = 8`,
  `password_requirements = "letters_digits"` trong `config.toml`).
- **Email Templates → Confirm signup / Reset password**: dán nội dung từ
  `templates/confirmation.html` và `templates/recovery.html` (đã bao gồm cả link và
  mã OTP để app xử lý được cả hai luồng).

> ⚠️ **Quirk của CLI local**: `auth.email.template.*.content_path` được resolve
> **tương đối với repo root** (CLI dùng `filepath.Dir(SupabaseDirPath)`), trong khi
> `auth.email.notification.*.content_path` lại tương đối với thư mục `supabase/`.
> Vì vậy `config.toml` phải ghi `./supabase/templates/...` — nếu đổi thành
> `./templates/...` thì `supabase start` sẽ không tìm thấy template.

### 3.2 Google OAuth

1. Google Cloud Console → OAuth client ID (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase Dashboard → Authentication → Providers → **Google**: dán Client ID/Secret.
4. Authentication → URL Configuration:
   - **Site URL**: `pause://auth-callback`
   - **Additional Redirect URLs**: `pause://auth-callback`
5. App Android dùng luồng **ID token (Credential Manager)** — xem
   `app/mobile/README.md`. Server client ID của Google được truyền vào app qua
   `GOOGLE_WEB_CLIENT_ID` trong `local.properties`, **không** hardcode.

### 3.3 Deep link (đặt lại mật khẩu)

App đăng ký scheme `pause://` với host `auth-callback` (xem `AndroidManifest.xml`).
Sau khi user bấm link trong email, `MainActivity` nhận `intent.data` và
`AuthRepository.handleAuthDeepLink(...)` sẽ nạp session khôi phục.

---

## 4. Chạy local (tuỳ chọn)

```bash
supabase start        # cần Docker
supabase db reset     # apply migrations + templates
supabase status       # lấy API URL / anon key cho local.properties
```

Local API URL: `http://10.0.2.2:54321` khi chạy app trên Android emulator
(`10.0.2.2` = localhost của máy host).

---

## 5. Kiểm tra RLS sau khi deploy

```sql
-- phải trả về rowlevel_security = 'ENABLED' cho cả 2 bảng
select relname, relrowsecurity
from pg_class
where relname in ('profiles', 'drawers');

-- user A không được thấy profile của user B
-- (chạy trong SQL Editor với JWT của từng user, hoặc dùng anon key + auth)
select * from public.profiles;
```

---

## 6. Biến môi trường

| Biến | Dùng ở đâu | Ghi chú |
|---|---|---|
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | `config.toml` (local) / Dashboard (cloud) | Google OAuth client ID |
| `SUPABASE_AUTH_GOOGLE_SECRET` | `config.toml` (local) / Dashboard (cloud) | Google OAuth secret |
| `SUPABASE_URL` | Edge Functions / CI | Project URL |
| `SUPABASE_ANON_KEY` | Mobile `local.properties` (`SUPABASE_ANON_KEY`) | Public key, an toàn khi nhúng app |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | **Không** đưa vào mobile/web client |

---

## 7. Mức độ kiểm chứng của phần backend này

| Nội dung | Nguồn / mức độ |
|---|---|
| Cấu trúc bảng `profiles`, `drawers`, RLS policy mẫu | Viết lại từ `docs/03-References/db-schema.md` (đã có sẵn schema + policy mẫu trong repo) |
| Trigger `handle_new_user` + `on_auth_user_created` | Theo pattern chính thức của Supabase ([User Management](https://supabase.com/docs/guides/auth/managing-user-data)); bổ sung fallback tên + `on conflict do nothing` |
| `security definer set search_path = ''` | Best practice trong tài liệu Supabase nói trên (đã áp dụng cho cả 4 function) |
| Storage bucket private + policy theo `auth.uid()` | Theo [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) |
| Key trong `config.toml` | Đối chiếu `toml:` tag trong source `supabase/cli` (`apps/cli-go/pkg/config/auth.go`, `storage.go`) và [CLI config docs](https://supabase.com/docs/guides/local-development/cli/config) |
| **SQL đã được chạy thật chưa?** | ✅ **Rồi** — chạy trên PostgreSQL thật (embedded, không cần Docker) bằng `tests/validate_migrations.py`: apply đủ 10 migration + **54/54 check** (FR-01 + FR-02: trigger, quota 256 MB, RLS, invitation flow, bucket). Chưa chạy trên **Supabase stack thật** (GoTrue/PostgREST/Storage thật) |

### Chạy lại kiểm chứng SQL (không cần Docker)

```bash
pip install pgserver "psycopg[binary]"
python supabase/tests/validate_migrations.py
```

Nếu app vẫn hiển thị/sao lưu sai, chạy `supabase/tests/diagnose_fr02.sql` trong SQL
Editor để xem migration/cột/RPC/policy/bucket nào còn thiếu.

Script sẽ dựng PostgreSQL tạm, tạo stub cho `auth.users`, `auth.uid()`,
`storage.*` (giống Supabase), apply toàn bộ migration rồi assert hành vi FR-01.
Kết quả mong đợi: `ALL SQL CHECKS PASSED` (exit code 0).

> Ghi chú: stub chỉ mô phỏng schema của Supabase, **không** thay thế việc test trên
> Supabase thật (`supabase db reset` + test RLS bằng JWT thật) trước khi release.

> Lưu ý encoding: file `.sql` **không được có UTF-8 BOM** (Postgres báo
> `syntax error at or near "\ufeff"`). Nếu sửa file bằng PowerShell cũ
> (`Set-Content -Encoding utf8` của PS 5.1), kiểm tra lại BOM.
