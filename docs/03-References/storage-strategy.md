# Chiến lược lưu trữ & quota (Storage Strategy)

> Cập nhật cho kiến trúc **hybrid**: Cloudinary lưu ảnh (CDN + biến đổi ảnh),
> Supabase lo DB + Auth + RLS. Tài liệu này thay thế mô tả "1 GB/ngăn kéo" cũ và
> bổ sung phần Cloudinary (trước đây chỉ có Supabase Storage).

---

## 1. Vì sao đổi sang Cloudinary?

| Vấn đề với Supabase Storage | Cloudinary giải quyết |
|---|---|
| Free tier chỉ **1 GB**, ảnh gốc điện thoại rất nặng | Free tier ~25 credits/tháng, CDN toàn cầu, nén/transform tự động |
| Phải tự viết pipeline resize/thumbnail (Edge Function hoặc client) | Thumbnail sinh bằng URL transformation (`w_480,q_70,c_limit,f_auto`) |
| Signed URL phải tự quản lý, hết hạn 1h | URL CDN ổn định, cache tốt hơn |
| Tốn egress/CPU của Supabase | CDN offload hoàn toàn |

**Kiến trúc chốt (đã implement trong code mobile):**

```
Android app
  ├─ ảnh ngăn kéo ──► Cloudinary (unsigned upload preset) ──► secure_url
  │                        │
  │                        └─ thumbnail = URL transform (không upload riêng)
  └─ metadata (URL, size, dimensions) ──► Supabase `photos` (Postgres + RLS)

Ảnh preview photobooth (render trên máy) ──► Cloudinary `pause/photobooth/{user_id}`
                                            └─ URL lưu vào photobooth_items.preview_url
```

Supabase Storage **vẫn dùng** cho:
- `avatars` (private, 5 MB) – signed URL.
- `templates` (public) – ảnh preview/frame do admin upload.
- `photobooth-previews` / `photos` / `thumbnails`: chỉ còn là **legacy fallback**
  cho ảnh cũ (code vẫn đọc được object path cũ → signed URL).

---

## 2. Cấu hình Cloudinary

| Biến | Lấy ở đâu | Ghi chú |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Dashboard → Product Environment Settings | không phải bí mật |
| `CLOUDINARY_UPLOAD_PRESET` | Settings → Upload → Upload presets → **Unsigned** | không phải bí mật |

- Đặt trong `app/mobile/local.properties` → `BuildConfig` (không hardcode).
- Mẫu: [`app/mobile/local.properties.example`](../../app/mobile/local.properties.example).
- Preset nên cấu hình: folder mặc định `pause/photos`, `allowed_formats` (jpg,png,webp),
  `max_file_size` 10 MB, `quality` auto. **Không** dùng signed upload ở client
  (sẽ lộ API secret).

### Đường dẫn (folder) quy ước

| Loại | Folder | Lưu ở đâu |
|---|---|---|
| Ảnh ngăn kéo | `pause/photos/{drawer_id}` | `photos.original_url` = `secure_url` |
| Thumbnail ngăn kéo | (không upload) | `photos.thumbnail_url` = URL transform của original |
| Preview photobooth | `pause/photobooth/{user_id}` | `photobooth_items.preview_url` |
| Avatar | `pause/avatars/{user_id}` (hoặc Supabase `avatars`) | `profiles.avatar_url` |

---

## 3. Quota (giữ nguyên nghiệp vụ)

| Loại ngăn kéo | Dung lượng | Ghi chú |
|---|---|---|
| **Free** (3 ngăn kéo) | **256 MB / ngăn kéo** | Tổng 768 MB |
| **Mua lẻ** | 256 MB / ngăn kéo | Vĩnh viễn |
| **Hội viên** (FR-04) | 1 GB / ngăn kéo | Cap account dự kiến 10 GB |

- Quota tính trên **dung lượng ảnh sau nén** (`photos.file_size_bytes`), **không**
  phụ thuộc nhà cung cấp lưu trữ → đổi Cloudinary hay Supabase đều không đổi nghiệp vụ.
- Enforce **2 lớp**: client chặn trước khi upload (UX) + trigger Postgres
  `enforce_photo_quota` là nguồn sự thật (transactional, chống vượt quota).

---

## 4. Pipeline xử lý ảnh (client-side, trước khi upload Cloudinary)

| Bước | Thông số |
|---|---|
| Ảnh gốc người dùng chọn | chấp nhận ≤ 15 MB, jpeg/png/webp |
| Resize | cạnh dài ≤ **2048 px** (`inSampleSize` + scale, xoay theo EXIF) |
| Nén JPEG | quality **82**, mục tiêu ≤ 1.5 MB |
| Hard reject | file nén > **5 MB** (trigger DB cũng chặn) |
| Upload | Cloudinary unsigned preset → `secure_url` |
| Thumbnail | URL transform `w_480,q_70,c_limit,f_auto` (không upload riêng) |
| Hiển thị | Coil load trực tiếp CDN URL (cache đĩa) |

---

## 5. Bảo mật & quyền riêng tư (trade-off đã biết)

- Cloudinary unsigned upload tạo URL **public nhưng không thể đoán** (public_id UUID
  + folder). Ai có URL đều xem được – tương đương "unlisted link".
- RLS của Supabase vẫn là nơi kiểm soát **ai thấy metadata/ảnh nào trong app**:
  `photos` chỉ trả row cho owner hoặc người được share `accepted`.
- Với dữ liệu thật, nên nâng cấp theo 1 trong 2 hướng (ghi ở technical debt):
  1. Cloudinary **signed upload** qua Supabase Edge Function (giữ API secret server-side)
     → kèm `access_mode: authenticated` + signed delivery URL.
  2. Chuyển ảnh nhạy cảm về bucket private với signed URL.
- Việc xoá: app xoá row DB; object Cloudinary **giữ lại** (client không có API secret)
  → cần Edge Function/cron dọn orphan (technical debt).

---

## 6. Hệ quả cần lưu ý

- Không còn phụ thuộc egress Supabase cho ảnh → gói Free thoải mái hơn cho demo/EXE.
- `photos.original_url`/`thumbnail_url` giờ là **URL tuyệt đối** (Cloudinary), không phải
  object path. Code vẫn tương thích ảnh legacy dạng path (phân biệt bằng
  `CloudinaryUploader.isCloudinaryUrl`).
- Admin dashboard (FR-06) upload template preview lên Supabase `templates` (public)
  hoặc Cloudinary; ưu tiên admin upload qua Cloudinary folder `pause/templates`.
- Nếu Cloudinary hết credit/quota: app hiện banner lỗi upload (đã có), ảnh cũ vẫn xem được
  vì URL CDN không phụ thuộc Supabase.
