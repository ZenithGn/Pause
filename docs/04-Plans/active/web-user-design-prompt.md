# Design & Implementation Prompt – Pause Web User (`app/web-user`)

> **Mục đích file**: Tài liệu prompt thiết kế & đặc tả kỹ thuật chi tiết cho website giới thiệu sản phẩm **Pause Web User** (`app/web-user`), tách biệt hoàn toàn với trang quản trị `app/web-admin`.
> **Cách dùng**: Đưa nguyên file này cho AI coding agent (hoặc `/swarm`) khi bắt đầu khởi tạo và xây dựng `app/web-user` trên nhánh `webapp-dev`.
> **Tham chiếu gốc**: [AGENTS.md](../../../AGENTS.md), [DESIGN.md](../../../DESIGN.md), [production.md](../../01-BA/production.md), [system-design.md](../../02-Architecture/system-design.md), [db-schema.md](../../03-References/db-schema.md).
> **Prompt chi tiết dựng Model 3D Three.js**: [web-user-3d-models-prompt.md](web-user-3d-models-prompt.md)

---

## 1. Vai trò, Phạm vi & Ràng buộc Kỹ thuật

### 1.1 Vai trò của `app/web-user`
Website công khai (public marketing + interactive 3D showcase) dành cho khách truy cập (Guest / User tiềm năng) của **Pause — *"Dừng lại, lưu giữ, hiện thực hóa kỷ niệm"***:
- Giới thiệu tầm nhìn, tính năng Ngăn kéo Kỷ niệm, quy trình in Photobooth và bảng giá gói Hội viên.
- Cho phép khách **chọn mẫu in Photobooth, tải ảnh từ máy xem thử trực tiếp trên mô hình 3D xoay 360° (Three.js)** ngay trên trình duyệt.
- Dẫn người dùng sang trang tải ứng dụng Android Mobile.

### 1.2 Phạm vi loại trừ (BẮT BUỘC theo `AGENTS.md`)
- **KHÔNG** chứa trang `/admin`, **KHÔNG** chứa logic đăng nhập/tạo ngăn kéo/đặt in/thanh toán (toàn bộ nghiệp vụ core thuộc Mobile App `app/mobile`).
- **KHÔNG** bao giờ dùng `SUPABASE_SERVICE_ROLE_KEY` hoặc `CLOUDINARY_API_SECRET`. Chỉ được dùng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` để đọc công khai `photobooth_templates` (`is_active = true`) và `membership_plans` (`is_active = true`), luôn có **fallback dữ liệu tĩnh** nếu không cấu hình env để trang chạy ổn định 100%.
- Ảnh người dùng chọn ở trang Preview 3D **chỉ xử lý 100% ở phía trình duyệt (client-side via `FileReader` / `URL.createObjectURL` + Canvas2D)**, **KHÔNG** upload lên server hay Cloudinary — đảm bảo quyền riêng tư tuyệt đối và phản hồi tức thì.

### 1.3 Tech Stack bắt buộc
| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Next.js 15+ (App Router)** + **TypeScript (`strict: true`)** | Server Components mặc định, `"use client"` chỉ cho phần 3D, scroll listener và tương tác preview |
| Port local | `next dev -p 3001` | Tránh xung đột port `3000` của `app/web-admin` |
| Styling | **Vanilla CSS + CSS Modules (`*.module.css`)** | **TUYỆT ĐỐI KHÔNG cài hay dùng TailwindCSS** (theo `AGENTS.md`) |
| 3D Engine | **Three.js** (`three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`) | Dynamic import (`ssr: false`) cho mọi `<Canvas>` để tránh lỗi SSR/hydration |
| Icons | `lucide-react` | Nét mảnh đồng bộ với `app/web-admin` |
| Dữ liệu công khai | `@supabase/supabase-js` (anon key, read-only) | ISR / revalidate + fallback data chuẩn |
| Ngôn ngữ | Code & comment: **Tiếng Anh** · Nội dung UI: **Tiếng Việt** tự nhiên, tinh tế | Tiền tệ: `VNĐ` / `đ` |

---

## 2. Hệ thống Nhận diện & Màu sắc (3-Color Editorial Palette)

Kế thừa trọn vẹn bản sắc từ `app/web-admin` & `DESIGN.md` (Đỏ rượu vang + Trắng), bổ sung **màu nhấn thứ 3: Vàng đồng Champagne cổ điển (`#C59B38`)** mang tinh thần ép kim photobooth & chi tiết kim loại trên máy ảnh film cổ điển.

### 2.1 Bảng màu chuẩn (`src/styles/tokens.css`)

| Vai trò | Tên token | Mã màu | Quy tắc sử dụng |
|---|---|---|---|
| **Chủ đạo 1 – Đỏ rượu vang** | `--color-wine` | `#630D11` | CTA chính, nền Hero darkroom, tiêu đề nhấn, logo mark, nút chụp máy ảnh 3D |
| Đỏ rượu vang đậm (hover/hero) | `--color-wine-deep` | `#3B0609` | Nền Hero gradient sâu, hover CTA, bóng ấm |
| Đỏ rượu vang nhạt | `--color-wine-soft` | `#FDF2F2` | Nền chip nhẹ, highlight trạng thái đang chọn |
| **Chủ đạo 2 – Trắng & Giấy ngà** | `--color-white` | `#FFFFFF` | Card, nền bề mặt sạch, chữ trên nền Đỏ rượu vang, viền ảnh Photobooth |
| Nền giấy ấm (Warm Paper) | `--color-paper` | `#F7F6F5` | Nền trang tổng thể (tạo cảm giác giấy ảnh thủ công) |
| Mực in (Ink) | `--color-ink` | `#111111` | Tiêu đề đậm trên nền sáng, độ tương phản cao (≥ 14:1) |
| Chữ phụ (Muted Ink) | `--color-ink-muted` | `#595552` | Mô tả phụ, metadata, phụ đề |
| Viền mảnh (Hairline) | `--color-line` | `#E5E2DF` | Đường chia editorial `1px solid`, khung card |
| **Màu nhấn thứ 3 – Vàng đồng cổ điển** | `--color-gold` | `#C59B38` | Nhấn chi tiết tinh tế: vòng kim loại/nút đồng trên máy ảnh 3D, badge **VIP / Phổ biến**, đường kẻ accent, trạng thái bước đang chọn, họa tiết ép kim mặt sau ảnh in |
| Vàng đồng sáng (foil highlight) | `--color-gold-bright` | `#D4AF37` | Hiệu ứng ánh kim trên nền Đỏ rượu vang / tối (contrast ≥ 4.5:1 cho chữ lớn / icon) |
| Vàng đồng nhạt (container) | `--color-gold-soft` | `#FBF5E6` | Nền nhẹ cho thẻ gói **PAUSE Plus** khuyên dùng hoặc chip VIP |

> **Quy tắc tỷ lệ màu (60 – 30 – 10)**: ~60% Trắng & Giấy ngà (`#FFFFFF`/`#F7F6F5`), ~30% Đỏ rượu vang (`#630D11`/`#3B0609`) & Mực in (`#111111`), ~10% Vàng đồng (`#C59B38`/`#D4AF37`). **Không dùng neon, không dùng gradient cầu vồng, không lạm dụng đổ bóng đen nặng.**

### 2.2 Typography
- **Display / Editorial Headlines**: `Playfair Display` (weight `600`, `700`, italic cho từ nhấn cảm xúc) — dùng cho Hero H1, tiêu đề các section lớn, trích dẫn thương hiệu.
- **UI / Body / Pricing / Controls**: `Be Vietnam Pro` (weight `400`, `500`, `600`, `700`) — tối ưu dấu tiếng Việt, sạch và dễ đọc.
- Load qua `next/font/google` kèm fallback hệ thống (`Georgia, serif` và `system-ui, sans-serif`) để đảm bảo build offline không lỗi.

---

## 3. Cấu trúc Điều hướng (Navbar) & Sơ đồ Trang

### 3.1 Navbar cố định (ĐÚNG 3 link theo yêu cầu)
Thanh điều hướng sticky ở đầu trang (`height: 72px`, căn lề container tối đa `1280px`):
- **Trái**: Thương hiệu **Pause** (biểu tượng vuông bo góc đỏ rượu vang chữ `P` + wordmark `Pause` font `Playfair Display`). Bấm về `/`.
- **Phải / Giữa – Đúng 3 đường dẫn chính**:
  1. **Trang chủ** (`/`)
  2. **Preview mẫu in** (`/preview`) — kèm chấm nhấn nhỏ màu Vàng đồng `#C59B38` thể hiện trải nghiệm 3D tương tác
  3. **Tải phần mềm** (`/download`) — tạo kiểu nút pill nổi bật (`background: #630D11`, chữ trắng; trên nền Hero đỏ rượu vang chuyển sang nền trắng chữ `#630D11` hoặc viền Vàng đồng `#D4AF37`)
- **Hành vi theo scroll**:
  - Trên đỉnh Hero trang chủ: nền trong suốt chữ trắng tinh tế.
  - Khi cuộn qua Hero (hoặc ở các trang `/preview`, `/download`): chuyển sang nền `rgba(255, 255, 255, 0.92)` + `backdrop-filter: blur(12px)` + viền đáy `1px solid #E5E2DF`, chữ `#111111`, link đang active có gạch chân mảnh màu `#C59B38`.
- **Mobile (`< 768px`)**: Giữ gọn logo + nút menu mở drawer trượt chứa đủ 3 link.

### 3.2 Sơ đồ 3 trang chính
1. `/` — **Trang chủ (Home)**: Hero lớn + Model Máy ảnh 3D bám suốt cuộn trang + Giới thiệu Ngăn kéo & Photobooth + Quy trình 3 bước + Teaser Preview 3D + Bảng giá Membership + CTA tải app + Footer.
2. `/preview` — **Studio Preview Mẫu In 3D**: Chọn mẫu in + Sân khấu 3D xoay 360° (Three.js) + Chọn ảnh từ máy để xem ảnh thật nằm trong mẫu in + Tùy chỉnh caption, loại bìa, loại giấy.
3. `/download` — **Tải phần mềm**: Tải app Android APK / Google Play, mã QR quét nhanh, yêu cầu thiết bị, hướng dẫn cài đặt 3 bước, FAQ.

---

## 4. Đặc tả Chi tiết Trang Chủ (`/`) & Model Máy Ảnh 3D theo Scroll

### 4.1 Kiến trúc Scroll-Choreographed 3D Camera (Three.js)
- **Lớp 3D cố định (`CameraScrollStage.tsx`)**:
  - Một `<Canvas>` Three.js (`dpr={[1, 2]}`, `antialias: true`, `alpha: true`) gắn `position: fixed; inset: 0; pointer-events: none; z-index: 5;` chỉ chạy trong phạm vi trang Home (hoặc bọc trong wrapper `position: relative` cùng `<div className={styles.stickyCanvas}>` với `position: sticky; top: 0; height: 100vh;` để không đè lên Footer!).
  - **Cấu trúc nội dung DOM** nằm trên lớp `z-index: 10`, chừa khoảng trống đối xứng (trái/phải luân phiên theo từng section) để model máy ảnh 3D di chuyển qua lại hài hòa mà **không bao giờ che khuất chữ**.
- **Thiết kế Model Máy Ảnh Cổ Điển 3D (`VintageCameraModel.tsx`)**:
  - Xây dựng bằng **Procedural Three.js Geometry** (tải tức thì, không phụ thuộc file `.glb` bên ngoài; đồng thời tách component sạch để sau này có thể đổi sang `useGLTF('/models/camera.glb')` trong 1 dòng nếu có file 3D riêng):
    - **Thân máy (Body)**: Khối bo cạnh phong cách rangefinder cổ điển, phần giữa bọc da nhám màu đen than (`#1A1818`, `roughness: 0.85`) hoặc đỏ rượu vang trầm (`#4B090C`), nắp trên & đáy bằng hợp kim bạc ấm (`#EAE6E1`, `metalness: 0.85, roughness: 0.25`).
    - **Cụm ống kính (Lens Barrel)**: Nhiều vòng trụ đồng tâm có vòng chia khẩu độ ánh **Vàng đồng (`#C59B38`, `metalness: 0.9, roughness: 0.2`)** + thấu kính cong phía trước dùng `MeshPhysicalMaterial` (`transmission: 0.65`, `ior: 1.5`, `reflectivity: 0.9`, ánh phản chiếu tím-rượu nhẹ).
    - **Chi tiết nhấn thương hiệu**: Nút bấm chụp (Shutter button) màu **Đỏ rượu vang (`#630D11`)** có vòng cổ màu Vàng đồng; bánh xe xoay tốc độ có khía; kính ngắm viewfinder nhỏ; logo chữ `P` hoặc sọc đỏ rượu vang tinh tế ở mặt trước.
  - **Ánh sáng (Studio Lighting)**: `ambientLight` nhẹ ấm, `directionalLight` chính trắng ngà, `spotLight` rim ánh **Vàng đồng (`#F5D07A`)** và ánh phụ Đỏ rượu vang nhẹ tạo chiều sâu sang trọng.
- **Kịch bản chuyển động theo tiến trình cuộn (`scrollProgress: 0.0 → 1.0`)** — nội suy mượt bằng `THREE.MathUtils.damp` trong `useFrame`:

| Đoạn Scroll | Section tương ứng | Vị trí & Tư thế Model 3D |
|---|---|---|
| `0.00 → 0.20` | **Hero Section** (nền tối Đỏ rượu vang lớn) | Bên **phải** (`x: +1.7, y: 0.05, z: 0.3`), góc nghiêng 3/4 khoe ống kính & nút chụp đỏ rượu vang, chuyển động nổi nhẹ (gentle float) và nghiêng rất nhẹ theo con trỏ chuột (parallax ≤ 6°). |
| `0.20 → 0.44` | **Giới thiệu & Ngăn kéo Kỷ niệm** (nền Trắng/Paper, nội dung bên phải) | Trượt mượt sang **trái** (`x: -1.85, y: 0.0, z: 0.1`), xoay ngang hướng ống kính về khối chữ bên phải như đang "ghi lại" câu chuyện. |
| `0.44 → 0.66` | **In Photobooth 3 bước & Teaser Preview 3D** (nền Paper, nội dung bên trái) | Trượt sang **phải** (`x: +1.8, y: -0.05, z: 0.25`), xoay góc nghiêng nghệ thuật từ trên xuống (top-down 25°), hiện thêm một tấm dải ảnh Photobooth mini bo viền trắng trượt nhẹ ra bên cạnh thân máy. |
| `0.66 → 0.86` | **Bảng giá Gói Hội viên (Membership)** (nền Trắng, 4 cột rộng) | Thu nhỏ nhẹ & lùi về góc trên-phải mờ nhẹ (`scale: 0.65`, `x: +2.3, y: +0.9, z: -0.6`) để **tuyệt đối không che 4 thẻ bảng giá**. |
| `0.86 → 1.00` | **CTA Tải Ứng Dụng** (nền Đỏ rượu vang trầm) | Tiến lại vị trí cân đối bên **phải** (`x: +1.6, y: 0.0, z: 0.2`), xoay gần chính diện ống kính nhìn thẳng người dùng kèm ánh sáng vàng đồng ấm. |

- **Responsive & Accessibility cho 3D trên Home**:
  - Trên mobile (`< 900px`): chỉ hiển thị model 3D gọn trong vùng Hero (không fixed đè chữ khi scroll các section dưới) để giữ độ mượt pin/FPS và đọc chữ rõ ràng.
  - Khi người dùng bật `prefers-reduced-motion: reduce`: khóa model ở góc tĩnh đẹp, tắt hiệu ứng bay lơ lửng.
  - Bọc `WebGLErrorBoundary`: nếu trình duyệt tắt WebGL, hiển thị hình minh họa SVG/CSS phong cách editorial sạch sẽ.

### 4.2 Nội dung các Section trên Trang Chủ (`/`)
1. **Hero Full-Screen (`min-height: 100svh`)**:
   - **Background lớn**: Nền Đỏ rượu vang đậm chuyển sắc sâu (`radial-gradient` tinh tế từ `#7A1419` → `#4A090D` → `#240305`) phủ lớp vân film grain cực mảnh (`opacity: 0.05`) + khung đường kẻ editorial mảnh màu vàng đồng mờ (`rgba(212, 175, 55, 0.22)`).
   - **Nội dung bên trái** (tối đa 560px):
     - Eyebrow tag viền Vàng đồng: `LƯU TRỮ KỶ NIỆM & IN PHOTOBOOTH`
     - Tiêu đề H1 (`Playfair Display`, `clamp(2.5rem, 5vw, 4.25rem)`): **Dừng lại, lưu giữ, *hiện thực hóa* kỷ niệm.** *(chữ "hiện thực hóa" in nghiêng màu `#D4AF37`)*
     - Mô tả ngắn: *"Tổ chức ảnh theo từng Ngăn kéo kỷ niệm, chia sẻ cùng người thương và biến khoảnh khắc số thành dải ảnh Photobooth cầm tay chỉ trong 3 bước."*
     - 2 nút CTA:
       - Chính (nền Trắng, chữ Đỏ rượu vang): **Thử mẫu in 3D** → `/preview`
       - Phụ (viền Vàng đồng `#D4AF37`, chữ Trắng): **Tải ứng dụng Android** → `/download`
     - Dải chỉ số ngắn bên dưới: `Miễn phí 3 ngăn kéo` · `50 ảnh / ngăn kéo` · `In ấn giao tận nơi`
2. **Section Giới thiệu – "Không chỉ là thư viện ảnh, mà là Ngăn kéo Kỷ niệm"**:
   - Bố cục lệch phải (nhường không gian trái cho máy ảnh 3D).
   - 3 thẻ tính năng tinh gọn (viền `1px solid #E5E2DF`, icon màu `#630D11` / `#C59B38`):
     - **Ngăn kéo theo chủ đề**: Tách biệt kỷ niệm Đà Lạt, kỷ niệm 1 năm, ảnh gia đình khỏi ảnh công việc lộn xộn.
     - **Chia sẻ phân quyền (Xem / Chỉnh sửa)**: Mời bạn bè, người yêu qua email cùng góp ảnh vào 1 ngăn kéo chung.
     - **Chuyển hóa thành bản in thật**: Chọn mẫu thiết kế sẵn, ghép ảnh từ ngăn kéo và đặt in giao tận nhà, thanh toán VietQR/PayOS hoặc COD.
3. **Section Quy trình 3 bước + Teaser Preview 3D**:
   - Bố cục lệch trái (nhường không gian phải cho máy ảnh 3D).
   - 3 bước đánh số `01`, `02`, `03` bằng font Serif màu Vàng đồng `#C59B38`:
     1. **Chọn mẫu Photobooth** (Cổ điển, Vintage, Minimal, Polaroid, VIP Gold...)
     2. **Fill ảnh từ Ngăn kéo** (tự căn khung chuẩn tỷ lệ, thêm lời nhắn kỷ niệm)
     3. **Đặt in & Nhận tận tay** (chọn loại giấy mỹ thuật 200gsm, bìa cứng/mềm, theo dõi đơn realtime)
   - Khối Callout nổi bật mời bấm nút **Trải nghiệm xoay mẫu in 3D ngay →** (`/preview`).
4. **Section Gói Hội Viên (Membership Pricing)** *(đọc từ Supabase `membership_plans` active, có fallback đúng bảng giá sản phẩm)*:
   - Tiêu đề: **Lưu giữ nhiều hơn với Gói Hội viên Pause** + phụ đề: *"Thanh toán 1 lần mỗi năm — mở khóa 100% kho mẫu Photobooth VIP."*
   - Lưới 4 thẻ cân đối (Free + 3 gói năm theo `production.md` & `storage-strategy.md`):
     - **Miễn phí (Free)**: `0đ` — 3 ngăn kéo, tối đa 50 ảnh/ngăn kéo, mẫu cơ bản.
     - **PAUSE Go**: `30.000đ / năm` — 10 ngăn kéo, 5 GB/năm, mở khóa 100% VIP Templates.
     - **PAUSE Plus** *(thẻ nổi bật nhất: viền `2px solid #C59B38`, nền `#FBF5E6`, badge `PHỔ BIẾN NHẤT` màu Đỏ rượu vang chữ Vàng đồng)*: `55.000đ / năm` — 25 ngăn kéo, 10 GB/năm, mở khóa 100% VIP Templates, chia sẻ không giới hạn.
     - **PAUSE Premium**: `100.000đ / năm` — 50 ngăn kéo, 20 GB/năm, mở khóa 100% VIP Templates & ưu đãi in ấn tối đa.
   - Nút dưới mỗi gói dẫn tới `/download` (vì đăng ký gói thực hiện trực tiếp trong app Mobile).
5. **Section CTA cuối trang & Footer**:
   - Banner nền Đỏ rượu vang đậm: *"Sẵn sàng mở ngăn kéo kỷ niệm đầu tiên?"* + 2 nút (`Tải ứng dụng` & `Preview mẫu in 3D`).
   - Footer tối giản nền `#111111` chữ `#EAE6E1`: Logo Pause, slogan, 3 link điều hướng chính, thông tin dự án FPT University EXE, liên hệ & mục Điều khoản / Bảo mật.

---

## 5. Đặc tả Chi tiết Trang Preview Mẫu In 3D (`/preview`)

Đây là tính năng điểm nhấn cốt lõi của `app/web-user`: cho phép người dùng **chọn mẫu in → xem vật thể in 3D xoay 360° → tải ảnh cá nhân lên xem ngay ảnh của mình nằm trong mẫu in trông như thế nào**.

### 5.1 Bố cục màn hình (`PreviewStudio.tsx`)
- **Desktop (`>= 1024px`)**: Split view toàn chiều cao dưới Navbar (`min-height: calc(100vh - 72px)`):
  - **Cột trái (~60% – Sân khấu 3D)**: Nền studio giấy ngà sáng dịu có ánh đèn tròn ấm phía sau, chứa `<Canvas>` Three.js + thanh công cụ góc nhìn nổi phía dưới sân khấu.
  - **Cột phải (~40% – Bảng tùy chỉnh cuộn độc lập)**: Nền trắng `#FFFFFF`, viền trái `1px solid #E5E2DF`, chia rõ 3 khu vực bằng tab hoặc bước tuần tự: **1. Chọn mẫu in** · **2. Chọn ảnh & Chữ** · **3. Chất liệu & Đặt in**.
- **Mobile / Tablet (`< 1024px`)**: Sân khấu 3D ghim ở nửa trên (`height: 48vh`, tối thiểu `340px`), bảng điều khiển cuộn ở nửa dưới.

### 5.2 Sân khấu 3D Mẫu In (`PrintPreviewScene3D.tsx`)
- **Mô hình vật thể bản in 3D thật (không dùng mặt phẳng 2D)**:
  - Tạo hình khối giấy in 3D (`BoxGeometry` hoặc `ExtrudeGeometry` bo góc nhẹ) theo đúng tỷ lệ `layout_config.width / layout_config.height` của mẫu đang chọn (ví dụ `1200×1800` → tỷ lệ `2:3`, `1200×1200` → vuông `1:1`).
  - **Độ dày vật lý thật** thay đổi trực quan theo tùy chọn của người dùng:
    - `Bìa mềm (Soft)`: độ dày mảnh (`depth ~ 0.018`), giấy nhẹ.
    - `Bìa cứng cao cấp (Hard)`: độ dày rõ rệt (`depth ~ 0.055`), cạnh giấy trắng kem / ánh vàng đồng tinh tế.
  - **Chất liệu giấy (`MeshStandardMaterial` / `MeshPhysicalMaterial`)**:
    - `Giấy tiêu chuẩn (Standard)`: `roughness: 0.72`, `metalness: 0.02` (mịn mờ tự nhiên).
    - `Giấy mỹ thuật cao cấp 200gsm (Premium)`: `roughness: 0.42`, `clearcoat: 0.25`, `clearcoatRoughness: 0.35` (bắt ánh sáng nhẹ kiểu ảnh in phòng lab, kèm bump/roughness texture hạt giấy tinh tế tạo bằng procedural canvas).
  - **6 mặt vật liệu của tấm ảnh in**:
    - **Mặt trước (`front`)**: `THREE.CanvasTexture` độ phân giải cao (tối thiểu `1200×1800` hoặc tỷ lệ tương ứng, `colorSpace = THREE.SRGBColorSpace`, `anisotropy = 8`) được vẽ động từ `renderTemplateToCanvas(...)`:
      - Đổ màu nền `layout_config.background_color`.
      - Với từng slot trong `layout_config.slots`:
        - Nếu người dùng đã chọn ảnh → vẽ ảnh theo đúng thuật toán **center-crop / cover** (`crop-fill`, giữ đúng tỷ lệ không méo ảnh — giống hệt `AndroidPhotoboothRenderer` trên mobile!).
        - Nếu slot chưa có ảnh → vẽ khung placeholder thanh lịch có số thứ tự `Ảnh 1`, `Ảnh 2`, biểu tượng máy ảnh mảnh nét và dòng *"Chọn ảnh bên phải"*.
      - Vẽ lớp `frame_url` (nếu có, hỗ trợ CORS an toàn).
      - Vẽ các dòng `layout_config.texts` + **Caption tùy chỉnh** của người dùng ở vị trí text chính.
    - **Mặt sau (`back`)**: `THREE.CanvasTexture` mặt lưng giấy ảnh thủ công màu giấy kem ấm (`#FAF7F2`) hoặc đen nhám (với mẫu Premium Gold), in watermark tinh tế **PAUSE · MEMORY STUDIO**, đường khung mảnh màu Vàng đồng `#C59B38` và ngày hôm nay — để khi người dùng **xoay 360° ra mặt sau** có cảm giác chân thực như đang cầm sản phẩm thật trên tay.
    - **4 cạnh viền (`sides`)**: Màu mép giấy dày (`#F0ECE6` hoặc ánh vàng đồng `#C59B38` cho bản Premium Gold).
- **Hiệu ứng chuyển đổi khi đổi mẫu**: Khi user chọn mẫu khác, tấm ảnh 3D xoay nhẹ 1 nhịp + scale đàn hồi êm (`damp`) sang kích thước & texture mới.
- **Điều khiển 3D & Thanh công cụ sân khấu**:
  - `OrbitControls`: kéo chuột / vuốt tay để **xoay tự do 360°**, cuộn để **phóng to/thu nhỏ** (`minDistance`, `maxDistance` khóa gọn không bị bay mất vật thể), bật `enableDamping`.
  - Thanh nút nhanh phía dưới sân khấu:
    - `Mặt trước` · `Mặt sau` · `Góc 3/4` (camera chuyển góc mượt mà)
    - `Tự xoay` (bật/tắt xoay nhẹ trưng bày)
    - `Ánh sáng: Sáng studio / Đèn vàng ấm` (giúp người dùng soi màu ảnh in dưới 2 môi trường sáng)
    - `Tải ảnh xem thử (PNG)` (xuất nhanh mặt trước bản ghép ảnh đang xem nếu muốn)

### 5.3 Luồng Chọn Mẫu In & Chọn Ảnh của Người Dùng
1. **Chọn mẫu in**:
   - Đọc từ Supabase `photobooth_templates` (`is_active = true`), fallback 6 mẫu chuẩn từ DB:
     1. `Classic White` (`couple`, 2 ảnh, Miễn phí)
     2. `Vintage Memories` (`friends`, 4 ảnh, Miễn phí)
     3. `Minimal Strip` (`general`, 3 ảnh, Miễn phí)
     4. `Pastel Grid` (`friends`, 4 ảnh, Miễn phí)
     5. `Family Portrait` (`family`, 1 ảnh vuông, Miễn phí)
     6. `Premium Gold` (`couple`, 4 ảnh, **VIP** — nền đen chữ vàng đồng `#D4AF37`)
   - Chip lọc nhanh: `Tất cả`, `Cặp đôi`, `Bạn bè`, `Gia đình`, `Chung`, `Mẫu VIP`.
   - Thẻ chọn mẫu hiển thị thumbnail SVG/preview mini đúng bố cục slot, tên mẫu, số ảnh (`2 ảnh`, `4 ảnh`...), badge `VIP` màu Vàng đồng nếu `is_premium = true`, viền active `#630D11`.
2. **Chọn ảnh để xem trên mẫu in 3D**:
   - Khi đổi mẫu (ví dụ từ mẫu 2 ảnh sang mẫu 4 ảnh), **giữ lại các ảnh người dùng đã chọn** ở các slot đầu để không phải chọn lại từ đầu!
   - **Nút chọn nhiều ảnh cùng lúc (`Chọn ảnh từ máy`)** + **Kéo-thả ảnh (Drag & Drop)**: chấp nhận `image/jpeg`, `image/png`, `image/webp`; tự động điền tuần tự vào các slot còn trống.
   - **Danh sách từng Slot (`Slot 1`, `Slot 2`, ...)**: mỗi slot hiển thị thumbnail ảnh đã chọn, nút **Đổi ảnh**, nút **Đổi chỗ (lên/xuống)**, nút **Xóa ảnh**.
   - **Nút "Điền ảnh mẫu nhanh"** & **"Xóa toàn bộ ảnh"**: tích hợp sẵn 4 ảnh minh họa mẫu phong cách hoài niệm (SVG/canvas hoặc ảnh local trong `public/samples/`) để người dùng có thể bấm 1 nút xem ngay kết quả 3D đẹp mắt dù chưa chọn ảnh từ máy.
   - **Ghi chú quyền riêng tư** nhỏ màu dịu: *"Ảnh chỉ hiển thị trực tiếp trên trình duyệt của bạn, không tải lên máy chủ."*
3. **Tùy chỉnh chữ, chất liệu & ước tính giá**:
   - Ô nhập **Lời nhắn / Chú thích in trên khung** (cập nhật ngay lập tức lên mặt trước 3D).
   - Chọn **Loại bìa**: `Bìa mềm` (+0đ) / `Bìa cứng cao cấp` (+15.000đ) — thay đổi độ dày khối 3D tức thì.
   - Chọn **Loại giấy**: `Giấy tiêu chuẩn` (+0đ) / `Giấy mỹ thuật 200gsm` (+10.000đ) — thay đổi độ bóng/vân giấy 3D tức thì.
   - Hiển thị **Giá in ước tính** (ví dụ từ `20.000đ – 55.000đ` tùy số lượng slot & tùy chọn) + cảnh báo nhỏ màu Vàng đồng nếu chọn mẫu VIP (*"Mẫu VIP được mở khóa miễn phí khi đăng ký gói PAUSE Go trở lên trên app"*).
   - Nút CTA lớn màu Đỏ rượu vang: **Tải App Pause để đặt in mẫu này** → `/download`.

---

## 6. Đặc tả Trang Tải Phần Mềm (`/download`)

- **Hero gọn 2 cột** (nền giấy ngà `#F7F6F5` với thẻ nhấn Đỏ rượu vang):
  - Trái: Tiêu đề `Playfair Display` *"Mang cả phòng ảnh Photobooth vào túi bạn"*, phiên bản hiện tại (`v0.1.0 · Android 8.0+`), nút lớn **Tải file APK Android** (đọc link từ `NEXT_PUBLIC_ANDROID_APK_URL`, có trạng thái thông báo rõ nếu đang ở bản beta) + nút phụ **Google Play (Sắp ra mắt)**.
  - Phải: Thẻ **Quét mã QR bằng điện thoại** (render QR bằng SVG sạch dẫn tới link tải) + thẻ tóm tắt ưu điểm (Lưu trữ an toàn, Thanh toán VietQR/PayOS tự động, Giao hàng toàn quốc).
- **Hướng dẫn cài đặt 3 bước** (Tải APK → Cho phép cài đặt ứng dụng → Đăng nhập & mở Ngăn kéo đầu tiên).
- **FAQ ngắn (Accordion thuần CSS/React)**: 4 câu hỏi phổ biến (Ảnh lưu ở đâu có an toàn không? Gói Free dùng được gì? Thanh toán thế nào? Thời gian in & giao hàng bao lâu?).

---

## 7. Cấu trúc Thư mục Đề xuất (`app/web-user/`)

```text
app/web-user/
├── package.json                       # next, react, three, @react-three/fiber, @react-three/drei, lucide-react, @supabase/supabase-js
├── next.config.ts                     # security headers + image remotePatterns
├── tsconfig.json                      # strict: true, alias @/*
├── vercel.json                        # framework: nextjs, regions: ["sin1"]
├── .env.example                       # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ANDROID_APK_URL
├── public/
│   └── samples/                       # 4 ảnh mẫu đẹp nhẹ cho nút "Điền ảnh mẫu nhanh"
└── src/
    ├── styles/
    │   ├── tokens.css                 # 3-color palette: Wine (#630D11), White/Paper (#FFF/#F7F6F5), Gold (#C59B38)
    │   └── globals.css
    ├── lib/
    │   ├── supabase-public.ts         # Anon-only read client (templates + membership_plans)
    │   ├── catalog-data.ts            # Fetch Supabase + fallback 6 templates & 4 pricing tiers
    │   └── template-canvas.ts         # Pure Canvas2D renderer (front crop-fill + back watermark) -> THREE.CanvasTexture
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.tsx             # Đúng 3 links: Trang chủ, Preview mẫu in, Tải phần mềm
    │   │   ├── Navbar.module.css
    │   │   ├── Footer.tsx
    │   │   └── Footer.module.css
    │   └── three/
    │       ├── WebGLErrorBoundary.tsx
    │       ├── VintageCameraModel.tsx # Procedural 3D camera (Wine + Silver + Gold details)
    │       ├── CameraScrollStage.tsx  # Scroll-choreographed 3D stage cho trang Home
    │       └── PrintPreviewScene3D.tsx# Sân khấu 3D xoay 360° cho trang Preview mẫu in
    ├── features/
    │   ├── home/                      # HeroSection, FeaturesSection, ProcessSection, PricingSection, DownloadCtaSection
    │   ├── preview/                   # PreviewStudio, TemplateSelector, PhotoSlotManager, MaterialControls
    │   └── download/                  # DownloadHero, InstallSteps, DownloadFaq
    └── app/
        ├── layout.tsx                 # Playfair Display + Be Vietnam Pro + Navbar + Footer
        ├── page.tsx                   # Trang chủ (/)
        ├── preview/page.tsx           # Preview mẫu in 3D (/preview)
        └── download/page.tsx          # Tải phần mềm (/download)
```

---

## 8. Tiêu chuẩn Nghiệm thu (Acceptance Criteria)

- [ ] **Navbar**: Hiển thị đúng 3 link **Trang chủ** (`/`), **Preview mẫu in** (`/preview`), **Tải phần mềm** (`/download`) + logo Pause; chuyển màu mượt theo scroll.
- [ ] **Bảng màu & Typography**: Nhất quán 3 màu chủ đạo **Đỏ rượu vang (`#630D11`)**, **Trắng / Giấy ngà (`#FFFFFF` / `#F7F6F5`)**, và **Vàng đồng cổ điển (`#C59B38` / `#D4AF37`)**; font `Playfair Display` + `Be Vietnam Pro`; **0% TailwindCSS** (chỉ dùng CSS Modules).
- [ ] **Trang Home (`/`)**: Hero nền Đỏ rượu vang lớn giàu chiều sâu; model máy ảnh 3D (Three.js) di chuyển, xoay mượt theo cuộn trang qua từng section mà không che chữ; đầy đủ phần giới thiệu Ngăn kéo, quy trình 3 bước, bảng giá 4 gói (Free, Go 30k, Plus 55k, Premium 100k) và CTA tải app.
- [ ] **Trang Preview 3D (`/preview`)**:
  - Chọn được tất cả mẫu in (đọc từ Supabase hoặc fallback 6 mẫu chuẩn), lọc theo category / VIP.
  - Mẫu in hiển thị dạng **vật thể 3D có độ dày thật + mặt trước & mặt sau**, xoay tự do 360° & zoom mượt bằng chuột/cảm ứng.
  - Chọn ảnh từ máy (1 ảnh hoặc nhiều ảnh / kéo-thả) hoặc bấm *"Điền ảnh mẫu nhanh"* → ảnh hiển thị đúng tỷ lệ **crop-fill** ngay lập tức trên mẫu 3D, đổi vị trí/xóa slot được, sửa caption cập nhật realtime, đổi Bìa cứng/mềm & Giấy tiêu chuẩn/mỹ thuật phản ánh trực tiếp trên độ dày & độ bóng vật liệu 3D.
  - Giải phóng bộ nhớ đúng cách (`URL.revokeObjectURL` và `texture.dispose()`) khi thay ảnh/đổi mẫu để không rò rỉ RAM/WebGL.
- [ ] **Trang Download (`/download`)**: Nút tải APK, mã QR, hướng dẫn cài đặt 3 bước, FAQ.
- [ ] **Kiểm tra kỹ thuật**: `npm run typecheck`, `npm run lint`, `npm run build` trong `app/web-user` pass 100%, không lỗi hydration SSR với Three.js, không lộ bất kỳ biến bí mật nào.
- [ ] **CI/CD**: Bổ sung workflow `.github/workflows/ci-web-user.yml` (tương tự `ci-web-admin.yml`) khi hoàn thiện code.
