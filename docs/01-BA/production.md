# Mô tả sản phẩm (Product Description)

## 🎯 Tầm nhìn sản phẩm (Product Vision)

> **Pause** — *"Dừng lại, lưu giữ, hiện thực hóa kỷ niệm"*

Pause là ứng dụng mobile giúp người dùng **lưu trữ ảnh kỷ niệm** một cách có tổ chức thông qua khái niệm "Ngăn kéo Kỷ niệm", đồng thời **chuyển hóa kỷ niệm số thành sản phẩm vật lý** thông qua tính năng in ảnh photobooth theo yêu cầu.

---

## 📋 Thông tin dự án

| Mục | Chi tiết |
|---|---|
| **Tên dự án** | Pause |
| **Loại dự án** | EXE (Entrepreneurship) – FPT University |
| **Nền tảng chính** | Mobile (Android – Kotlin) |
| **Nền tảng phụ** | Web (Next.js) – Landing page & Admin |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Mô hình doanh thu** | Freemium + Print-on-Demand |

---

## 💡 Vấn đề cần giải quyết

### Vấn đề 1: Ảnh kỷ niệm bị phân tán & vô tổ chức
- Ảnh nằm rải rác trên nhiều thiết bị, nền tảng (Google Photos, iCloud, Zalo, Messenger...)
- Không có cách phân loại ảnh theo "kỷ niệm" hay "dịp" cụ thể
- Ảnh bị lẫn với ảnh công việc, screenshot, ảnh vặt

### Vấn đề 2: Khoảng cách giữa ảnh số và sản phẩm vật lý
- Người dùng muốn in ảnh nhưng quy trình phức tạp (tìm tiệm in, chọn mẫu, gửi file...)
- Xu hướng photobooth/retro photo đang hot nhưng chỉ có ở quán chụp vật lý
- Thiếu trải nghiệm liền mạch từ "lưu ảnh" → "thiết kế" → "nhận sản phẩm"

---

## ✨ Giải pháp

### Ngăn kéo Kỷ niệm (Memory Drawers)
- Mỗi user có các "ngăn kéo" riêng – giống như ngăn kéo bàn để lưu ảnh quan trọng
- Mỗi ngăn kéo = 1 dịp / chủ đề (ví dụ: "Du lịch Đà Lạt 2026", "Kỷ niệm 1 năm")
- Chia sẻ ngăn kéo với người thân – cùng thêm ảnh vào kỷ niệm chung

### In ảnh Photobooth tại nhà
- Chọn template photobooth đẹp → Fill ảnh từ ngăn kéo → Đặt in → Nhận hàng
- Không cần đến quán chụp, không cần biết design
- Quy trình 3 bước: Chọn mẫu → Chọn ảnh → Đặt in

### Gói Hội viên linh hoạt
- Free: 3 ngăn kéo × 1 GB – đủ dùng cơ bản
- Hội viên: Thêm ngăn kéo, template premium, dung lượng lớn hơn
- Mua lẻ: Chỉ cần thêm 1 ngăn kéo? Mua riêng, giữ vĩnh viễn

---

## 🎯 Đối tượng khách hàng mục tiêu

```
┌─────────────────────────────────────────────────────┐
│              Phân khúc khách hàng                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  👫 Giới trẻ 18-30        ❤️ Các cặp đôi            │
│  • Thích lưu giữ kỷ niệm  • Album hẹn hò            │
│  • Chụp photobooth trend   • Quà tặng kỷ niệm       │
│  • Chia sẻ với bạn bè      • Photobooth couple       │
│                                                      │
│  👥 Nhóm bạn              👨‍👩‍👧‍👦 Gia đình             │
│  • Album du lịch chung     • Ảnh gia đình            │
│  • Kỷ niệm sự kiện        • Photobook kỷ niệm       │
│  • Chia sẻ lẫn nhau        • Quà tặng ông bà         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Mô hình kinh doanh

### Nguồn doanh thu

| Nguồn | Mô tả | Loại |
|---|---|---|
| **Gói hội viên** | Đăng ký tháng/năm để mở rộng quyền lợi | Recurring Revenue |
| **In ấn Photobooth** | Phí in + shipping khi user đặt in | Transaction Revenue |
| **Mua lẻ ngăn kéo** | Mua thêm ngăn kéo vĩnh viễn | One-time Revenue |
| **Template Premium** | Template photobooth trả phí (future) | One-time Revenue |

### Cơ cấu chi phí chính

| Khoản | Mô tả |
|---|---|
| Supabase | Database, Auth, Storage hosting |
| Vercel | Web app hosting (Next.js) |
| Đối tác in ấn | Chi phí in + đóng gói |
| Google Play | Phí đăng ký developer ($25 one-time) |
| Marketing | Quảng cáo, content trên mạng xã hội |

---

## 🗺️ Roadmap sơ bộ

### Phase 1 – MVP (Tuần 1–8)
- [x] Đăng ký / Đăng nhập (Supabase Auth)
- [ ] Ngăn kéo kỷ niệm: CRUD + upload ảnh
- [ ] Chia sẻ ngăn kéo (View/Edit)
- [ ] Template photobooth cơ bản (5–10 mẫu)
- [ ] Tạo photobooth + preview
- [ ] Đặt in (tích hợp 1 payment gateway)
- [ ] Landing page (Next.js)

### Phase 2 – Enhancement (Tuần 9–12)
- [ ] Gói hội viên + thanh toán subscription
- [ ] Mua lẻ ngăn kéo
- [ ] Admin dashboard (quản lý user, template, đơn hàng)
- [ ] Push notification
- [ ] Thêm template photobooth

### Phase 3 – Growth (Sau MVP)
- [ ] iOS app
- [ ] Thêm sản phẩm in ấn (móc khóa, photobook, sticker)
- [ ] AI auto-arrange ảnh trong template
- [ ] Tính năng kỷ niệm hàng năm (nhắc nhở)
- [ ] Đa ngôn ngữ (tiếng Anh)
