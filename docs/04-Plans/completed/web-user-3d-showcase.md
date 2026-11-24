# 🟢 Web User – Landing Page & 3D Showcase (`app/web-user`)

> **Module**: Pause Web User (`app/web-user` – Public Marketing, 3D Photobooth Studio & Download Portal)
> **Trạng thái**: 🟢 Hoàn thành triển khai, kiểm thử tĩnh/unit/build, quét bảo mật và smoke test production server trên nhánh `webapp-dev` (còn kiểm thử visual WebGL 60fps trực tiếp trên trình duyệt thật)
> **Kế hoạch gốc**: [web-user-design-prompt.md](../active/web-user-design-prompt.md) · [web-user-3d-models-prompt.md](../active/web-user-3d-models-prompt.md)
> **Kiến trúc & Quy tắc**: [AGENTS.md](../../../AGENTS.md) · [DESIGN.md](../../../DESIGN.md) · [folder-structure.md](../../02-Architecture/folder-structure.md) · [ci-cd-guide.md](../../02-Architecture/ci-cd-guide.md)
> **Design**: 3-Color Editorial Palette (**Đỏ rượu vang `#630D11`/`#3B0609`**, **Trắng & Giấy ngà `#FFFFFF`/`#F7F6F5`**, **Vàng đồng cổ điển `#C59B38`/`#D4AF37`**) · Font `Playfair Display` + `Be Vietnam Pro` · **0% TailwindCSS** (CSS Modules thuần + `tokens.css`)
> **Vitest (`app/web-user`)**: 31 passed / 0 failed (4 files) · **Cross-repo (`app/web-admin` + SQL)**: 105/105 Vitest + 149/149 SQL checks

---

## 1. Tóm tắt Kiến trúc & Phạm vi Đã Triển khai

| Phần | Nội dung |
|---|---|
| **Nền tảng & Bảo mật (`app/web-user`)** | Next.js `15.5.29` (App Router) + TypeScript `strict: true`, port local `3001`, 3-color design tokens (`src/styles/tokens.css`, `globals.css`), `next/font/google` (`Playfair Display`, `Be Vietnam Pro`), security headers trong `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`), `vercel.json` (`regions: ["sin1"]`). |
| **Dữ liệu công khai & Anon Client** | `src/lib/supabase-public.ts` chỉ sử dụng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only, `persistSession: false`, `revalidate: 60`); `src/lib/catalog-data.ts` đọc `photobooth_templates` (`is_active = true`) và `membership_plans` (`is_active = true`) với Zod validation + fallback deterministic `FALLBACK_TEMPLATES` (6 mẫu) & `OFFICIAL_MEMBERSHIP_TIERS` (4 gói). |
| **Điều hướng & Layout** | `Navbar.tsx` giữ đúng **3 link chính** (`/` Trang chủ, `/preview` Preview mẫu in có chấm vàng đồng, `/download` Tải phần mềm) + wordmark `Pause`, tự chuyển nền trong suốt → trắng mờ theo scroll, hỗ trợ drawer mobile + `Escape`; `Footer.tsx` tối giản nền `#111111`. |
| **Trang chủ (`/`) & Máy ảnh 3D theo Scroll** | `HomeExperience.tsx` bọc `CameraScrollStage.tsx` (`next/dynamic` `ssr: false`) qua 5 section (`HeroSection`, `FeaturesSection`, `ProcessSection`, `PricingSection`, `DownloadCtaSection`), dừng gọn trước Footer. `VintageCameraModel.tsx` dựng procedural rangefinder 3D (thân bọc da `createLeatherBumpCanvas`, nắp bạc `#EAE4DC`, cụm ống kính 5 tầng `LatheGeometry` + `InstancedMesh` 42 rãnh + `MeshPhysicalMaterial`, nút chụp `#630D11`, dải ảnh mini ở mốc 3), bọc trong `CameraModelSlot.tsx` (hỗ trợ nạp `.glb` chuẩn hóa kích thước 2.4 units khi có `NEXT_PUBLIC_CAMERA_GLB_URL`) và `WebGLErrorBoundary.tsx`. |
| **Studio Preview 3D (`/preview`)** | `PreviewStudio.tsx` chia 60/40 (Desktop) với 3 bước: `TemplateSelector.tsx` (lọc `Tất cả`/`Cặp đôi`/`Bạn bè`/`Gia đình`/`Chung`/`Mẫu VIP`, mini-map SVG theo `layout_config`), `PhotoSlotManager.tsx` (chọn nhiều ảnh, kéo-thả, đổi/đảo/xóa slot, *"Điền ảnh mẫu nhanh"* `/samples/sample-1..4.svg`, caption realtime, 100% client-side `URL.createObjectURL`), `MaterialControls.tsx` (`Bìa mềm` +0đ / `Bìa cứng` +15.000đ, `Giấy tiêu chuẩn` +0đ / `Giấy mỹ thuật 200gsm` +10.000đ, ước tính giá + CTA `/download`). `PrintPreviewScene3D.tsx` + `template-canvas.ts` render vật thể 3D `RoundedBox` có độ dày thật (`0.02` vs `0.06`), `CanvasTexture` mặt trước (`computeCenterCropRect` crop-fill không méo) + mặt sau watermark Pause, `paperGrainTexture` cho giấy 200gsm, `OrbitControls` + góc nhìn nhanh + ánh sáng Studio/Đèn vàng ấm, giải phóng `dispose()` và `URL.revokeObjectURL()`. |
| **Trang Tải Ứng Dụng (`/download`)** | `DownloadHero.tsx`, `DownloadActions.tsx`, `QrCodeCard.tsx` (render QR bằng inline SVG từ thư viện `qrcode`, copy link), `InstallSteps.tsx` (3 bước cài APK Android 8.0+), `DownloadFaq.tsx` (4 câu hỏi thường gặp dạng accordion thuần React + CSS Modules), cùng banner CTA sang `/preview`. |
| **CI/CD & Tài liệu Kiến trúc** | Workflow [`.github/workflows/ci-web-user.yml`](../../../.github/workflows/ci-web-user.yml) (Node 22, `npm ci`, `typecheck`, `lint`, `test`, `build`, quét secret `.next/static`, conditional deploy Vercel) và cập nhật `docs/02-Architecture/ci-cd-guide.md`, `docs/02-Architecture/folder-structure.md`. |

---

## 2. Đối chiếu Nghiệm thu & Ràng buộc Kỹ thuật

| Hạng mục | Yêu cầu (`AGENTS.md` & Design Prompt) | Hiện thực đã xác minh |
|---|---|---|
| **Phạm vi tách biệt** | Không `/admin`, không nghiệp vụ đặt in/thanh toán/login trên web user | Chỉ có 3 route công khai `/`, `/preview`, `/download`; CTA đều dẫn về `/download` để thao tác trên Mobile App |
| **Navbar 3 link** | Đúng 3 đường dẫn chính (`/`, `/preview`, `/download`) | Đã kiểm tra `Navbar.tsx`: `NAV_LINKS` có đúng 3 mục trên cả desktop nav và mobile drawer |
| **CTA trang `/preview`** | Không xuất file ảnh PNG tải về; CTA chính dẫn sang `/download` | Đã kiểm tra `PrintPreviewScene3D.tsx` & `features/preview/**`: không có nút tải/export PNG; CTA trong `MaterialControls.tsx` trỏ tới `/download` |
| **Quyền riêng tư ảnh** | Ảnh Preview xử lý 100% phía trình duyệt, không upload lên server/Cloudinary | Dùng `URL.createObjectURL` + Canvas2D (`template-canvas.ts`), thu hồi `URL.revokeObjectURL` & `texture.dispose()` khi đổi/xóa/unmount |
| **CSS & Thẩm mỹ** | Vanilla CSS + CSS Modules, **0% TailwindCSS**, 3 màu Đỏ rượu vang / Trắng-Giấy ngà / Vàng đồng | Toàn bộ dùng `tokens.css` + `*.module.css`; không có `tailwindcss` trong `package.json`, `src/` hay `.next/static` |
| **Bảo mật secret** | Tuyệt đối không dùng `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, không `dangerouslySetInnerHTML` trong app code | Quét 47 file `src/` và 56 file `.next/static`: `0` secret leaks, `0` `dangerouslySetInnerHTML` trong `src/` |

---

## 3. Quyết định Thiết kế đã Chốt

| # | Quyết định | Lý do & Ghi chú |
|---|---|---|
| 1 | **Bỏ nút "Tải ảnh xem thử (PNG)" trên `/preview`** | Khác với mô tả nháp ở §5.2 prompt ban đầu, studio chỉ giữ tính năng thử ảnh 3D trực quan và đặt CTA chính dẫn sang `/download` để tránh biến web thành công cụ xuất ảnh miễn phí thay vì chuyển đổi người dùng cài app đặt in. |
| 2 | **Chuẩn hóa 4 gói Hội viên chính thức & lọc legacy seeds** | `catalog-data.ts` (`filterLegacyMembershipPlans`, `buildPublicMembershipTiers`) hiển thị đúng 4 gói `Free` (0đ), `PAUSE Go` (30.000đ/năm), `PAUSE Plus` (55.000đ/năm, nổi bật), `PAUSE Premium` (100.000đ/năm), lọc bỏ các row seed cũ (`Basic`, `Premium` 99k/tháng, `Basic Yearly`) nếu DB còn lưu. |
| 3 | **Kiến trúc Hybrid 3D cho máy ảnh Home (`CameraModelSlot.tsx`)** | Chạy ngay lập tức bằng `VintageCameraModel` procedural (0 KB tải ngoài), đồng thời hỗ trợ nạp `.glb` qua `NEXT_PUBLIC_CAMERA_GLB_URL` kèm chuẩn hóa `Box3` về tâm `(0,0,0)` kích thước `2.4 units` + `GlbErrorBoundary` fallback không nhấp nháy. |
| 4 | **Dữ liệu QR & APK an toàn khi chưa set env** | `apk-config.ts` fallback về `https://github.com/ZenithGn/Pause/releases/latest` khi thiếu `NEXT_PUBLIC_ANDROID_APK_URL`; `qr-svg.ts` sinh SVG trực tiếp bằng `qrcode.create()` và render path JSX thuần (không dùng `dangerouslySetInnerHTML`). |

---

## 4. Kiểm thử & Xác minh (trên nhánh `webapp-dev`)

### 4.1 Build, Lint, Typecheck & Unit Tests (`app/web-user`)

```bash
cd app/web-user
npm ci --prefer-offline          # exit code 0 (539 packages)
npm run typecheck                # tsc --noEmit -> exit code 0
npm run lint                     # next lint -> ✔ No ESLint warnings or errors
npm run test                     # Vitest: 4 test files, 31 tests passed, 0 failed
npm run build                    # next build (Next.js 15.5.29) -> ✓ Compiled successfully in 11.7s, 6/6 static pages
```

Chi tiết 4 file Vitest (`31` tests):
- `tests/unit/home-scroll.test.ts`: `7` tests (biên `[0, 1]` của `clamp01`, 5 mốc `computeCameraPoseAtScroll`, vị trí lệch tránh đè chữ/4 thẻ bảng giá, kích hoạt `stripOut` & `shutterPress` ở mốc 3).
- `tests/unit/template-canvas.test.ts`: `12` tests (`computeCenterCropRect` landscape/portrait/equal aspect, `renderFrontTemplateCanvas` crop-fill + placeholder + caption override + scale max 1800px, `renderBackTemplateCanvas` watermark light/dark premium, `createPaperGrainCanvas` & `createLeatherBumpCanvas`).
- `tests/unit/preview-studio.test.ts`: `6` tests (`resolveInitialTemplateId`, `filterTemplates`, giữ ảnh khi đổi mẫu `getActiveSlotPhotoUrls`, gán/đảo/xóa/điền ảnh mẫu kèm thu hồi object URL, render `PreviewStudio` xác nhận chuyển tab & không có nút export PNG).
- `tests/unit/download.test.ts`: `6` tests (`resolveAndroidApkUrl`, `getAndroidApkMetadata`, sinh SVG matrix QR qua `qr-svg.ts`, `QrCodeCard` render SVG + clipboard feedback, `DownloadFaq` accordion toggle).

Kết quả route `next build`:
- `/` (`5.32 kB`, First Load JS `129 kB`, ISR `1m`)
- `/_not-found` (`995 B`, First Load JS `105 kB`)
- `/download` (`4.47 kB`, First Load JS `113 kB`)
- `/preview` (`8.73 kB`, First Load JS `132 kB`, Dynamic `ƒ`)

### 4.2 Kiểm tra Bảo mật, Ràng buộc Thiết kế & Live Production Smoke Test

- **Quét source & bundle**:
  - `app/web-user/src` (`47` files): `0` occurrences của `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `dangerouslySetInnerHTML`, `tailwindcss`, `@tailwind`.
  - `app/web-user/.next/static` (`56` files): `0` occurrences của `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `tailwindcss`, `@tailwind`.
- **Live Next.js Production Server Smoke (`npx next start -p 3097`, đã dừng sạch server sau khi test)**:
  - `GET /` → HTTP `200`, `0` Next.js error boundary/overlay, đủ `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `GET /preview` → HTTP `200`, `0` error, đủ 3 security headers.
  - `GET /preview?template=tpl-vintage-memories` → HTTP `200`, `0` error, đủ 3 security headers.
  - `GET /download` → HTTP `200`, `0` error, đủ 3 security headers.
  - `GET /samples/sample-1.svg` → HTTP `200`.

### 4.3 Cross-Repo Regression Checks

```bash
python supabase/tests/validate_migrations.py
# 149/149 checks passed (ALL SQL CHECKS PASSED, exit code 0)

cd app/web-admin
npm run typecheck                # tsc --noEmit -> exit code 0
npm run test                     # Vitest: 8 test files, 105 tests passed, 0 failed
```

---

## 5. Cấu hình Môi trường Tùy chọn & Việc Còn lại

### 5.1 Biến môi trường tùy chọn (`app/web-user/.env.example`)
Trang web chạy ổn định 100% khi bỏ trống toàn bộ biến môi trường nhờ dữ liệu fallback tĩnh và model procedural. Khi deploy môi trường thật có thể cấu hình thêm:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: đọc trực tiếp danh sách `photobooth_templates` và `membership_plans` đang `is_active = true` từ Supabase (ISR `60s`).
- `NEXT_PUBLIC_ANDROID_APK_URL`: URL file `.apk` hoặc trang phát hành cho nút tải và mã QR trên `/download` (mặc định fallback `https://github.com/ZenithGn/Pause/releases/latest`).
- `NEXT_PUBLIC_CAMERA_GLB_URL`: đường dẫn file `.glb` (ví dụ `/models/camera.glb`) cho `CameraModelSlot` trên trang chủ (mặc định dùng `VintageCameraModel` procedural).
- **GitHub Actions Secrets** (tùy chọn cho job `deploy-vercel` trong `ci-web-user.yml`): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_USER_PROJECT_ID`.

### 5.2 Kiểm thử Visual WebGL trên Trình duyệt Thật
- Toàn bộ kiểm tra tĩnh, SSR/build (`next build`), unit tests (`31/31`) và HTTP smoke (`200`) đã pass. Nếu muốn nghiệm thu thêm độ mượt khung hình 60fps, ánh sáng phản chiếu kim loại/thấu kính, độ dày giấy 200gsm và fallback tắt WebGL ở mức GPU/trình duyệt thật, có thể chạy `npm run dev` (port `3001`) hoặc `npm run start` trên trình duyệt desktop & mobile.
