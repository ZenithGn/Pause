# Supabase – Pause Backend

Backend duy nhất của dự án (Auth + PostgreSQL + Storage + Edge Functions).
Xem [AGENTS.md](../AGENTS.md) và [db-schema.md](../docs/03-References/db-schema.md).

---

## 0. Áp migration lên project — chạy ở đâu?

`supabase db push` phải chạy ở **thư mục gốc repo** (nơi có folder `supabase/`),
ví dụ: `C:\Users\lehan\Desktop\FPT\EXE\Pause`. Không cần Docker cho `db push`
(Docker chỉ cần khi `supabase start` để chạy local stack).

```powershell
# 1) Cài CLI (chọn 1 cách; npm có sẵn vì máy đã có Node.js)
npm install -g supabase
# hoặc: winget install Supabase.CLI  /  scoop install supabase

# 2) Đăng nhập (mở browser, chỉ làm 1 lần)
supabase login

# 3) Link project (chỉ làm 1 lần). Project Ref: Dashboard → Settings → General
cd C:\Users\lehan\Desktop\FPT\EXE\Pause
supabase link --project-ref <project-ref>     # sẽ hỏi Database password

# 4) Xem migration nào còn pending rồi push
supabase migration list
supabase db push
```

- Migration đã áp sẽ được ghi vào `supabase_migrations.schema_migrations`; `db push`
  chỉ chạy file còn thiếu.
- Nếu DB trước đó được dán SQL tay qua Dashboard (bảng history trống), `db push` sẽ
  chạy **toàn bộ** file. Bộ migration này đã được kiểm tra **an toàn khi chạy lại**
  (check "Migrations are safe to re-apply" trong `tests/validate_migrations.py`), nên
  vẫn hội tụ về đúng schema.

### Cách 2: không cài CLI — dán SQL trong Dashboard

**Trường hợp project đã có dữ liệu test cũ (khuyến nghị reset sạch):**

1. Dashboard → **SQL Editor** → New query, chạy:

   ```sql
   drop schema public cascade;
   create schema public;
   grant usage on schema public to anon, authenticated, service_role;
   ```

2. Mở file `supabase/migrations/20251115090000_init_schema.sql`, copy toàn bộ nội dung,
   dán vào SQL Editor → **Run**.
3. Kiểm chứng: chạy `supabase/tests/diagnose_fr02.sql` — phải thấy đủ bảng, RPC,
   bucket và policy.

**Trường hợp muốn giữ dữ liệu:** file baseline là idempotent nên có thể chạy trực tiếp
(create table if not exists / drop-create policy / drop-create function). Tuy nhiên
các policy/trigger cũ không còn trong file sẽ không tự bị xoá — nếu nghi ngờ, nên
reset sạch như trên (dữ liệu hiện tại chỉ là test).

## 1. Cấu trúc

```
supabase/
├── config.toml                     # Cấu hình local stack (auth, storage, email templates)
├── migrations/
│   ├── 20251115090000_init_schema.sql          # ⭐ baseline schema
│   └── 20261021090000_create_drawer_rpc.sql    # FR-02 atomic drawer creation repair
├── templates/
│   ├── confirmation.html           # Email xác nhận (link + OTP)
│   └── recovery.html               # Email khôi phục mật khẩu (link + OTP)
├── functions/
│   └── create-thumbnail/index.ts   # (tuỳ chọn) backfill thumbnail phía server
├── tests/
│   ├── validate_migrations.py      # chạy schema trên PostgreSQL embedded (không cần Docker)
│   └── diagnose_fr02.sql           # chẩn đoán nhanh trên project thật
└── README.md
```

> **Một file baseline duy nhất** thay cho 10 migration trước đây. File bao gồm:
> profiles/auth triggers + RLS (FR-01); drawers/photos/drawer_shares + quota 256 MB +
> accounting triggers + 7 RPC (FR-02); photobooth templates/items/photos (FR-03);
> membership_plans/memberships + seed 3 gói (FR-04); print_orders/transactions (FR-05);
> `profiles.role`, admin policies + `admin_dashboard_stats()` (FR-06);
> notifications/device_tokens + trigger thông báo khi có lời mời chia sẻ (FR-07);
> toàn bộ indexes, storage buckets (avatars/photos/thumbnails/templates/previews)
> và storage policies.
>
> File **idempotent** (chạy lại nhiều lần không lỗi) — đã có test riêng trong
> `tests/validate_migrations.py`.

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
| **SQL đã được chạy thật chưa?** | ✅ **Rồi** — chạy trên PostgreSQL thật (embedded, không cần Docker) bằng `tests/validate_migrations.py`: apply file baseline + **60/60 check** (FR-01 + FR-02: trigger, quota 256 MB, RLS, invitation flow, bucket). Chưa chạy trên **Supabase stack thật** (GoTrue/PostgREST/Storage thật) |

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
