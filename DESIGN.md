---
name: Pause
description: Dừng lại, lưu giữ, hiện thực hóa kỷ niệm
colors:
  primary: "#630D11"
  primary-container: "#FDF2F2"
  surface: "#FFFFFF"
  neutral-bg: "#F7F6F5"
  ink: "#111111"
  charcoal: "#2B2B2B"
  muted: "#6B6B6B"
  line: "#E5E2DF"
  error: "#B3261E"
  gold-accent: "#D97706"
  gold-light: "#FEF3C7"
  blue-badge: "#2962FF"
typography:
  display:
    fontFamily: "Playfair Display, serif"
    fontSize: "36sp"
    fontWeight: 700
    lineHeight: "44sp"
    letterSpacing: "-0.5sp"
  headline:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "24sp"
    fontWeight: 700
    lineHeight: "32sp"
  title:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "18sp"
    fontWeight: 600
    lineHeight: "26sp"
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "14sp"
    fontWeight: 400
    lineHeight: "20sp"
  label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "12sp"
    fontWeight: 500
    lineHeight: "16sp"
rounded:
  xs: "6dp"
  sm: "10dp"
  md: "14dp"
  lg: "20dp"
  xl: "28dp"
spacing:
  xs: "4dp"
  sm: "8dp"
  md: "16dp"
  lg: "24dp"
  xl: "32dp"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12dp 24dp"
  button-secondary:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12dp 24dp"
  card-drawer:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
---

# Design System – Pause

## Overview

Pause là nền tảng kết hợp giữa lưu trữ kỷ niệm số (tối đa 50 ảnh/ngăn kéo) và in ấn photobooth theo yêu cầu. Bản sắc thị giác của Pause mang hơi hướng hoài niệm (nostalgic), ấm áp, tinh tế và tối giản kiểu editorial. Giao diện được xây dựng trên Jetpack Compose và tuân thủ Material Design 3, tôn vinh hình ảnh và khoảnh khắc của người dùng qua tông màu rượu vang trầm (Wine), giấy ngà ấm (Paper) và mực in tương phản (Ink).

## Colors

- **Primary (`#630D11`) - Pause Wine**: Màu đỏ rượu vang đậm, là điểm nhấn cảm xúc cho thương hiệu, dùng cho các nút hành động chính (Primary CTA), trạng thái kích hoạt, biểu tượng nổi bật và badge VIP.
- **Primary Container (`#FDF2F2`) - Wine Light**: Tông đỏ rượu nhạt dùng làm nền cho các badge, thông báo thành công hoặc trạng thái được chọn nhẹ nhàng.
- **Background (`#F7F6F5`) - Paper**: Nền giấy thủ công ấm, tạo cảm giác xúc giác như đang lật mở một cuốn sổ lưu niệm thay vì màn hình kỹ thuật số lạnh lùng.
- **Surface (`#FFFFFF`) - Clean Surface**: Nền cho các thẻ (Cards), danh sách ngăn kéo và Bottom Sheet giúp tách bạch nội dung trên nền giấy.
- **Text & Stroke (`#111111`) - Ink**: Màu mực in đậm sắc nét cho tiêu đề chính, đảm bảo độ tương phản cao và sự trang trọng.
- **Text Secondary (`#2B2B2B` & `#6B6B6B`) - Charcoal & Muted**: Dùng cho mô tả phụ, nhãn phụ, ngày tháng và metadata.
- **Outline (`#E5E2DF`) - Line**: Đường viền ngăn cách thanh mảnh, tạo cấu trúc tinh tế mà không gây nặng nề.
- **Functional Accents**:
  - `Error` (`#B3261E`): Cảnh báo lỗi, cảnh báo đầy bộ nhớ/hạn mức.
  - `Gold Accent` (`#D97706`) & `Gold Light` (`#FEF3C7`): Nhận diện gói Hội viên và ưu đãi VIP.
  - `Blue Badge` (`#2962FF`): Thẻ trạng thái chia sẻ hoặc liên kết ngoài.

## Typography

Hệ thống chữ kết hợp hài hòa giữa chất cổ điển (Editorial Serif) và tính hiện đại, rõ ràng (Geometric Sans-serif) hỗ trợ hoàn hảo tiếng Việt:

1. **Display & Header Tiêu Đề**:
   - Font: `Playfair Display` (Serif).
   - Ứng dụng: Tiêu đề màn hình chính ("Tủ kỷ niệm của bạn", "Chọn template", logo Splash), mang lại phong thái trang nhã, hoài niệm.
2. **UI & Nội dung (Body, Labels, Controls)**:
   - Font: `Be Vietnam Pro` (Sans-serif tối ưu cho tiếng Việt).
   - Headline / Title: Cỡ 16sp – 24sp, SemiBold / Bold cho tên ngăn kéo, giá tiền, tên template.
   - Body: Cỡ 14sp – 16sp, Regular / Medium cho văn bản mô tả, hướng dẫn, chi tiết đơn hàng.
   - Label: Cỡ 11sp – 12sp, Medium / SemiBold cho chip, badge phân quyền ("Của tôi", "Được chia sẻ") và bottom bar tabs.
3. **Quy tắc Font**: Luôn sử dụng đơn vị `sp` (không dùng fixed px), hỗ trợ đầy đủ Android Dynamic Font Scaling mà không xô lệch giao diện.

## Layout

- **Hệ thống lưới và lề**:
  - Horizontal margin chuẩn: `16dp` hoặc `20dp` hai bên màn hình.
  - Item spacing: `12dp` – `14dp` cho danh sách thẻ dọc; `10dp` – `12dp` cho hàng ngang carousel.
- **Bố cục màn hình**:
  - Top Bar: Chứa ngữ cảnh màn hình, icon back (nếu là màn con) và hành động chính (nút Add `+`).
  - Content Area: Dạng cuộn mượt mà (`LazyColumn` / `LazyVerticalGrid`), luôn chừa padding đáy `80dp` để tránh bị Bottom Navigation Bar che khuất.
  - Bottom Navigation Bar: Cố định 4 tabs chuẩn tiếng Việt: **Trang chủ**, **Sản phẩm in**, **Ngăn kéo**, **Tôi**.
  - Edge-to-edge: Tích hợp đầy đủ WindowInsets (`statusBars`, `navigationBars`, `ime`) cho trải nghiệm toàn màn hình hiện đại.

## Elevation & Depth

- Tránh sử dụng drop shadow tùy tiện hoặc bóng đổ đen đậm không tự nhiên.
- Độ sâu được biểu đạt qua **Tonal Elevation** của Material 3 kết hợp cùng đường viền mảnh `1.dp` viền quanh thẻ với màu `Line (#E5E2DF)`.
- Các lớp bề mặt nổi bật (như Bottom Sheet, Dialog xác nhận thanh toán) sử dụng độ cao nhẹ `2.dp` – `4.dp` hoặc scrim đen mờ `40%` để tập trung sự chú ý.

## Shapes

- **Corner Radius**:
  - Extra Small (`6dp`): Chip trạng thái nhỏ, badge số lượng ảnh.
  - Small (`10dp`): Nút bấm tiêu chuẩn (Buttons), Text fields.
  - Medium (`14dp` – `16dp`): Thẻ ngăn kéo (Drawer cards), khung ảnh preview photobooth.
  - Large (`20dp`): Hộp thoại Dialog, Container nâng cấp gói, Banner chính.
  - Full / Circle: Nút hành động nổi (FAB), nút tròn thêm ngăn kéo (`+`), avatar.
- **Form Language**: Đường cong mềm mại nhưng dứt khoát, mang lại cảm giác thân thiện, thanh lịch.

## Components

1. **Nút bấm (Buttons)**:
   - Primary Button: Nền `Wine (#630D11)` hoặc `Ink (#111111)`, chữ trắng, chiều cao tối thiểu `48dp`, bo góc `10dp`.
   - Secondary / Tonal Button: Nền `BannerBg` hoặc `WineLight`, chữ `Wine` hoặc `Ink`.
   - Outline Button: Viền mảnh `1.dp` màu `Line`, chữ `Charcoal`.
2. **Thẻ ngăn kéo (Drawer Cards)**:
   - Thumbnail vuông bo góc `12dp` bên trái (hiển thị ảnh bìa được chỉ định hoặc placeholder chữ "P").
   - Tiêu đề ngăn kéo in đậm (`Ink`), kèm nhãn phân quyền ("Của tôi" / "Được chia sẻ") ở góc phải.
   - Thanh tiến độ dung lượng `LinearProgressIndicator` thể hiện tỉ lệ số ảnh (x / 50 ảnh) rõ ràng.
3. **Thẻ Hạn mức (Storage Quota Card)**:
   - Nằm trên đầu danh sách ngăn kéo, thể hiện số lượng tủ (x / 3 tủ đối với gói Free) và nút kêu gọi nâng cấp gói Hội viên ("Nâng cấp gói Hội viên (chỉ từ 30k/năm)").
4. **Photobooth Strip Preview**:
   - Mô phỏng chính xác dải ảnh in thực tế: viền trắng cổ điển, tỉ lệ chuẩn, khoảng cách giữa các khung ảnh đều đặn.

## Do's and Don'ts

### Do's:
- **Tôn trọng chuẩn Material 3 trên Android**: Đảm bảo vùng chạm (touch target) tối thiểu `48x48 dp` cho mọi tương tác.
- **Đồng bộ hóa tên gọi và nhãn**: Giữ đúng từ ngữ tiếng Việt đã được thống nhất ("Ngăn kéo", "Sản phẩm in", "Tôi", "Hạn mức").
- **Tập trung vào ảnh**: Ảnh kỷ niệm và preview photobooth phải luôn sắc nét, đúng tỉ lệ tỉ lệ khung hình (aspect ratio).
- **Hỗ trợ System Back**: Xử lý mượt mà cử chỉ Back của Android và nút quay lại ở Top Bar.

### Don'ts:
- **Không dùng style iOS**: Không sử dụng switch kiểu Cupertino, thanh điều hướng kéo mờ hoặc bottom bar rỗng chân kiểu iOS.
- **Không hardcode chuỗi hiển thị**: Toàn bộ chuỗi ngôn ngữ hiển thị phải nằm trong `strings.xml` để sẵn sàng cho bản địa hóa.
- **Không lạm dụng màu sắc sặc sỡ**: Tránh các dải màu neon hoặc gradient phức tạp; giữ vững bảng màu trầm ấm, hoài niệm của thương hiệu Pause.
- **Không dùng px cứng cho kích thước chữ**: Luôn dùng `sp` để tôn trọng thiết lập cỡ chữ của người dùng trên hệ điều hành.

