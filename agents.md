# Pause – AI Agent Instructions

> File này hướng dẫn AI coding agents khi làm việc với repository Pause.
> Đọc kỹ trước khi thực hiện bất kỳ thay đổi nào.

---

## 📋 Project Context

**Pause** là ứng dụng kết hợp **lưu trữ kỷ niệm số** và **in ấn photobooth theo yêu cầu (print-on-demand)**.

- Người dùng tạo "Ngăn kéo Kỷ niệm" để lưu ảnh → chia sẻ với bạn bè → chọn template photobooth → fill ảnh → đặt in
- Mô hình Freemium: Free (3 ngăn kéo × 256 MB) + Gói hội viên trả phí + Doanh thu in ấn

---

## 🏗️ Tech Stack

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| **Mobile App** | Kotlin + Jetpack Compose | Nền tảng chính – chứa toàn bộ nghiệp vụ core |
| **Web App** | Next.js 14+ (App Router) + TypeScript | Landing page + Admin dashboard. KHÔNG chứa logic nghiệp vụ mobile |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | Managed BaaS – không tự deploy backend riêng |
| **Auth** | Supabase Auth (Email/Password + Google OAuth) | JWT-based, RLS cho phân quyền |
| **Storage** | **Cloudinary** (ảnh ngăn kéo + preview photobooth) + Supabase Storage (avatar/templates, private buckets, signed URL) | Chi tiết: `docs/03-References/storage-strategy.md` |
| **Push Notification** | Firebase Cloud Messaging (FCM) | Android only |
| **CI/CD** | Vercel (web), Manual (mobile → Play Store) | |

---

## 📁 Cấu trúc dự án

```
Pause/
├── docs/               # Tài liệu dự án (đọc trước khi code)
│   ├── 01-BA/          # Business Analysis, SRS, glossary
│   ├── 02-Architecture/ # System design, folder structure
│   ├── 03-References/   # DB schema, API docs
│   └── 04-Plans/        # Sprint plans, task breakdown
├── app/
│   ├── mobile/          # Kotlin Android app
│   └── web/             # Next.js web app
└── agents.md            # File này
```

---

## 📐 Quy tắc code chung

### Ngôn ngữ & Git Workflow
- **Code & comments**: Tiếng Anh
- **Documentation**: Tiếng Việt
- **Commit messages**: Tiếng Anh, theo Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Quy tắc phân nhánh (Branching rules)**:
  - Khi phát triển / thao tác chức năng **Mobile**: Luôn checkout và làm việc trên nhánh `mobile-app_dev` (hoặc `mobile-app-dev`).
  - Khi phát triển / thao tác chức năng **Web**: Luôn checkout và làm việc trên nhánh `webapp-dev`.
  - Tuyệt đối không commit/thao tác trực tiếp trên `main`.
- **Quy tắc Commit khi làm tính năng**:
  - Mỗi khi hoàn thành xong một chức năng → **bắt buộc phải commit**.
  - Nếu chức năng cần chỉnh sửa lại theo yêu cầu của user → **chỉ khi user xác nhận đã sửa xong/được rồi thì mới gom tất cả những gì đã sửa vào commit**. Không commit dở dang khi chưa có xác nhận từ user.

### Kotlin (Mobile)
- Kiến trúc: **Clean Architecture + MVVM**
  - `presentation/` → Compose UI + ViewModel
  - `domain/` → Use Cases + Repository interfaces + Domain models
  - `data/` → Repository implementations + DTOs + Supabase SDK calls
- UI: **Jetpack Compose** (không dùng XML layouts)
- DI: **Hilt** (ưu tiên) hoặc Koin
- Image loading: **Coil**
- Navigation: **Compose Navigation**
- Naming: PascalCase cho classes/files, camelCase cho functions/variables
- Tất cả string hiển thị cho user → đặt trong `strings.xml` (chuẩn bị i18n)

### TypeScript / Next.js (Web)
- App Router (không dùng Pages Router)
- Server Components mặc định, `"use client"` chỉ khi cần
- Supabase JS SDK cho API calls
- Styling: Vanilla CSS hoặc CSS Modules (không dùng TailwindCSS trừ khi được yêu cầu)

### Database (Supabase)
- Tham chiếu schema: `docs/03-References/db-schema.md`
- **Luôn bật RLS** trên mọi bảng public
- Tên bảng & cột: `snake_case`
- Sử dụng UUID cho primary key
- Edge Functions: viết bằng Deno/TypeScript

---

## 🔒 Quy tắc bảo mật

1. **KHÔNG bao giờ** hardcode credentials, API keys, hoặc secrets trong source code
2. Sử dụng environment variables cho tất cả config nhạy cảm
3. **KHÔNG** disable RLS trên bất kỳ bảng nào
4. Ảnh người dùng không được liệt kê công khai: ảnh ngăn kéo/preview dùng Cloudinary
   URL không đoán được (unsigned preset), avatar dùng private bucket + signed URL;
   khi lên production nên chuyển sang signed upload/authenticated delivery
5. Validate input ở cả client và server (Edge Functions)
6. Không lưu thông tin thanh toán (thẻ, tài khoản) trên hệ thống

---

## 📖 Tài liệu bắt buộc đọc trước khi code

Theo thứ tự ưu tiên:

1. [`docs/01-BA/production.md`](docs/01-BA/production.md) — Hiểu sản phẩm
2. [`docs/01-BA/domain-glossary.md`](docs/01-BA/domain-glossary.md) — Thuật ngữ nghiệp vụ
3. [`docs/01-BA/SRS/01-fr.md`](docs/01-BA/SRS/01-fr.md) — Yêu cầu chức năng
4. [`docs/02-Architecture/system-design.md`](docs/02-Architecture/system-design.md) — Kiến trúc
5. [`docs/03-References/db-schema.md`](docs/03-References/db-schema.md) — Database schema

---

## 🎨 UI/UX

- **Figma designs đã có sẵn** cho toàn bộ màn hình mobile app (luồng User)
- Khi implement UI, **phải theo sát Figma** — không tự ý thay đổi layout, màu sắc, spacing
- Luồng Admin chưa có design → follow Material Design 3 guidelines
- Web landing page chưa có design → thiết kế hiện đại, premium

---

## ⚠️ Lưu ý quan trọng

- **Mobile là nền tảng chính**. Web chỉ phục vụ landing page và admin.
- **Supabase là backend duy nhất**. Không tạo backend riêng (Express, NestJS...).
- Khi thêm bảng mới → cập nhật `db-schema.md`.
- Khi thêm FR mới → cập nhật `01-fr.md`.
- Giới hạn storage: **256 MB / ngăn kéo (free tier), 3 ngăn kéo / user**. Logic này phải enforce ở cả client và server. Chi tiết: `docs/03-References/storage-strategy.md`.
