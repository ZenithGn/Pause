# ✅ FR-02 – Memory Drawers (Hoàn thành)

> **Module**: Memory Drawers
> **Trạng thái**: ✅ Hoàn thành
> **Kế hoạch gốc**: [task-breakdown.md – FR-02](../active/task-breakdown.md#task-breakdown--fr-02-ngăn-kéo-kỷ-niệm-memory-drawers)
> **Yêu cầu**: [FR-02](../01-BA/SRS/01-fr.md#fr-02-ngăn-kéo-kỷ-niệm-memory-drawers)
> **Quota**: [storage-strategy.md](../03-References/storage-strategy.md)
> **Tasks**: 39/39 · **Tests**: 59 passed / 0 failed (toàn app) · **SQL checks**: 49/49 · **APK**: build OK

---

## 1. Tóm tắt

| Phần | Nội dung | Vị trí |
|---|---|---|
| **Backend** | `photos`, `drawer_shares` (+ `status` lời mời), trigger quota/accounting, bucket private `photos`/`thumbnails`, 7 RPC | `supabase/migrations/2025111309*` |
| **Quota mới** | **256 MB/ngăn kéo** (free), nén client-side để vừa Supabase Free 1 GB | `docs/03-References/storage-strategy.md` |
| **Mobile domain** | `Drawer`/`Photo`/`DrawerShare`/`ShareInvitation`, 14 use case, validator | `domain/` |
| **Mobile data** | Supabase repos, nén ảnh (2048px/q82 + thumbnail 480px), signed URL cache, **Room offline cache** | `data/` |
| **Mobile UI** | Drawer list + invitation, create sheet, detail grid, photo viewer (zoom/swipe), share, progress, storage indicator, empty state, upsell | `presentation/` |
| **Tests** | 29 test FR-02 (validator, use case, invitation, flow integration) | `src/test/` |

---

## 2. Đối chiếu FR

| FR | Yêu cầu | Hiện thực | |
|---|---|---|---|
| FR-02.1 | Danh sách ngăn kéo owned + shared | `list_drawers()` chỉ trả share `accepted`; `DrawerListScreen` chia 2 section + badge | ✅ |
| FR-02.2 | Tạo ngăn kéo, chặn khi đạt giới hạn | `CreateDrawerUseCase` (validate + `max_drawers`) + trigger `enforce_drawer_quota`; dialog upsell | ✅ |
| FR-02.3 | Sửa tên/mô tả/bìa | `UpdateDrawerUseCase` + dialog; server chỉ cho UPDATE 3 cột trình bày | ✅ |
| FR-02.4 | Xoá ngăn kéo (owner) | `DeleteDrawerUseCase` (RLS owner-only) + dọn Storage best-effort | ✅ |
| FR-02.5 | Upload ảnh, kiểm tra dung lượng, batch + progress | `UploadPhotosUseCase` + `AndroidPhotoProcessor` (nén + thumbnail) + progress bar; trigger server là nguồn sự thật | ✅ |
| FR-02.6 | Grid, full-screen, pinch-zoom, multi-select xoá, phân trang | `DrawerDetailScreen`, `PhotoViewerScreen`, `GetPhotosUseCase`, `DeletePhotosUseCase` | ✅ |
| FR-02.7 | Chia sẻ view/edit, thu hồi | Lời mời pending → accepted/rejected; `ShareDrawerScreen`, `ShareInvitationUseCases` | ✅ |

---

## 3. Backend

```
supabase/migrations/
├── 20251113090000_drawer_shares.sql       # bảng + status + RLS + validate trigger
├── 20251113090100_photos.sql              # bảng + indexes + RLS (accepted share)
├── 20251113090200_drawer_storage.sql      # quota 256 MB + accounting + protected columns
├── 20251113090300_photo_storage_buckets.sql # buckets private + storage policies
└── 20251113090400_drawer_rpcs.sql         # 7 RPC cho mobile
supabase/functions/create-thumbnail/index.ts # (tuỳ chọn) backfill thumbnail phía server
```

- **Quota 256 MB**: `alter column storage_limit_bytes set default 268435456` + cập nhật
  row cũ; trigger `enforce_photo_quota` (SECURITY DEFINER, khoá row) chặn vượt và
  cộng `storage_used_bytes`; `release_photo_storage` hoàn lại khi xoá.
- **Chống sửa quota**: column-level privileges — client chỉ UPDATE được
  `name`, `description`, `cover_photo_url`.
- **Lời mời**: `drawer_shares.status` + RPC `respond_share_invitation` +
  `list_share_invitations`; chỉ người nhận đổi được status (RLS policy riêng).
- **Storage**: path `photos/{drawer_id}/{photo_id}.jpg` /
  `thumbnails/{drawer_id}/{photo_id}_thumb.jpg`; policy dựa trên quyền ngăn kéo,
  yêu cầu share `accepted`.

Đã cập nhật [db-schema.md](../03-References/db-schema.md) và
[supabase/README.md](../../../supabase/README.md).

---

## 4. Mobile

**Domain** (`domain/`)

- Models: `Drawer` (+`canWrite`, `remainingBytes`, `isFull`), `Photo`, `DrawerShare`,
  `ShareInvitation`, `SharePermission`, `ShareStatus`, `DrawerFailure`.
- Repositories: `DrawerRepository`, `PhotoRepository` (+`PhotoProcessor`),
  `ShareRepository`.
- Use cases: `GetDrawers`, `GetDrawer`, `CreateDrawer`, `UpdateDrawer`,
  `DeleteDrawer`, `GetPhotos`, `GetPhotoUrls`, `UploadPhotos`, `DeletePhotos`,
  `GetDrawerShares`, `ShareDrawer`, `GetShareInvitations`,
  `RespondShareInvitation`, `RevokeShare`.
- `DrawerValidator` (tên ≤ 60, mô tả ≤ 300, email chia sẻ, không tự share).

**Data** (`data/`)

- `DrawerRepositoryImpl` / `PhotoRepositoryImpl` / `ShareRepositoryImpl`: PostgREST +
  Storage + RPC, map lỗi server → `DrawerFailure`.
- `AndroidPhotoProcessor`: EXIF rotate, downscale 2048 px, JPEG q82, thumbnail
  480 px q70 (client-side để tiết kiệm egress/CPU).
- Signed URL cache in-memory (TTL 55 phút) cho bucket private.
- `PauseDatabase` (Room): `DrawerEntity`, `PhotoEntity`, `ShareEntity` + DAO;
  repository đọc cache khi offline (write-through khi online).

**Presentation** (`presentation/`)

- `drawer/`: `DrawerListViewModel`/`DrawerListScreen` (+ invitations accept/reject,
  empty state, upsell dialog), `CreateDrawerSheet`, `DrawerDetailViewModel`,
  `DrawerDetailScreen` (grid, multi-select, upload progress, edit/delete, storage).
- `photo/`: `PhotoViewerScreen` (HorizontalPager + pinch zoom).
- `share/`: `ShareDrawerViewModel`/`ShareDrawerScreen` (invite, danh sách + status, thu hồi).
- `home/`: Home hiển thị carousel ngăn kéo thật từ `list_drawers()`; tab Explore placeholder.
- Navigation: `drawer/{drawerId}`, `drawer/{drawerId}/share`.

---

## 5. Kiểm thử

```bash
cd app/mobile
gradle :app:testDebugUnitTest      # 59 tests, 0 failed
gradle :app:assembleDebug          # APK OK (Room + KSP)
cd ../..
python supabase/tests/validate_migrations.py   # 49/49 checks, ALL SQL CHECKS PASSED
```

| Test class | Số test | Nội dung |
|---|---|---|
| `DrawerValidatorTest` | 3 | tên/mô tả/email chia sẻ |
| `CreateDrawerUseCaseTest` | 6 | validate, trim, quota, chưa đăng nhập, lỗi repo |
| `UploadPhotosUseCaseTest` | 7 | batch + progress, read-only, đầy, >5 MB, vượt quota, định dạng lỗi |
| `ShareDrawerUseCaseTest` | 7 | owner-only, self, email sai, recipient not found, revoke |
| `ShareInvitationUseCaseTest` | 4 | list, accept, reject, đã trả lời |
| `DrawerFlowIntegrationTest` | 2 | flow đầy đủ + read-only shared drawer |
| FR-01 tests | 30 | (giữ nguyên, vẫn xanh) |

SQL validation (embedded Postgres, có stub `auth`/`storage`): 49 check — bao gồm
quota 256 MB, accounting, protected columns, **invitation pending → accept/reject**,
RLS ảnh theo quyền, bucket private, 8 storage policy.

---

## 6. Quyết định & sai lệch so với tài liệu

| # | Quyết định | Lý do |
|---|---|---|
| 1 | **256 MB/ngăn kéo** thay 1 GB | 3 × 1 GB = 3 GB > Supabase Free 1 GB; 256 MB × 3 = 768 MB vừa gói Free. Đã đồng bộ lại toàn bộ tài liệu BA/SRS/glossary |
| 2 | Nén ảnh + thumbnail **client-side**; Edge Function chỉ để backfill | Tiết kiệm egress/CPU, upload nhanh, không cần chờ cold start. T-02.05 vẫn có code function (`supabase/functions/create-thumbnail`) nhưng **chưa chạy thử** (không có Deno runtime) |
| 3 | Path Storage theo `drawer_id` thay vì `user_id/drawer_id` | Để người được chia sẻ quyền edit cũng upload được; policy kiểm tra quyền ngăn kéo |
| 4 | Room cache là read-through (fallback khi offline) | Đơn giản, không cần conflict resolution ở MVP |
| 5 | Lời mời chia sẻ thay vì share ngay | Theo task breakdown mới (status pending/accepted/rejected) |
| 6 | Ảnh bìa dùng `cover_photo_url` + client chọn; auto reset khi ảnh bị xoá | Tránh bìa trỏ tới ảnh đã xoá |
| 7 | Pagination 60 ảnh/trang, tự load khi cuộn | Tránh tải toàn bộ album lớn |

---

## 7. Việc cần làm thủ công

1. `supabase db push` để áp 5 migration mới (đã validate trên Postgres thật nhưng
   chưa chạy trên Supabase stack thật) rồi smoke-test bằng 2 user:
   owner tạo ngăn kéo, mời email → user kia accept → thấy drawer → upload bị chặn khi
   vượt 256 MB.
2. (Tuỳ chọn) `supabase functions deploy create-thumbnail` + set secrets
   `SUPABASE_SERVICE_ROLE_KEY` nếu muốn backfill thumbnail server-side.
3. Kiểm tra quota thực tế: upload ~200 ảnh để xác nhận nén đạt ~1.2 MB/ảnh.
4. Chạy instrumentation test trên emulator (môi trường hiện tại không có AVD).

---

## 8. Rủi ro & technical debt

| # | Vấn đề | Hướng xử lý |
|---|---|---|
| 1 | Chưa chạy trên Supabase stack thật (migration/Storage/Functions) | `supabase db reset` + smoke test trước release |
| 2 | Edge Function thumbnail chưa được chạy thử | `supabase functions serve` + test 1 ảnh |
| 3 | Ảnh mồ côi trong Storage nếu app crash giữa upload và insert DB | Cron dọn định kỳ (Edge Function) |
| 4 | Chưa có push notification cho lời mời (FR-07) | Bổ sung trigger notification khi làm FR-07 |
| 5 | Upsell hiện là dialog, chưa mở màn Membership (FR-04) | Nối khi làm FR-04 |
| 6 | Chưa có UI đổi ảnh bìa thủ công (auto = ảnh đầu tiên) | Bổ sung long-press → "Đặt làm ảnh bìa" |
| 7 | Room cache không mã hoá, ảnh vẫn phụ thuộc signed URL (hết hạn 1h) | Với MVP chấp nhận; có thể download cache sau |

---

## 9. Link nhanh

- [app/mobile/README.md](../../../app/mobile/README.md) — setup + phạm vi FR-01/FR-02
- [supabase/README.md](../../../supabase/README.md) — setup + mức độ kiểm chứng
- [db-schema.md](../03-References/db-schema.md#ghi-chú-triển-khai-fr-02-memory-drawers)
- [storage-strategy.md](../03-References/storage-strategy.md)
- [task-breakdown FR-03](../active/task-breakdown.md#task-breakdown--fr-03-in-ảnh-photobooth)

---

## 10. Phụ lục – sửa lỗi sau khi test trên máy thật

| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| 1 | Tài khoản tạo **sau** FR-02 không tạo được ngăn kéo (báo quá số lượng); tài khoản cũ thì tạo được | Trigger `create_default_drawers` tạo sẵn 3 ngăn kéo trống ngay khi đăng ký → quota `max_drawers = 3` bị dùng hết. Tài khoản cũ (tạo trước khi có trigger) không có placeholder nên còn quota | Migration `20251114090000_fr02_repair.sql`: bỏ trigger, xoá placeholder rỗng còn sót (chỉ drawer mặc định, chưa có ảnh), giữ `max_drawers = 3` là hạn mức tạo-theo-nhu-cầu. Sửa lại FR-01.1 + T-01.05 |
| 2 | Share ngăn kéo → **mọi tài khoản đều thấy**; không có bước xác nhận cho email được chỉ định | DB đang ở bản nháp FR-02 đầu tiên: `drawer_shares` chưa có cột `status` và `list_drawers()` chưa lọc `accepted`; policy cũ `"Shared users can view drawers"` cũng bỏ qua trạng thái | Repair migration: thêm cột `status`/`responded_at` nếu thiếu (share cũ → `pending`), drop policy cũ, `create or replace` toàn bộ RPC để chỉ trả về share `accepted`; UI hiển thị mục "Lời mời chia sẻ" (Chấp nhận/Từ chối) + banner trên Home |
| 3 | Nút **"Tạo ngăn kéo" ở Home** không hoạt động | `CreateDrawerSheet` chỉ được compose trong `DrawerListScreen` (tab Memories); Home chỉ bật state nên không có gì hiện ra | Chuyển render `CreateDrawerSheet` lên `PauseNavGraph` (dùng chung cho Home + Memories) |
| 4 | Ở **Profile** chỉ bấm được tab Home, không sang Memories/Explore | `PauseBottomBar` của Profile chỉ xử lý `PauseTab.HOME`, các tab khác bị bỏ qua | `ProfileScreen` nhận `onNavigate: (PauseTab) -> Unit` và forward toàn bộ tab như các màn khác |

**Đã verify lại**: `51/51` SQL check (bao gồm "signup không tạo placeholder", "repair xoá placeholder rỗng nhưng giữ drawer do user đặt tên", pending không lộ drawer, accepted mới lộ) · 59 unit/integration test · APK build OK.

> Sau khi pull code: chạy `supabase db push` (áp migration repair) rồi **build lại APK**
> — nếu chỉ cài APK cũ thì lỗi 2/3/4 vẫn còn.

## 11. Phụ lục 2 – sửa lỗi rò rỉ dữ liệu & upload (sau test vòng 2)

| # | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|
| 1 | Tạo ngăn kéo ở tài khoản A nhưng **mọi tài khoản khác đều thấy** | **Room cache không scope theo user**: `DrawerEntity/PhotoEntity/ShareEntity` chỉ khoá theo `id`, nên khi RPC lỗi (DB chưa migrate đủ / mạng lỗi) repo fallback về cache và trả dữ liệu của tài khoản đăng nhập trước trên cùng thiết bị. Kèm theo: `list_drawers()` bản cũ (DB chưa repair) không lọc `status='accepted'` | (a) Thêm `userId` vào **primary key** của cả 3 bảng cache + mọi query DAO đều filter `userId`; bump DB version 2 (Room destructive migration tự xoá cache cũ). (b) Cache **chỉ ghi/đọc khi có session**, không có session thì trả lỗi mạng thay vì cache. (c) Xoá toàn bộ cache khi `signOut()` (DI truyền `clearLocalCache`). (d) Repair migration dùng `drop function if exists …` + `create function` thay `create or replace` để chắc chắn thay được RPC cũ (kể cả khi đổi return type), và thêm guard `auth.uid() is not null` trong `list_drawers`/`get_drawer` |
| 2 | Upload ảnh: nút/progress chạy nhưng **không thấy ảnh** | Upload thất bại (bucket/policy/DB chưa đủ) chỉ hiện toast "N ảnh bị bỏ qua", không nêu lý do; và nếu upload thành công nhưng **tạo signed URL thất bại** thì grid hiện ô trống | (a) Hiện **error banner** với lý do cụ thể của ảnh lỗi đầu tiên (bucket thiếu, quyền, >5 MB, định dạng). (b) Nếu lưu ảnh thành công nhưng không tạo được signed URL → báo "không tạo được link xem ảnh, kiểm tra bucket/policy". (c) Ô ảnh không có URL hiển thị "Không tải được" thay vì ô trống |

**Migration an toàn khi chạy lại**: các RPC FR-02 giờ dùng `drop function if exists` +
`create function` (không còn `create or replace`), nên `supabase db push` trên project
đã dán SQL tay (history trống) vẫn chạy được toàn bộ 10 file và hội tụ đúng schema —
đã có check riêng trong validation.

**Thêm công cụ chẩn đoán**: `supabase/tests/diagnose_fr02.sql` — chạy trong SQL Editor để
liệt kê migration đã áp, cột `status`, RPC, policy, bucket, trigger và snapshot dữ liệu.
Dùng file này nếu vẫn thấy hành vi sai để biết chính xác DB đang thiếu gì.

**Verify lại**: SQL validation **57/57** (thêm check "drawer private to owner" qua RPC,
`drawers` RLS ẩn row của user khác, `photos` RLS ẩn ảnh của user khác) · 59 unit/integration
test pass · APK build OK.
