# SRS – Tổng quan hệ thống Pause

## 1. Giới thiệu

### 1.1 Mục đích tài liệu

Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) mô tả chi tiết các yêu cầu chức năng và phi chức năng của hệ thống **Pause** — ứng dụng kết hợp giữa **lưu trữ kỷ niệm số** và **in ấn theo yêu cầu (print-on-demand)**.

### 1.2 Phạm vi sản phẩm

**Pause** là nền tảng giúp người dùng:

- **Lưu trữ & phân loại** ảnh kỷ niệm vào các "Ngăn kéo kỷ niệm" (Memory Drawers)
- **Thiết kế & in ấn** ảnh photobooth từ các template có sẵn
- **Chia sẻ** kỷ niệm với bạn bè, người thân thông qua cơ chế phân quyền

### 1.3 Đối tượng người dùng

| Đối tượng | Mô tả |
|---|---|
| Giới trẻ (18–30) | Nhóm chính – thích lưu giữ kỷ niệm, chụp photobooth, in ảnh làm quà tặng |
| Các cặp đôi | Lưu kỷ niệm hẹn hò, tạo photobooth chung |
| Nhóm bạn | Chia sẻ album kỷ niệm theo sự kiện, du lịch |
| Gia đình | Lưu trữ ảnh gia đình, in photobook |

### 1.4 Định nghĩa & Thuật ngữ

> Tham chiếu chi tiết tại [domain-glossary.md](../domain-glossary.md)

---

## 2. Mô tả tổng quan sản phẩm

### 2.1 Bối cảnh (Context)

Trong thời đại số, ảnh chụp bị phân tán trên nhiều nền tảng (Google Photos, iCloud, thiết bị cũ...). Đồng thời, xu hướng retro/photobooth đang quay lại mạnh mẽ. **Pause** kết hợp hai nhu cầu:

1. **Kỷ niệm số được tổ chức** — không chỉ là gallery mà còn là "ngăn kéo" có ý nghĩa
2. **Hiện thực hóa kỷ niệm** — chuyển từ ảnh số sang sản phẩm vật lý (photobooth, móc khóa, photobook)

### 2.2 Nền tảng

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **Mobile App** | Kotlin (Android) | Nền tảng chính – toàn bộ nghiệp vụ core |
| **Web App** | Next.js | Landing page, thông tin sản phẩm, quản trị |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | API, lưu trữ, xác thực |

### 2.3 Actors

| Actor | Mô tả |
|---|---|
| **Guest** | Người chưa đăng ký – chỉ xem landing page, tải app |
| **User** | Người dùng đã đăng ký – sử dụng toàn bộ tính năng trên mobile |
| **Admin** | Quản trị viên – quản lý template, đơn hàng, người dùng, nội dung |

### 2.4 Tổng quan tính năng chính

```
┌─────────────────────────────────────────────────────────────┐
│                      PAUSE PLATFORM                         │
├─────────────────────┬────────────────────┬──────────────────┤
│  Ngăn kéo Kỷ niệm  │  Photobooth Print  │  Gói Hội viên   │
│  (Memory Drawers)   │  (Print-on-Demand) │  (Membership)    │
├─────────────────────┼────────────────────┼──────────────────┤
│ • Tạo/quản lý       │ • Chọn template    │ • Thêm ngăn kéo  │
│   ngăn kéo          │ • Fill ảnh từ      │ • Template mới   │
│ • Upload ảnh        │   ngăn kéo         │ • Tăng dung lượng│
│ • Phân quyền        │ • Preview & đặt in │                  │
│   chia sẻ           │ • Theo dõi đơn hàng│                  │
│ • Giới hạn 1GB/     │                    │                  │
│   ngăn kéo          │                    │                  │
│ • Mặc định 3        │                    │                  │
│   ngăn kéo/user     │                    │                  │
└─────────────────────┴────────────────────┴──────────────────┘
```

---

## 3. Ràng buộc hệ thống

### 3.1 Ràng buộc kinh doanh

- Hệ thống là dự án EXE (Entrepreneurship) tại FPT University
- MVP cần hoàn thành trong 1 học kỳ
- Mô hình doanh thu: **Freemium** (miễn phí cơ bản + gói hội viên trả phí) + **doanh thu từ in ấn**

### 3.2 Ràng buộc kỹ thuật

- Mobile app chỉ hỗ trợ **Android** trong MVP
- Backend sử dụng **Supabase** (managed service) để giảm chi phí vận hành
- Giới hạn dung lượng lưu trữ: **1 GB / ngăn kéo**, **3 ngăn kéo / user** (free tier)

### 3.3 Ràng buộc pháp lý

- Tuân thủ chính sách bảo mật dữ liệu người dùng (ảnh cá nhân)
- Chính sách quyền sở hữu ảnh: ảnh thuộc về người dùng upload
- Điều khoản sử dụng & Chính sách bảo mật cần được hiển thị rõ ràng

---

## 4. Giả định & Phụ thuộc

### 4.1 Giả định

- Người dùng có thiết bị Android phiên bản 8.0 (API level 26) trở lên
- Người dùng có kết nối internet để đồng bộ ảnh
- Dịch vụ in ấn sẽ được outsource cho đối tác in ấn bên thứ ba

### 4.2 Phụ thuộc bên ngoài

| Dịch vụ | Mục đích |
|---|---|
| Supabase | Backend-as-a-Service (Auth, DB, Storage, Edge Functions) |
| Đối tác in ấn | Thực hiện đơn hàng in photobooth, photobook |
| Payment Gateway | Xử lý thanh toán gói hội viên & đơn hàng in (VNPay/MoMo/ZaloPay) |
| Firebase Cloud Messaging | Push notification cho mobile app |
