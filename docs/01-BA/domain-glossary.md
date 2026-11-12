# Bảng thuật ngữ nghiệp vụ (Domain Glossary)

> Tài liệu định nghĩa các thuật ngữ chuyên biệt được sử dụng xuyên suốt trong hệ thống **Pause**.

---

## Thuật ngữ cốt lõi

| Thuật ngữ (VN) | Thuật ngữ (EN) | Định nghĩa |
|---|---|---|
| **Ngăn kéo** | Memory Drawer | Đơn vị lưu trữ ảnh chính trong hệ thống. Mỗi ngăn kéo chứa các ảnh kỷ niệm liên quan đến một chủ đề/dịp cụ thể. Giới hạn số lượng tối đa 50 ảnh / ngăn kéo. Cho phép đặt ảnh bìa (thumbnail/cover). |
| **Ảnh kỷ niệm** | Memory Photo | Một bức ảnh được user upload vào ngăn kéo. Bao gồm ảnh gốc + thumbnail + metadata. |
| **Template Photobooth** | Photobooth Template | Mẫu thiết kế photobooth có sẵn, bao gồm bố cục (layout), khung (frame), và các slot để fill ảnh. User không thể chỉnh sửa layout. |
| **Slot ảnh** | Photo Slot | Vị trí trong template photobooth nơi user fill ảnh vào. Mỗi template có số slot cố định. |
| **Photobooth** | Photobooth | Sản phẩm cuối cùng khi user đã fill ảnh vào template. Có thể xem preview hoặc đặt in. |

---

## Thuật ngữ kinh doanh

| Thuật ngữ (VN) | Thuật ngữ (EN) | Định nghĩa |
|---|---|---|
| **Gói Hội viên** | Membership Plan | Gói đăng ký trả phí theo năm (PAUSE Go: 30k/năm, PAUSE Plus: 55k/năm, PAUSE Premium: 100k/năm), mở rộng hạn mức ngăn kéo (10, 25, 50 ngăn kéo), dung lượng đám mây (5GB - 20GB), và mở khóa toàn bộ VIP photobooth templates. |
| **Hội viên** | Member | Người dùng đã nâng cấp và đang sử dụng một trong các gói hội viên có hiệu lực. |
| **Free tier** | Free Tier | Cấp sử dụng miễn phí mặc định: 3 ngăn kéo, tối đa 50 ảnh / ngăn kéo, sử dụng các template miễn phí tiêu chuẩn. |
| **Thanh toán VietQR / PayOS** | App-to-App Payment | Phương thức thanh toán chuyển khoản ngân hàng NAPAS 24/7 tích hợp mở trực tiếp App ngân hàng và tự động đối soát nhận diện thành công không cần thao tác tay. |
| **Đơn hàng in** | Print Order | Yêu cầu in photobooth thành sản phẩm vật lý. Bao gồm thông tin template, ảnh, số lượng, địa chỉ giao hàng. |
| **Template VIP / Premium** | Premium Template | Template photobooth thiết kế độc quyền, mở khóa toàn diện cho tất cả các tài khoản đã nâng cấp Hội viên. |

---

## Thuật ngữ quyền hạn

| Thuật ngữ (VN) | Thuật ngữ (EN) | Định nghĩa |
|---|---|---|
| **Chủ sở hữu** | Owner | Người tạo ra ngăn kéo. Có toàn quyền: xem, sửa, xóa, chia sẻ. |
| **Quyền Xem** | View Permission | Cho phép người được chia sẻ xem ảnh trong ngăn kéo nhưng không thể upload/xóa. |
| **Quyền Chỉnh sửa** | Edit Permission | Cho phép người được chia sẻ xem + upload ảnh + chỉnh sửa thông tin ngăn kéo. |
| **Lời mời chia sẻ** | Share Invitation | Yêu cầu chia sẻ ngăn kéo được gửi từ chủ sở hữu đến người khác. |

---

## Thuật ngữ kỹ thuật

| Thuật ngữ | Định nghĩa |
|---|---|
| **Supabase** | Backend-as-a-Service platform cung cấp database (PostgreSQL), authentication, file storage, và edge functions. |
| **RLS (Row Level Security)** | Chính sách bảo mật cấp hàng (row) trong PostgreSQL, đảm bảo user chỉ truy cập data được phép. |
| **Signed URL** | URL tạm thời có chữ ký số, cho phép truy cập file private trong Storage với thời hạn giới hạn. |
| **JWT (JSON Web Token)** | Token xác thực được mã hóa, chứa thông tin user, dùng để xác thực các API call. |
| **Edge Function** | Serverless function chạy trên Supabase Edge, dùng để xử lý business logic phía server. |
| **Thumbnail** | Ảnh thu nhỏ được tạo tự động khi upload, dùng để hiển thị nhanh trong grid view. |
| **Batch Upload** | Upload nhiều ảnh cùng lúc trong một lần thao tác. |

---

## Thuật ngữ trạng thái

### Trạng thái đơn hàng in

| Trạng thái (VN) | Trạng thái (EN) | Mô tả |
|---|---|---|
| Chờ xác nhận | Pending | Đơn hàng vừa được tạo, chờ admin/hệ thống xác nhận |
| Đang xử lý | Processing | Đơn hàng đã được xác nhận, đang chuẩn bị file in |
| Đang in | Printing | File đã được gửi cho đối tác in, đang in |
| Đang giao | Shipping | Sản phẩm đã in xong, đang giao hàng |
| Hoàn thành | Completed | Giao hàng thành công |
| Đã hủy | Cancelled | Đơn hàng bị hủy (bởi user hoặc admin) |

### Trạng thái gói hội viên

| Trạng thái (VN) | Trạng thái (EN) | Mô tả |
|---|---|---|
| Đang hoạt động | Active | Gói hội viên đang có hiệu lực |
| Hết hạn | Expired | Gói hội viên đã hết thời hạn sử dụng |
| Đã hủy | Cancelled | Gói hội viên bị hủy bởi user trước khi hết hạn |
