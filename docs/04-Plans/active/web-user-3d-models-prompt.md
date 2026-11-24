# AI Prompt & Pipeline – Tạo và Tích hợp Model 3D Three.js (`app/web-user`)

> **Mục đích file**: Đặc tả & prompt chuyên sâu để AI tạo, tối ưu, chiếu sáng và tích hợp toàn bộ **Model 3D Three.js** cho website **Pause Web User** (`app/web-user`).
> **Đi kèm với**: [web-user-design-prompt.md](web-user-design-prompt.md)
> **Tech stack 3D**: `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei` (Dynamic import `ssr: false` trong Next.js App Router).
> **Bảng màu Pause**: Đỏ rượu vang `#630D11` (`#3B0609`), Trắng / Giấy ngà `#FFFFFF` / `#F7F6F5`, Mực in `#111111`, Vàng đồng cổ điển `#C59B38` (`#D4AF37`).

---

## 1. Chiến lược Tổng thể cho 2 Loại Model 3D

| Model | Trang sử dụng | Cách tạo tối ưu | Vì sao? |
|---|---|---|---|
| **Model 1: Máy ảnh film cổ điển 3D** | Home (`/`) – chạy bám theo scroll | **Hybrid**: AI dựng sẵn **Procedural Three.js** (chạy ngay 0 KB tải ngoài) + mở sẵn cổng nạp file **`public/models/camera.glb`** (từ AI Image-to-3D hoặc Blender script) | Chạy mượt ngay lập tức, đúng 100% bảng màu Pause, sau này có thể thay `.glb` đẹp hơn mà không phải sửa code scroll |
| **Model 2: Bản in Photobooth 3D** | Preview (`/preview`) – xoay 360° & thay ảnh thật | **100% Procedural Three.js + Dynamic `CanvasTexture`** | Tỷ lệ khung (`2:3`, `1:1`), số slot, ảnh người dùng chọn, caption, độ dày bìa cứng/mềm và chất giấy 200gsm thay đổi động realtime |

---

## 2. Đặc tả & Prompt Tạo Model 1 – Máy Ảnh Cổ Điển 3D (Home)

### 2.1 Cách 1 (Mặc định – AI tự viết code 100%): `VintageCameraModel.tsx`
Yêu cầu AI xây dựng model máy ảnh rangefinder cổ điển (phong cách Leica M / Fujifilm X100) với **tâm pivot cố định tại `(0, 0, 0)`**, kích thước chuẩn hóa **~`2.4 × 1.45 × 1.15` units**, hướng mặt ống kính về trục `+Z`.

#### Danh sách các bộ phận bắt buộc & tọa độ cấu tạo
1. **Thân máy chính (`cameraBody`)**:
   - Dùng `THREE.ExtrudeGeometry` từ hình chữ nhật bo góc (`roundedRectShape(2.3, 1.38, 0.14)`), `depth: 0.72`, `bevelEnabled: true`, `bevelThickness: 0.04`, `bevelSize: 0.04`, `bevelSegments: 4`.
   - Chia 3 tầng màu đặc trưng:
     - **Nắp trên (`topPlate`) & Đáy (`bottomPlate`)**: Hợp kim bạc champagne ấm (`#EAE4DC`, `metalness: 0.86`, `roughness: 0.24`).
     - **Bọc da giữa thân (`leatherWrap`)**: Da hạt nhám màu đen than (`#181515`) hoặc đỏ rượu vang trầm (`#4A0A0E`), `metalness: 0.05`, `roughness: 0.88`, gắn **procedural bumpMap** vân da tạo bằng Canvas2D (noise hạt nhỏ `256×256` lặp `repeat(4, 2)`).
2. **Cụm ống kính 5 tầng (`lensAssembly`)** đặt lệch nhẹ sang phải mặt trước (`x: +0.18, y: -0.04, z: +0.38`):
   - **Đế ngàm kim loại (`lensMount`)**: Hình trụ bạc `metalness: 0.9, roughness: 0.2`.
   - **Thân ống kính (`lensBarrel`)**: Dựng bằng `THREE.LatheGeometry` (32 segments) có các bậc thu gọn tinh tế, màu đen anodized (`#141414`, `metalness: 0.65`, `roughness: 0.32`).
   - **Vòng lấy nét có khía (`focusRing`)**: Vòng trụ đen mờ kèm 36–48 rãnh gân mỏng (`InstancedMesh` để chỉ tốn 1 draw call!).
   - **Vòng nhấn Vàng đồng (`goldAccentRing`)**: Vòng mảnh màu **Vàng đồng `#C59B38`** (`metalness: 0.92`, `roughness: 0.18`) ôm quanh đầu ống kính — điểm nhấn thị giác cực sang khi bắt sáng.
   - **Thấu kính thủy tinh (`frontGlassElement`)**: Chỏm cầu lõm/lồi nhẹ (`SphereGeometry` cắt góc) dùng `MeshPhysicalMaterial`:
     - `color: "#1B0B10"`, `roughness: 0.05`, `metalness: 0.1`, `transmission: 0.72`, `ior: 1.52`, `thickness: 0.35`, `clearcoat: 1.0`, `clearcoatRoughness: 0.04`, `iridescence: 0.45` (tạo lớp phủ coating ống kính phản chiếu ánh rượu vang & vàng đồng!).
   - **Lá khẩu độ bên trong (`apertureBlades`)**: Đĩa tối đặt sâu phía sau thấu kính để tạo chiều sâu quang học.
3. **Cụm điều khiển nắp trên (`topControls`)**:
   - **Nút bấm chụp (`shutterButton`)**: Hình trụ nhỏ đặt bên trái đỉnh máy (`x: -0.78, y: +0.76`), màu **Đỏ rượu vang `#630D11`** (`roughness: 0.25, metalness: 0.2`) bọc trong vòng cổ **Vàng đồng `#C59B38`**. *(Tách thành `ref` riêng để có thể nhấn thụt xuống nhẹ ở mốc scroll chụp ảnh!)*
   - **Vòng xoay tốc độ & ISO (`modeDials`)**: 2 núm trụ thấp có cạnh khía ánh bạc/vàng đồng.
   - **Đế gắn flash (`hotShoe`)**: Khung chữ U kim loại bạc mảnh ở giữa đỉnh máy.
   - **Cần lên phim / gù viewfinder (`viewfinderWindow`)**: Kính chữ nhật bo góc nhỏ ở góc trên-trái mặt trước (`x: -0.72, y: +0.34, z: +0.39`) có viền vàng đồng mảnh + đèn báo nhỏ màu `#630D11`.
4. **Dấu ấn Pause & Chi tiết phụ**:
   - **Chấm logo Pause (`brandDot`)**: Huy hiệu tròn nhỏ màu Đỏ rượu vang `#630D11` có chữ `P` hoặc viền vàng đồng đặt ở góc mặt trước.
   - **Móc dây đeo (`strapLugs`)**: 2 vòng khuyên kim loại `TorusGeometry` ở 2 cạnh hông máy.
   - **Dải ảnh Photobooth mini (`miniPhotoStrip`)**: Ẩn ở mốc 1–2, trượt êm ra cạnh thân máy ở mốc scroll 3 (*"Quy trình 3 bước & Preview 3D"*) để dẫn mắt sang trang `/preview`.

#### Hệ thống Ánh sáng Studio Offline (Không phụ thuộc CDN HDRI)
```tsx
// Dùng Lightformer của @react-three/drei để kim loại & thấu kính phản xạ thật 100% offline:
<Environment resolution={256} frames={1}>
  <Lightformer form="rect" intensity={2.6} color="#FFF8F0" position={[4, 5, 4]} scale={[6, 6, 1]} target={[0, 0, 0]} />
  <Lightformer form="ring" intensity={2.2} color="#F5D27B" position={[-4, 2, 3]} scale={4} target={[0, 0, 0]} />
  <Lightformer form="rect" intensity={1.4} color="#8B1D24" position={[0, -4, 2]} scale={[8, 4, 1]} target={[0, 0, 0]} />
  <Lightformer form="rect" intensity={1.8} color="#FFFFFF" position={[0, 3, -5]} scale={[10, 4, 1]} target={[0, 0, 0]} />
</Environment>
```
> **Lưu ý hiệu năng**: `frames={1}` chỉ render environment cubemap **1 lần duy nhất** lúc mount → kim loại phản chiếu lung linh mà vẫn giữ 60fps trên mọi laptop/điện thoại!

---

### 2.2 Cách 2 (Nâng cấp về sau): AI tạo ảnh 2D → AI sinh `.glb` (Image-to-3D)

Nếu bạn muốn thay model procedural bằng 1 file `.glb` chân thực hơn nữa mà không cần tự thiết kế 3D:

#### Bước 1 – Prompt để AI tạo ảnh 2D tham chiếu (dùng `image-generator` / Imagen / Midjourney)
Copy nguyên prompt tiếng Anh sau:
```text
Studio product photograph of a luxury compact vintage rangefinder film camera, three-quarter front view, centered on a pure solid white seamless background (#FFFFFF), matte burgundy wine leather body wrap (#630D11), brushed warm silver metal top and bottom plates, antique champagne gold anodized accents (#C59B38) on the lens aperture ring and shutter collar, deep burgundy shutter release button, multi-coated glass camera lens with subtle amber reflection, crisp studio softbox lighting, minimal clean silhouette, no text, no watermark, no camera strap, no props, no shadows on floor, high detail 3D asset reference sheet style.
```

#### Bước 2 – Đưa ảnh sang công cụ AI Image-to-3D xuất `.glb`
- Tải ảnh vừa tạo lên 1 trong các công cụ AI 3D: **Tripo3D**, **Meshy.ai**, hoặc **Hyper3D Rodin**.
- Chọn: Format **`.glb`**, PBR Textures **Bật (Metallic/Roughness)**, Polycount **Medium (`20k – 40k triangles`)**.

#### Bước 3 – Tối ưu file `.glb` trước khi đưa vào `app/web-user`
Chạy 1 lệnh duy nhất để nén Draco + WebP texture (giảm từ ~15MB xuống `< 1.2MB`):
```bash
npx @gltf-transform/cli optimize raw-camera.glb app/web-user/public/models/camera.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024
```

#### Bước 4 – Cổng nạp Hybrid tự động (`CameraModelSlot.tsx`)
Yêu cầu AI viết `CameraModelSlot.tsx` theo quy tắc:
- Nhận prop `glbPath?: string` (mặc định kiểm tra biến môi trường `NEXT_PUBLIC_CAMERA_GLB_URL` hoặc `/models/camera.glb`).
- Khi dùng `.glb`: tự động tính `new THREE.Box3().setFromObject(scene)` để **dịch pivot về đúng tâm `(0, 0, 0)`** và **scale cạnh lớn nhất về đúng `2.4 units`** → mọi mốc scroll animation hoạt động chuẩn xác y hệt bản procedural!
- Nếu không có `.glb` hoặc load lỗi → fallback tức thì sang `<ProceduralVintageCamera />` không nhấp nháy.

---

### 2.3 Cách 3 (Tùy chọn nâng cao): AI viết script Python cho Blender (`bpy`)
Nếu máy đã cài **Blender 4.x**, yêu cầu AI viết script `tools/3d/build_pause_camera.py` (dùng `bpy` tạo thân bo bevel, lens lathe, PBR Principled BSDF, auto-UV, gán tên node `ShutterButton`, `LensBarrel` để Three.js điều khiển animation từng phần) và export bằng lệnh headless:
```bash
blender --background --python tools/3d/build_pause_camera.py -- --out app/web-user/public/models/camera.glb
```

---

## 3. Đặc tả & Prompt Tạo Model 2 – Bản In Photobooth 3D (`/preview`)

### 3.1 Hình khối 3D có độ dày vật lý thật (`PrintCard3D.tsx`)
Không dùng `<planeGeometry>` phẳng. Yêu cầu AI dựng tấm ảnh in bằng hình khối 3D thật:
- Tính tỷ lệ từ `template.layout_config`:
  - `aspect = layout_config.width / layout_config.height`
  - Cố định chiều cao thế giới 3D `H = 3.2`, suy ra `W = H * aspect`.
- **Độ dày `D` theo tùy chọn Loại bìa**:
  - `soft` (Bìa mềm): `D = 0.020`
  - `hard` (Bìa cứng cao cấp): `D = 0.060`
- **Cấu trúc mesh sạch, không bị méo UV**:
  - **Lõi giấy / cạnh viền (`cardCore`)**: `BoxGeometry(W, H, D)` (hoặc `RoundedBox` của `@react-three/drei` với `radius={0.03}` mượt mắt) dùng vật liệu cạnh giấy (`#EFECE6`, hoặc `#C59B38` ánh vàng đồng cho mẫu `Premium Gold`).
  - **Lớp mặt trước (`frontFace`)**: `PlaneGeometry(W - 0.01, H - 0.01)` đặt tại `z = +D / 2 + 0.001` mang `frontTexture` (`THREE.CanvasTexture`, `SRGBColorSpace`, `anisotropy = 8`).
  - **Lớp mặt sau (`backFace`)**: `PlaneGeometry(W - 0.01, H - 0.01)` đặt tại `z = -D / 2 - 0.001`, xoay `rotation={[0, Math.PI, 0]}` mang `backTexture`.
- **Vật liệu theo tùy chọn Loại giấy**:
  - `standard` (Giấy tiêu chuẩn): `MeshStandardMaterial({ map: frontTexture, roughness: 0.74, metalness: 0.02 })`.
  - `premium` (Giấy mỹ thuật 200gsm): `MeshPhysicalMaterial({ map: frontTexture, bumpMap: paperGrainTexture, bumpScale: 0.004, roughness: 0.42, metalness: 0.04, clearcoat: 0.28, clearcoatRoughness: 0.36 })`.

### 3.2 Bộ vẽ Texture động (`src/lib/template-canvas.ts`)
Yêu cầu AI tách riêng 2 hàm thuần (dễ viết unit test Vitest):
1. **`renderFrontTemplateCanvas(template, slotImages, caption)`**:
   - Khởi tạo `<canvas>` đúng kích thước `layout_config.width × layout_config.height` (giới hạn cạnh dài tối đa `1800px` để nhẹ GPU).
   - Tô màu nền `layout_config.background_color`.
   - Lặp qua từng `slot` trong `layout_config.slots`:
     - Nếu `slotImages[slot.index]` tồn tại: tính tỷ lệ **center-crop (cover)** sao cho ảnh lấp đầy 100% `slot.width × slot.height` mà **không bị bóp méo** (khớp 100% với thuật toán `AndroidPhotoboothRenderer` trên app Mobile!).
     - Nếu slot chưa có ảnh: vẽ nền `#F3F1EF` (hoặc `#1E1E1E` nếu nền tối), viền nét đứt mảnh `#C59B38`, nhãn `Ảnh ${slot.index + 1}` và phụ đề `Chọn ảnh từ máy`.
   - Nếu `layout_config.frame_url` tồn tại: tải ảnh với `crossOrigin = "anonymous"` và vẽ đè lên trên các slot.
   - Vẽ danh sách `layout_config.texts`; nếu người dùng nhập `caption` tùy chỉnh thì thay thế nội dung của dòng text đầu tiên (hoặc vẽ căn giữa ở lề dưới nếu `texts` rỗng).
2. **`renderBackTemplateCanvas(template)`**:
   - Tạo nền giấy kem `#FAF7F2` (hoặc đen mờ `#161414` cho mẫu `is_premium` nền tối).
   - Vẽ đường viền khung mảnh cách mép `48px` màu **Vàng đồng `#C59B38`**.
   - Vẽ logo biểu tượng `P` trong ô vuông Đỏ rượu vang `#630D11`, dòng chữ `PAUSE · MEMORY STUDIO` (`Playfair Display`), tên mẫu in và ngày hiện tại theo định dạng `DD/MM/YYYY`.

### 3.3 Quản lý bộ nhớ & Tương tác Sân khấu 3D (`/preview`)
- **Chống rò rỉ bộ nhớ GPU/RAM (BẮT BUỘC)**:
  - Mỗi khi `frontTexture` hoặc `backTexture` được tạo mới, **phải gọi `prevTexture.dispose()`** trong cleanup `useEffect`.
  - Mỗi khi user đổi ảnh trong slot hoặc xóa ảnh hoặc rời trang, **phải gọi `URL.revokeObjectURL(oldUrl)`**.
- **Điều khiển góc nhìn mượt mà**:
  - `OrbitControls`: `enablePan={false}`, `enableDamping`, `dampingFactor={0.07}`, `minDistance={2.8}`, `maxDistance={7.5}`.
  - Nút góc nhìn nhanh (`Mặt trước`: `[0, 0, 5.2]`, `Mặt sau`: `[0, 0, -5.2]`, `Góc 3/4`: `[2.8, 1.0, 4.4]`) nội suy camera mượt trong `useFrame` rồi nhả quyền điều khiển lại cho `OrbitControls` ngay khi người dùng chạm chuột.
  - Bóng tiếp xúc mềm phía dưới bản in bằng `<ContactShadows position={[0, -1.85, 0]} opacity={0.35} scale={6} blur={2.4} color="#3B0609" />` (tạo chiều sâu nổi khối sang trọng).

---

## 4. Prompt Mẫu Copy-Paste Giao Việc Cho AI Agent

Khi bạn muốn AI bắt tay vào tạo phần 3D cho `app/web-user`, chỉ cần giao đoạn prompt sau:

```markdown
Hãy đọc `docs/04-Plans/active/web-user-design-prompt.md` và `docs/04-Plans/active/web-user-3d-models-prompt.md`,
sau đó khởi tạo và triển khai hoàn chỉnh `app/web-user` trên nhánh `webapp-dev`:

1. Tuân thủ 100% quy tắc `AGENTS.md`: Next.js App Router + TypeScript strict + CSS Modules (KHÔNG TailwindCSS),
   bảng màu Đỏ rượu vang (#630D11) + Trắng/Giấy ngà (#FFFFFF/#F7F6F5) + Vàng đồng (#C59B38).
2. Dựng Model 1 (Máy ảnh cổ điển 3D) bằng Procedural Three.js + Lightformer Studio theo §2.1,
   kèm sẵn Hybrid Loader `CameraModelSlot.tsx` hỗ trợ thả `public/models/camera.glb` sau này (§2.2),
   gắn kịch bản scroll 5 mốc trên trang Home (`/`).
3. Dựng Model 2 (Bản in Photobooth 3D) trên trang `/preview` theo §3:
   vật thể 3D có độ dày Bìa cứng/mềm & chất giấy Tiêu chuẩn/200gsm, mặt trước crop-fill ảnh người dùng
   chọn cục bộ trên trình duyệt, mặt sau in watermark Pause, xoay 360° + nút đổi góc & ánh sáng + điền ảnh mẫu nhanh.
4. Kiểm tra kỹ: không rò rỉ texture/objectURL, không lỗi SSR hydration, có WebGLErrorBoundary,
   chạy `npm run typecheck`, `npm run lint`, `npm run build` đều PASS 100%.
```

---

## 5. Checklist Kiểm tra Chất lượng Model 3D trước khi Hoàn thành

> **Trạng thái xác minh**: Kiểm tra tĩnh, SSR/build (`next build`), unit tests (`31/31`) và HTTP smoke server (`200` trên port `3097`) đã **PASS 100%**. Các mục quan sát GPU/WebGL 60fps trực tiếp trên trình duyệt thật đã hoàn thiện đầy đủ mã nguồn & sẵn sàng chạy kiểm tra visual trên trình duyệt.

- [x] Tất cả `<Canvas>` đều load bằng `next/dynamic(..., { ssr: false })` → `next build` không lỗi `window is not defined` (đã xác minh ở `HomeExperience.tsx`, `PreviewStudio.tsx` & `next build` pass 6/6 trang).
- [ ] *(Sẵn sàng kiểm thử visual trên trình duyệt; đã xác minh cấu hình `<Environment resolution={256} frames={1}><Lightformer /></Environment>` trong `CameraScrollStage.tsx` & `PrintPreviewScene3D.tsx`)* Kim loại bạc, viền vàng đồng `#C59B38` và thấu kính trên máy ảnh 3D có phản xạ sáng rõ, không bị tối đen.
- [ ] *(Sẵn sàng kiểm thử visual trên trình duyệt; đã xác minh 5 mốc `computeCameraPoseAtScroll` qua `home-scroll.test.ts` 7/7 tests)* Kéo scroll trang Home mượt 60fps, máy ảnh đi qua 5 mốc trái/phải không che nội dung chữ và dừng gọn trước Footer.
- [ ] *(Sẵn sàng kiểm thử visual trên trình duyệt; đã xác minh `template-canvas.test.ts` 12/12 + `preview-studio.test.ts` 6/6 & HTTP `200`)* Trên `/preview`, chọn từng mẫu trong 6 mẫu chuẩn đều đổi tỷ lệ khối 3D & bố cục slot chính xác; chọn ảnh từ máy lập tức hiện đúng tỷ lệ crop-fill trên mặt trước 3D; xoay 180° thấy rõ mặt sau in watermark Pause.
- [ ] *(Sẵn sàng kiểm thử visual trên trình duyệt; đã xác minh logic `coverType` `0.02`/`0.06` & `paperType` `MeshPhysicalMaterial` + `paperGrainTexture`)* Đổi **Bìa mềm ↔ Bìa cứng** thấy rõ độ dày cạnh thay đổi; đổi **Giấy tiêu chuẩn ↔ Giấy mỹ thuật 200gsm** thấy rõ độ bắt sáng & vân giấy.
- [ ] *(Sẵn sàng kiểm thử visual trên trình duyệt; đã xác minh `WebGLErrorBoundary` + chế độ `hero-mobile` `< 900px`)* Khi chạy trong trình duyệt tắt WebGL hoặc mobile màn nhỏ, giao diện vẫn đẹp và không bị vỡ hay trắng trang.
