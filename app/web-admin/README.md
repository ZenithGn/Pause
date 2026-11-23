# Pause Web & Admin Dashboard (`app/web`)

Ứng dụng web cho **Pause**, được xây dựng bằng **Next.js App Router + TypeScript (strict) + Vanilla CSS / CSS Modules** theo chuẩn **Material Design 3** với bảng màu thương hiệu Pause (`#630D11`).

---

## 1. Yêu cầu môi trường

- **Node.js**: `>= 20.x` (khuyến nghị Node 22 LTS)
- **npm**: `>= 10.x`
- **Supabase**: dự án Supabase cloud hoặc local (`supabase start` từ thư mục gốc repository)

---

## 2. Cài đặt & Chạy local

```bash
cd app/web
npm install
cp .env.example .env.local
```

### Biến môi trường (`.env.local`)

| Biến | Bắt buộc | Phạm vi | Mô tả |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Có (khi chạy thật) | Client & Server | URL của Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có (khi chạy thật) | Client & Server | Anon public key của Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Có (khi khóa/mở user) | **Server-only** | Service Role key để gọi Supabase Auth Admin API |
| `CLOUDINARY_CLOUD_NAME` | Có (khi upload template) | **Server-only** | Tên Cloudinary product environment |
| `CLOUDINARY_API_KEY` | Có (khi upload template) | **Server-only** | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Có (khi upload template) | **Server-only** | Cloudinary API Secret (dùng để ký upload phía server) |
| `USE_MOCK_ADMIN_DATA` | Tuỳ chọn (`false`) | **Server-only** | Đặt `true` chỉ khi phát triển/xem thử UI offline không cần Supabase |

> ⚠️ **Lưu ý bảo mật**: Không bao giờ thêm tiền tố `NEXT_PUBLIC_` cho `SUPABASE_SERVICE_ROLE_KEY` hoặc `CLOUDINARY_API_SECRET`. Module `src/lib/supabase/admin.ts` bắt buộc khai báo `import "server-only"`.

### Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

Để xem nhanh giao diện admin khi chưa nối Supabase local, có thể chạy tạm với `USE_MOCK_ADMIN_DATA=true` trong `.env.local`. Khi triển khai staging/production phải đặt `USE_MOCK_ADMIN_DATA=false` hoặc xóa biến này.

---

## 3. Các lệnh kiểm tra chất lượng

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Chạy Next.js dev server |
| `npm run build` | Build production |
| `npm run start` | Chạy bản production sau khi build |
| `npm run typecheck` | Kiểm tra TypeScript (`tsc --noEmit`) |
| `npm run lint` | Kiểm tra ESLint (`next lint`) |
| `npm run test` | Chạy unit tests bằng Vitest + React Testing Library |
| `npm run gen:types` | Sinh lại `src/types/database.ts` từ Supabase local |

---

## 4. Triển khai lên Vercel

1. Tạo project mới trên Vercel trỏ tới repository Pause.
2. Cấu hình **Root Directory** là `app/web`.
3. Framework Preset: **Next.js**.
4. Khai báo đầy đủ biến môi trường (trừ `USE_MOCK_ADMIN_DATA` giữ `false` hoặc bỏ trống).
5. Build Command mặc định: `npm run build`.

---

## 5. Hướng dẫn sử dụng UI Kit (`@/components/ui`)

Tất cả component tuân thủ Material Design 3 tokens trong `src/styles/tokens.css`, dùng CSS Modules (không dùng TailwindCSS).

### Ví dụ trang danh sách chuẩn (FilterBar + SearchInput + DataTable + Pagination)

```tsx
"use client";

import { useState } from "react";
import {
  Button,
  ConfirmDialog,
  DataTable,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusChip,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { OrderSummary } from "@/types/admin";

export function ExampleOrdersView({
  orders,
  page,
  pageSize,
  totalCount,
}: {
  orders: OrderSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const toast = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);

  const columns: DataTableColumn<OrderSummary>[] = [
    { key: "short_code", header: "Mã đơn" },
    { key: "customer_name", header: "Khách hàng" },
    {
      key: "total_price_vnd",
      header: "Tổng tiền",
      align: "right",
      sortable: true,
      render: (row) => formatVnd(row.total_price_vnd),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "created_at",
      header: "Ngày tạo",
      sortable: true,
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Đơn hàng in"
        description="Quản lý và cập nhật tiến độ in ấn"
        actions={<Button variant="primary">Xuất CSV</Button>}
      />

      <FilterBar>
        <SearchInput placeholder="Tìm mã đơn, tên khách, SĐT..." />
        <Select
          aria-label="Trạng thái"
          fullWidth={false}
          options={[
            { value: "", label: "Tất cả trạng thái" },
            { value: "pending", label: "Chờ xác nhận" },
            { value: "processing", label: "Đang xử lý" },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={orders}
        onRowClick={(row) => setSelectedOrder(row)}
      />

      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} />

      <ConfirmDialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Xác nhận thao tác"
        description={`Xử lý đơn #${selectedOrder?.short_code}?`}
        onConfirm={() => {
          toast.success("Đã cập nhật thành công");
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
```

> 💡 **Lưu ý Next.js App Router**: `DataTableColumn.render` là hàm callback nên hãy khai báo `columns` trong Client Component (`"use client"`). Các Page/Layout vẫn giữ mặc định là **Server Component** để đọc dữ liệu an toàn qua RPC và chỉ truyền dữ liệu thuần xuống Client Component.
