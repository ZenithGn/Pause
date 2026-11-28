# Pause Web User (`app/web-user`)

Website giới thiệu sản phẩm công khai và studio **Preview Mẫu In 3D** cho nền tảng **Pause** — *"Dừng lại, lưu giữ, hiện thực hóa kỷ niệm"*.

## Công nghệ sử dụng

- **Next.js 15+ (App Router)** + **TypeScript (`strict: true`)**
- **Vanilla CSS + CSS Modules** (3-Color Editorial Palette: Wine `#630D11`, White/Paper `#FFFFFF`/`#F7F6F5`, Champagne Gold `#C59B38`)
- **Three.js** (`@react-three/fiber`, `@react-three/drei`) cho model máy ảnh cổ điển 3D theo scroll và sân khấu bản in Photobooth 3D xoay 360°
- **Supabase JS** (read-only anon client cho `photobooth_templates` & `membership_plans` kèm fallback tĩnh đầy đủ)

## Chạy phát triển (Port 3001)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3001` để tránh xung đột với `app/web-admin` (chạy ở port `3000`).

## Kiểm tra chất lượng

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
