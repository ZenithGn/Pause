# SRS – Yêu cầu phi chức năng (Non-Functional Requirements)

## NFR-01: Hiệu năng (Performance)

| ID | Yêu cầu | Chỉ số đo |
|---|---|---|
| NFR-01.1 | Thời gian phản hồi API thông thường | ≤ 500ms cho 95% requests |
| NFR-01.2 | Thời gian upload ảnh (1 ảnh ≤ 5MB) | ≤ 3 giây (kết nối 4G) |
| NFR-01.3 | Thời gian tải danh sách ảnh trong ngăn kéo | ≤ 2 giây (hiển thị thumbnail đầu tiên) |
| NFR-01.4 | Thời gian render preview photobooth | ≤ 2 giây |
| NFR-01.5 | App khởi động (cold start) | ≤ 3 giây |

---

## NFR-02: Khả năng mở rộng (Scalability)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-02.1 | Số lượng người dùng đồng thời | Hỗ trợ tối thiểu 500 CCU trong MVP |
| NFR-02.2 | Tổng dung lượng lưu trữ | Supabase Storage – scale theo nhu cầu |
| NFR-02.3 | Số lượng ảnh mỗi ngăn kéo | Không giới hạn số lượng (chỉ giới hạn dung lượng 1 GB) |

---

## NFR-03: Tính khả dụng (Availability)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-03.1 | Uptime hệ thống backend | ≥ 99.5% (phụ thuộc Supabase SLA) |
| NFR-03.2 | Offline mode (mobile) | App hiển thị được ảnh đã cache khi mất kết nối. Upload queue khi có lại kết nối |
| NFR-03.3 | Graceful degradation | Khi service in ấn lỗi → vẫn cho phép tạo photobooth, chỉ disable nút đặt in |

---

## NFR-04: Bảo mật (Security)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-04.1 | Xác thực | JWT token qua Supabase Auth. Token expiry: 1 giờ, refresh token: 7 ngày |
| NFR-04.2 | Phân quyền | Row Level Security (RLS) trên Supabase. User chỉ truy cập data của mình hoặc data được chia sẻ |
| NFR-04.3 | Mã hóa truyền tải | HTTPS/TLS 1.2+ cho mọi API call |
| NFR-04.4 | Lưu trữ ảnh | Supabase Storage với bucket private. Truy cập qua signed URL (expiry 1 giờ) |
| NFR-04.5 | Thanh toán | Không lưu thông tin thẻ trên hệ thống. Delegate hoàn toàn cho payment gateway |
| NFR-04.6 | Input validation | Validate tất cả input phía client & server. Chống SQL injection, XSS |
| NFR-04.7 | Rate limiting | API rate limit: 100 requests/phút/user (có thể điều chỉnh) |

---

## NFR-05: Tính sử dụng (Usability)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-05.1 | Ngôn ngữ | Tiếng Việt là ngôn ngữ chính. Chuẩn bị i18n cho tiếng Anh (phase 2) |
| NFR-05.2 | Thời gian học sử dụng | User mới có thể tạo ngăn kéo + upload ảnh đầu tiên trong ≤ 2 phút |
| NFR-05.3 | Accessibility | Hỗ trợ font size scaling theo system settings. Contrast ratio ≥ 4.5:1 |
| NFR-05.4 | Onboarding | Có flow hướng dẫn (walkthrough) cho user lần đầu sử dụng |

---

## NFR-06: Tương thích (Compatibility)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-06.1 | Android version | Hỗ trợ Android 8.0 (API 26) trở lên |
| NFR-06.2 | Kích thước màn hình | Responsive từ 5" đến 7" (phone). Tablet hỗ trợ cơ bản |
| NFR-06.3 | Định dạng ảnh hỗ trợ | JPEG, PNG, HEIC/HEIF, WebP |
| NFR-06.4 | Web browser (Next.js app) | Chrome, Firefox, Safari, Edge – 2 phiên bản mới nhất |

---

## NFR-07: Bảo trì & Vận hành (Maintainability)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-07.1 | Kiến trúc code | Clean Architecture (mobile), modular structure |
| NFR-07.2 | Logging | Structured logging cho API calls. Log level: ERROR, WARN, INFO |
| NFR-07.3 | Monitoring | Supabase Dashboard cho DB/Storage metrics. Firebase Crashlytics cho mobile crash |
| NFR-07.4 | CI/CD | Tự động build & deploy cho web (Vercel). Manual release cho mobile (Play Store) |
| NFR-07.5 | Codebase | Viết bằng tiếng Anh (tên biến, comment). Documentation bằng tiếng Việt |

---

## NFR-08: Dữ liệu (Data)

| ID | Yêu cầu | Chi tiết |
|---|---|---|
| NFR-08.1 | Backup | Supabase tự động backup database hàng ngày |
| NFR-08.2 | Data retention | Ảnh của user được giữ vĩnh viễn (trừ khi user xóa hoặc xóa tài khoản) |
| NFR-08.3 | Data export | User có quyền tải xuống toàn bộ ảnh của mình (GDPR-like) |
| NFR-08.4 | Xóa tài khoản | Khi user xóa tài khoản → xóa toàn bộ data sau 30 ngày grace period |

---

## Ma trận ưu tiên NFR

| Mức ưu tiên | NFR |
|---|---|
| 🔴 **Bắt buộc cho MVP** | NFR-04 (Bảo mật), NFR-01 (Hiệu năng cơ bản), NFR-06.1 (Android compat) |
| 🟡 **Nên có** | NFR-05 (Usability), NFR-03 (Availability), NFR-07 (Maintainability) |
| 🟢 **Tốt nếu có** | NFR-02 (Scalability mở rộng), NFR-08.3 (Data export) |
