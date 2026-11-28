# ✅ FR-03 – In ảnh Photobooth (Hoàn thành)

> **Module**: Photobooth Print-on-Demand
> **Trạng thái**: ✅ Hoàn thành
> **Kế hoạch gốc**: [task-breakdown.md – FR-03](../active/task-breakdown.md#task-breakdown--fr-03-in-ảnh-photobooth)
> **Yêu cầu**: [FR-03](../01-BA/SRS/01-fr.md#fr-03-in-ảnh-photobooth-photobooth-print-on-demand)
> **Design**: Figma `demo-UI` – *Custom & Print / Select Photos / Edit Template & Text*
> **Lưu trữ ảnh**: [storage-strategy.md](../03-References/storage-strategy.md) (Cloudinary)
> **Tasks**: 25/25 · **Test**: 72 passed / 0 failed · **SQL checks**: 60/60

---

## 1. Tóm tắt

| Phần | Nội dung |
|---|---|
| **Backend** | 4 bảng FR-03 trong baseline (`photobooth_templates/items/photos`, `print_orders`), RLS, unique template name, **seed 6 template** với `layout_config`, thêm `cover_type`/`paper_type` cho product options |
| **Lưu trữ** | Ảnh ngăn kéo + preview photobooth → **Cloudinary** (unsigned preset); template preview dùng `templates` bucket (public) |
| **Domain** | `PhotoboothTemplate` (+`layoutConfig`), `PhotoboothDraft` (+`previewUrl`), `TemplateLayout` parser, `PhotoboothRenderer`/`PreviewUploader` ports, `CreatePhotoboothUseCase`, `CreateOrderUseCase` (product options) |
| **Data** | PostgREST repo template/draft/order, `AndroidPhotoboothRenderer` (canvas: crop-fill slot + text + frame), `CloudinaryPreviewUploader` |
| **UI** | Template list (filter category, premium badge) → Select Photos (drawer picker, chọn đúng số slot) → Preview/Edit (ảnh render thật, caption, đổi ảnh, đặt in) → Order form (bìa/giấy, số lượng, thanh toán) → Confirm/List/Detail (timeline) |

---

## 2. Đối chiếu FR-03

| FR | Yêu cầu | Hiện thực |
|---|---|---|
| FR-03.1 | Xem danh sách template | `GetActiveTemplates` (RLS `is_active`), `TemplateListScreen`, filter category, badge premium |
| FR-03.2 | Chọn template + fill ảnh vào slot (không sửa layout) | `SelectPhotosScreen` giới hạn đúng `slot_count`; layout cố định từ `layout_config`; caption do user nhập |
| FR-03.3 | Tạo photobooth + preview | `CreatePhotoboothUseCase`: render canvas → upload Cloudinary → lưu `photobooth_items.preview_url` + `photobooth_photos` theo `slot_index` |
| FR-03.4 | Đặt in | `OrderFormScreen` (số lượng, bìa mềm/cứng, giấy standard/premium, COD/banking, phí ship) → `CreateOrderUseCase` validate → `print_orders` |
| FR-03.5 | Theo dõi đơn | `OrderListScreen` (filter), `OrderDetailScreen` (timeline 6 trạng thái) |
| FR-03.6 | Quản lý đơn (admin) | RLS admin select + `admin_dashboard_stats()`; UI admin thuộc FR-06 |

---

## 3. Quyết định & sai lệch

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Gộp `TemplateRepository` vào `PhotoboothRepository` | Cùng một bảng + cùng lifecycle; tránh 2 repo/2 DTO trùng lặp |
| 2 | Render preview **trên máy** (Android Canvas) rồi upload Cloudinary | Không cần server render, không tốn CPU Supabase; khớp trade-off đã ghi trong storage-strategy |
| 3 | Caption cho phép user sửa (Figma "Edit Template & Text") | Figma có ô caption; layout/vị trí slot vẫn cố định đúng FR-03.2 |
| 4 | Preview template seed dùng ảnh placeholder | Admin (FR-06) sẽ thay bằng ảnh thật; schema + luồng đã sẵn sàng |
| 5 | Product options (`cover_type`, `paper_type`) thêm vào `print_orders` | Figma "Custom & Print" có chọn bìa/giấy; đơn giá = base + phụ phí |
| 6 | Photo picker dùng lại repo FR-02 | Tránh trùng lặp; drawer/photo đã có quota + signed URL/Cloudinary |

---

## 4. Kiểm thử

```bash
cd app/mobile
gradle :app:testDebugUnitTest      # 72 tests, 0 failed
gradle :app:assembleDebug          # APK OK
cd ../..
python supabase/tests/validate_migrations.py   # 60/60 checks
```

Test mới: `PhotoboothLayoutAndUseCaseTest` (parse layout, create photobooth render/upload/persist, sai số ảnh) và `CreateOrderUseCaseTest` (tổng tiền, cover/paper, validate quantity/shipping).

---

## 5. Còn lại / ngoài scope

- Thanh toán thật (FR-05): hiện chọn COD/banking, đơn tạo ở trạng thái `pending`.
- Admin quản lý template/đơn (FR-06): RLS + stats đã có, UI web thuộc module web.
- Dọn ảnh Cloudinary orphan khi xoá draft: cần Edge Function/cron (technical debt, đã ghi trong storage-strategy).
- Ảnh template placeholder cần thay bằng asset thật trước demo.
