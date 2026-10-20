# Chiến lược lưu trữ & quota (Storage Strategy)

> Quyết định thiết kế cho FR-02 (Ngăn kéo Kỷ niệm). Tài liệu này thay thế con số
> "1 GB/ngăn kéo" trong các tài liệu BA cũ (đã cập nhật đồng bộ).

---

## 1. Vấn đề

Bản SRS ban đầu ghi **1 GB/ngăn kéo**, 3 ngăn kéo free → **3 GB/user**. Trong khi:

| Gói Supabase | Storage included | Chi phí |
|---|---|---|
| Free | **1 GB** | $0 |
| Pro | **100 GB** | ~$25/tháng |

→ Free tier không thể chứa nổi dù chỉ 1 user dùng hết quota. Ảnh gốc từ điện thoại
(3–12 MB/ảnh) cũng làm quota cạn rất nhanh.

---

## 2. Quota mới

| Loại ngăn kéo | Dung lượng | Ghi chú |
|---|---|---|
| **Free** (3 ngăn kéo mặc định) | **256 MB / ngăn kéo** | Tổng tối đa 768 MB |
| **Mua lẻ** (one-time purchase) | **256 MB / ngăn kéo** | Vĩnh viễn, không phụ thuộc hội viên |
| **Hội viên** (FR-04) | **1 GB / ngăn kéo** | Tổng account cap dự kiến 10 GB (Pro 100 GB) |

**Vì sao 256 MB?**

- 3 × 256 MB = **768 MB** → vừa Supabase Free 1 GB, còn ~250 MB cho avatar, template
  preview, thumbnail buffer và email/bucket metadata.
- Với ảnh đã nén (~1.2 MB/ảnh) → **~200 ảnh/ngăn kéo**, tương đương 1 album kỷ niệm
  thực tế (một chuyến đi, một năm của một cặp đôi).
- Là luỹ thừa của 2 → dễ đọc trong code/DB (`268435456` bytes), dễ nâng cấp sau này
  mà không phải đổi schema (chỉ đổi `storage_limit_bytes`).

Số lượng ảnh **không giới hạn** — chỉ giới hạn dung lượng (giữ nguyên NFR-02.3).

---

## 3. Pipeline xử lý ảnh (client-side)

Lý do chọn client-side thay vì Edge Function cho MVP: giảm egress/CPU của Supabase,
upload nhanh hơn, và không cần chờ function cold-start.

| Bước | Thông số |
|---|---|
| Ảnh gốc người dùng chọn | chấp nhận ≤ **15 MB**, jpeg/png/webp/heic* |
| Resize | cạnh dài ≤ **2048 px** (`inSampleSize` + scale) |
| Nén JPEG | quality **82**, strip EXIF (trừ hướng ảnh đã xoay) |
| Kích thước sau nén | mục tiêu ≤ **1.5 MB**, hard-reject nếu > **5 MB** |
| Thumbnail | cạnh dài **480 px**, quality **70**, WebP/JPEG ~**40–60 KB** |
| Upload | `photos/{drawer_id}/{photo_id}.jpg` + `thumbnails/{drawer_id}/{photo_id}.webp` |
| Hiển thị | private bucket → **signed URL** (TTL 1h, cache trong RAM) |

\* HEIC chỉ đọc được trên Android 9+; nếu decode lỗi → hiển thị message "định dạng
không hỗ trợ" thay vì crash.

---

## 4. Cách enforce (client + server)

1. **Client (trước khi upload)**: `UploadPhotosUseCase` cộng dồn kích thước đã nén,
   so với `drawer.storage_used_bytes + limit`; vượt → trả `DrawerFailure.StorageFull`
   để UI hiện upsell (FR-02.9).
2. **Server (nguồn sự thật)**: trigger `photos` cộng `storage_used_bytes` trong cùng
   transaction và raise `check_violation` nếu vượt `storage_limit_bytes`; trigger
   delete hoàn lại dung lượng.
3. **Chống sửa quota từ client**: `storage_used_bytes`, `storage_limit_bytes`,
   `is_purchased`, `owner_id` **không** được grant UPDATE cho role `authenticated`
   (PostgreSQL column-level privileges). Chỉ trigger `security definer` và
   `service_role` (membership/purchase) mới đổi được.

---

## 5. Hệ quả & việc cần làm

- User đã có ngăn kéo với limit 1 GB cũ → migration hạ default và cập nhật row cũ;
  nếu dung lượng đang dùng > 256 MB thì vẫn giữ nguyên (không xoá ảnh) nhưng chặn
  upload tiếp cho tới khi dưới ngưỡng.
- Edge Function `create-thumbnail` (T-02.05) được **thay bằng pipeline client-side**;
  Edge Function sẽ dùng cho ảnh cũ/backfill hoặc khi mở web upload (chưa có trong MVP).
- Cleanup ảnh mồ côi trong Storage khi xoá ngăn kéo: client xoá best-effort; cron
  Edge Function sẽ dọn định kỳ (ghi nhận technical debt).
- Khi lên Pro (100 GB) chỉ cần tăng `storage_limit_bytes` theo gói, không đổi schema.
