# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

- **Đối tượng chính**: Giới trẻ (18–30 tuổi), học sinh, sinh viên, các cặp đôi, nhóm bạn thân và gia đình trẻ.
- **Bối cảnh sử dụng**: Muốn lưu giữ những khoảnh khắc kỷ niệm có ý nghĩa (chuyến du lịch, lễ tốt nghiệp, hẹn hò, sinh nhật) một cách gọn gàng, có tổ chức thay vì để trôi dạt giữa hàng nghìn bức ảnh chụp màn hình hay tài liệu trên điện thoại.
- **Nhu cầu cốt lõi (Jobs to be done)**:
  - Gom và phân loại ảnh kỷ niệm vào từng "Ngăn kéo" riêng biệt theo chủ đề.
  - Tự thiết kế nhanh các dải ảnh photobooth cổ điển/retro từ ảnh trong ngăn kéo.
  - Đặt in ấn sản phẩm vật lý (dải photostrip, ảnh polaroid, photobook) giao tận tay với chi phí hợp lý.
  - Chia sẻ ngăn kéo ảnh với bạn bè/người yêu với quyền Xem hoặc Chỉnh sửa rõ ràng.

## Product Purpose

- **Pause** là nền tảng kết hợp giữa **lưu trữ kỷ niệm số** và **in ấn photobooth theo yêu cầu (print-on-demand)**.
- Sản phẩm ra đời để giải quyết tình trạng "chụp nhiều nhưng lãng quên nhiều" trong thời đại số, đồng thời đón đầu xu hướng yêu thích ảnh in vật lý phong cách retro của thế hệ trẻ.
- **Đo lường thành công**: Đạt phiên bản MVP hoàn chỉnh cho dự án khởi nghiệp EXE tại FPT University, đảm bảo trải nghiệm người dùng liền mạch từ lưu trữ ngăn kéo, ghép khung ảnh photobooth đến thanh toán chuyển khoản ngân hàng thật qua VietQR App-to-App.

## Positioning

- **Khác biệt cốt lõi**: Pause là cầu nối liền mạch duy nhất giữa không gian lưu trữ ngăn kéo riêng tư (tối đa 50 ảnh/ngăn kéo) và xưởng in ấn photobooth vật lý, kết hợp cổng thanh toán VietQR / PayOS tự động nhận diện tiền về khi quay lại app mà không cần đối soát thủ công.

## Operating Context

- **Thiết bị**: Điện thoại thông minh Android (hỗ trợ từ Android 8.0 / SDK 26 trở lên).
- **Môi trường sử dụng**: Thao tác một tay trên màn hình cảm ứng, xem lướt ảnh nhanh, trải nghiệm chọn ảnh và preview khung ảnh trực quan.
- **Luồng thanh toán di động**: Người dùng chọn in hoặc nâng cấp gói -> bấm "Mở App Ngân hàng" -> chuyển khoản trên ứng dụng ngân hàng (MB, VCB, Momo...) -> quay lại Pause -> hệ thống tự động hoàn tất và hiển thị kết quả.

## Capabilities and Constraints

- **Ngăn kéo (Memory Drawers)**:
  - Miễn phí 3 ngăn kéo, mỗi ngăn kéo lưu tối đa 50 ảnh chất lượng cao.
  - Hỗ trợ đổi ảnh bìa (thumbnail/cover) cho ngăn kéo từ bất kỳ bức ảnh nào bên trong.
  - Phân quyền chia sẻ ngăn kéo thông qua lời mời (Xem / Chỉnh sửa).
- **Gói Hội viên (Membership Plans)**:
  - Không bán lẻ ngăn kéo; cung cấp 3 gói nâng cấp hàng năm:
    - **PAUSE Go**: 30.000 VNĐ/năm – 10 ngăn kéo, 5GB lưu trữ đám mây.
    - **PAUSE Plus**: 55.000 VNĐ/năm – 25 ngăn kéo, 10GB lưu trữ đám mây (Gợi ý).
    - **PAUSE Premium**: 100.000 VNĐ/năm – 50 ngăn kéo, 20GB lưu trữ đám mây.
  - Tất cả các gói nâng cấp đều mở khóa 100% kho mẫu khung ảnh VIP (VIP Photobooth Templates).
- **Photobooth & In ấn**:
  - Chọn template photobooth có sẵn (2–4 khung hình), fill ảnh trực tiếp từ ngăn kéo, render preview độ phân giải cao.
  - Đặt in với các tùy chọn giấy (tiêu chuẩn / mỹ thuật) và loại bìa, hỗ trợ giao hàng COD hoặc chuyển khoản VietQR.
- **Ràng buộc kiến trúc**:
  - Client: Kotlin + Jetpack Compose + Koin DI + Coil + Room Cache.
  - Backend: Supabase (Auth, PostgreSQL RLS, Storage, Edge Functions).
  - Storage: Cloudinary (ảnh ngăn kéo và preview photobooth) + Supabase Storage (avatar).

## Brand Commitments

- **Tên thương hiệu**: Pause – *"Dừng lại, lưu giữ, hiện thực hóa kỷ niệm"*.
- **Tính cách thương hiệu**: Hoài niệm (nostalgic), ấm áp, tinh tế, tối giản, đáng tin cậy.
- **Màu sắc nhận diện cốt lõi**:
  - Màu rượu vang (Pause Wine: `#722F37` / `#8B263E`) – điểm nhấn cảm xúc, nút hành động chính, huy hiệu nổi bật.
  - Màu giấy ngà ấm (Paper / Warm background: `#FBF9F5` / `#F8F6F0`) – nền trang thanh lịch, nhẹ mắt.
  - Màu mực in đậm (Ink: `#1C1917`) – chữ và đường viền rõ nét.
  - Màu đường kẻ tinh tế (Line: `#E7E5E4`).
- **Nguyên tắc UI**: Theo sát hệ thống Figma designs đã được thiết kế sẵn cho luồng Mobile User.

## Evidence on Hand

- Mã nguồn ứng dụng di động hoàn chỉnh tại [app/mobile/](app/mobile).
- Tài liệu BA, SRS và kiến trúc hệ thống tại [docs/](docs).
- Hệ thống cơ sở dữ liệu và hàm RPC tại [supabase/migrations/](supabase/migrations).
- Bộ thiết kế màn hình giao diện Figma cho toàn bộ các luồng Người dùng.

## Product Principles

1. **Kỷ niệm là tâm điểm**: Giao diện luôn tôn vinh bức ảnh và cảm xúc của người dùng, không để các thành phần trang trí lấn át nội dung kỷ niệm.
2. **Một chạm để hiện thực hóa**: Tối giản hóa quy trình biến ảnh số trong ngăn kéo thành sản phẩm in photobooth vật lý chỉ trong vài thao tác trực quan.
3. **Rõ ràng và minh bạch**: Số lượng ảnh (x/50 ảnh), dung lượng, chi phí in ấn và trạng thái chuyển khoản ngân hàng luôn hiển thị chính xác theo thời gian thực.
4. **Riêng tư và an toàn**: Mọi ngăn kéo mặc định là vùng lưu trữ cá nhân; chỉ người được chủ sở hữu gửi lời mời và chấp nhận mới có quyền truy cập.

## Accessibility & Inclusion

- Độ tương phản chữ và nền đạt chuẩn WCAG (Contrast ratio ≥ 4.5:1).
- Hỗ trợ Dynamic Font Scaling trên thiết bị Android mà không làm vỡ bố cục giao diện.
- Toàn bộ nhãn, điều hướng và thông báo hiển thị bằng tiếng Việt chuẩn hóa, rõ nghĩa, thân thiện.

