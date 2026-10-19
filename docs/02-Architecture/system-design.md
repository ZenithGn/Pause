# System Design – Kiến trúc hệ thống Pause

## 1. Kiến trúc tổng quan (High-Level Architecture)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├────────────────────────────┬─────────────────────────────────────────┤
│     📱 Mobile App          │        🌐 Web App                       │
│     (Kotlin – Android)     │        (Next.js)                        │
│                            │                                         │
│  • Ngăn kéo kỷ niệm       │  • Landing page                        │
│  • Photobooth builder      │  • Thông tin sản phẩm                  │
│  • Đặt in & thanh toán     │  • Admin dashboard                     │
│  • Gói hội viên            │  • Download app CTA                    │
│  • Profile & settings      │                                        │
├────────────────────────────┴─────────────────────────────────────────┤
│                         HTTPS / REST API                             │
├──────────────────────────────────────────────────────────────────────┤
│                     BACKEND LAYER (Supabase)                         │
├──────────────┬──────────────┬──────────────┬─────────────────────────┤
│  🔐 Auth     │  🗄️ Database │  📦 Storage   │  ⚡ Edge Functions      │
│              │  (PostgreSQL)│  (S3-compat) │  (Deno runtime)        │
│  • Email/PW  │              │              │                         │
│  • Google    │  • Users     │  • Ảnh gốc   │  • Tạo thumbnail       │
│  • JWT       │  • Drawers   │  • Thumbnails│  • Xử lý đơn hàng     │
│  • RLS       │  • Photos    │  • Templates │  • Webhook callback    │
│              │  • Orders    │              │  • Nén ảnh             │
│              │  • Plans     │              │                         │
├──────────────┴──────────────┴──────────────┴─────────────────────────┤
│                      EXTERNAL SERVICES                               │
├──────────────┬──────────────┬────────────────────────────────────────┤
│  💳 Payment  │  🔔 FCM      │  🖨️ Đối tác in ấn                     │
│  Gateway     │  Push Notif  │  (API / Manual)                       │
│  (VNPay/     │              │                                        │
│   MoMo)      │              │                                        │
└──────────────┴──────────────┴────────────────────────────────────────┘
```

---

## 2. Chi tiết từng thành phần

### 2.1 Mobile App (Kotlin – Android)

**Vai trò**: Nền tảng chính chứa toàn bộ nghiệp vụ core.

**Kiến trúc nội bộ**: Clean Architecture + MVVM

```
┌─────────────────────────────────────────────┐
│               Presentation Layer             │
│  (Activity, Fragment, ViewModel, Compose UI) │
├─────────────────────────────────────────────┤
│               Domain Layer                   │
│  (Use Cases, Repository Interfaces, Models)  │
├─────────────────────────────────────────────┤
│               Data Layer                     │
│  (Repository Impl, Supabase SDK, Local DB)   │
└─────────────────────────────────────────────┘
```

**Tech stack chi tiết (mobile)**:

| Layer | Công nghệ | Mục đích |
|---|---|---|
| UI | Jetpack Compose | Declarative UI |
| Navigation | Compose Navigation | Điều hướng màn hình |
| DI | Hilt / Koin | Dependency Injection |
| Networking | Supabase Kotlin SDK | Gọi API Supabase |
| Image loading | Coil | Load & cache ảnh |
| Local storage | Room / DataStore | Cache offline, settings |
| Push notification | Firebase Cloud Messaging | Nhận thông báo |

### 2.2 Web App (Next.js)

**Vai trò**: Landing page, thông tin sản phẩm, admin dashboard.

**Không chứa** nghiệp vụ core (ngăn kéo, photobooth, đặt in). Các tính năng này chỉ có trên mobile.

**Chức năng web**:
- Landing page giới thiệu sản phẩm
- Trang download app
- Blog / bài viết
- Admin dashboard (quản lý user, template, đơn hàng, gói hội viên)

**Tech stack (web)**:

| Công nghệ | Mục đích |
|---|---|
| Next.js 14+ (App Router) | Framework SSR/SSG |
| TypeScript | Type safety |
| Supabase JS SDK | Gọi API Supabase |
| Vercel | Hosting & deployment |

### 2.3 Backend (Supabase)

**Vai trò**: Cung cấp toàn bộ backend services.

#### Supabase Auth
- Xác thực email/password & Google OAuth
- Quản lý session với JWT
- Auto-refresh token

#### Supabase Database (PostgreSQL)
- Lưu trữ structured data (users, drawers, photos, orders, plans...)
- Row Level Security (RLS) cho phân quyền
- Database triggers cho business logic

#### Supabase Storage
- Lưu trữ ảnh gốc & thumbnails (S3-compatible)
- Bucket cấu hình private → truy cập qua signed URL
- Tự động nén ảnh qua Edge Function

#### Supabase Edge Functions
- Serverless functions viết bằng Deno/TypeScript
- Xử lý logic phức tạp: tạo thumbnail, nén ảnh, xử lý webhook payment
- Gọi external APIs (payment gateway, đối tác in)

---

## 3. Luồng dữ liệu chính (Key Data Flows)

### 3.1 Upload ảnh vào ngăn kéo

```
User chọn ảnh     App kiểm tra      Upload lên         Edge Function
từ gallery    →   dung lượng    →   Supabase Storage →  tạo thumbnail
                  ngăn kéo                              + insert metadata
                                                        vào DB
                                    ↓
                              Cập nhật dung lượng
                              đã dùng của ngăn kéo
```

### 3.2 Tạo & đặt in Photobooth

```
User chọn      User fill ảnh     App render         User đặt in
template   →   từ ngăn kéo  →   preview local  →   
                                                     ↓
                                              Edge Function tạo
                                              order + redirect
                                              payment gateway
                                                     ↓
                                              Payment callback →
                                              cập nhật order status →
                                              thông báo user
```

### 3.3 Chia sẻ ngăn kéo

```
Owner chọn      Nhập email/       Tạo record         Người nhận
"Chia sẻ"  →   username +    →   drawer_shares  →   thấy ngăn kéo
               chọn quyền        trong DB            trong list
               (View/Edit)                           (với badge
                                                     "Được chia sẻ")
                                  ↓
                            RLS policy tự động
                            cho phép truy cập
                            theo quyền
```

---

## 4. Chiến lược bảo mật (Security Strategy)

### 4.1 Row Level Security (RLS)

```sql
-- Ví dụ: User chỉ thấy ngăn kéo của mình + được chia sẻ
CREATE POLICY "Users can view own drawers"
  ON drawers FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view shared drawers"
  ON drawers FOR SELECT
  USING (
    id IN (
      SELECT drawer_id FROM drawer_shares
      WHERE shared_with_id = auth.uid()
    )
  );
```

### 4.2 Storage Security

- **Private bucket**: Tất cả ảnh nằm trong bucket private
- **Signed URL**: Client lấy URL tạm (expiry 1h) để hiển thị ảnh
- **Path structure**: `/{user_id}/{drawer_id}/{photo_id}.{ext}`

### 4.3 API Security

- Tất cả API call qua HTTPS
- JWT token trong Authorization header
- Rate limiting qua Supabase config

---

## 5. Chiến lược Offline & Caching

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Supabase    │ ←→  │  Local Cache  │ ←→  │     UI       │
│  (Remote)    │     │  (Room/Coil)  │     │  (Compose)   │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                     ┌─────┴─────┐
                     │           │
              Metadata DB    Image Cache
              (Room)         (Coil disk cache)
```

- **Online**: Sync real-time với Supabase
- **Offline**: Hiển thị ảnh từ Coil disk cache + metadata từ Room
- **Reconnect**: Upload queue – ảnh chờ upload sẽ được gửi khi có lại kết nối

---

## 6. Deployment Architecture

```
┌─────────────────────────────────────────────┐
│              Production                      │
├─────────────────────┬───────────────────────┤
│  Supabase Cloud     │  Vercel               │
│  (Backend)          │  (Web Frontend)       │
│                     │                        │
│  • ap-southeast-1   │  • Auto-deploy from   │
│    (Singapore)      │    main branch        │
│  • Free → Pro tier  │  • CDN global         │
│    khi scale        │  • Serverless         │
├─────────────────────┼───────────────────────┤
│  Google Play Store  │  Firebase             │
│  (Mobile dist)      │  (Crashlytics + FCM)  │
└─────────────────────┴───────────────────────┘
```
