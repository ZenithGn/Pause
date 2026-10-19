# Cấu trúc thư mục dự án (Folder Structure)

## Tổng quan Monorepo

```
Pause/
├── 📄 agents.md                    # Cấu hình AI agents
├── 📂 docs/                        # 📚 Tài liệu dự án
│   ├── 📂 01-BA/                   # Business Analysis
│   │   ├── 📂 SRS/                 # Software Requirements Specification
│   │   │   ├── 00-overview.md      # Tổng quan SRS
│   │   │   ├── 01-fr.md            # Functional Requirements
│   │   │   └── 02-nfr.md           # Non-Functional Requirements
│   │   ├── domain-glossary.md      # Bảng thuật ngữ nghiệp vụ
│   │   └── production.md           # Mô tả sản phẩm
│   ├── 📂 02-Architecture/         # Kiến trúc hệ thống
│   │   ├── system-design.md        # Thiết kế hệ thống tổng quan
│   │   └── folder-structure.md     # Tài liệu này
│   ├── 📂 03-References/           # Tài liệu tham khảo
│   │   └── db-schema.md            # Database schema
│   └── 📂 04-Plans/                # Kế hoạch phát triển
│       ├── 📂 active/              # Kế hoạch đang thực hiện
│       └── 📂 completed/           # Kế hoạch đã hoàn thành
│
└── 📂 app/                         # 💻 Source code
    ├── 📂 mobile/                  # Android app (Kotlin)
    │   └── (sẽ khởi tạo sau)
    └── 📂 web/                     # Next.js web app
        └── (sẽ khởi tạo sau)
```

---

## Chi tiết cấu trúc Mobile App (Kotlin – dự kiến)

> Sẽ được khởi tạo khi bắt đầu phase code.

```
app/mobile/
├── 📄 build.gradle.kts             # Root build config
├── 📄 settings.gradle.kts
├── 📂 app/
│   ├── 📄 build.gradle.kts
│   └── 📂 src/main/
│       ├── 📄 AndroidManifest.xml
│       ├── 📂 java/com/pause/app/
│       │   │
│       │   ├── 📂 di/              # Dependency Injection (Hilt modules)
│       │   │   └── AppModule.kt
│       │   │
│       │   ├── 📂 data/            # Data Layer
│       │   │   ├── 📂 remote/      # Supabase API calls
│       │   │   │   ├── SupabaseClient.kt
│       │   │   │   ├── DrawerApi.kt
│       │   │   │   ├── PhotoApi.kt
│       │   │   │   └── OrderApi.kt
│       │   │   ├── 📂 local/       # Local database (Room)
│       │   │   │   ├── AppDatabase.kt
│       │   │   │   ├── DrawerDao.kt
│       │   │   │   └── PhotoDao.kt
│       │   │   ├── 📂 repository/  # Repository implementations
│       │   │   │   ├── DrawerRepositoryImpl.kt
│       │   │   │   ├── PhotoRepositoryImpl.kt
│       │   │   │   └── OrderRepositoryImpl.kt
│       │   │   └── 📂 model/       # Data models / DTOs
│       │   │       ├── DrawerDto.kt
│       │   │       ├── PhotoDto.kt
│       │   │       └── OrderDto.kt
│       │   │
│       │   ├── 📂 domain/          # Domain Layer
│       │   │   ├── 📂 model/       # Domain entities
│       │   │   │   ├── Drawer.kt
│       │   │   │   ├── Photo.kt
│       │   │   │   ├── PhotoboothTemplate.kt
│       │   │   │   ├── PrintOrder.kt
│       │   │   │   └── MembershipPlan.kt
│       │   │   ├── 📂 repository/  # Repository interfaces
│       │   │   │   ├── DrawerRepository.kt
│       │   │   │   ├── PhotoRepository.kt
│       │   │   │   └── OrderRepository.kt
│       │   │   └── 📂 usecase/     # Use cases
│       │   │       ├── drawer/
│       │   │       │   ├── CreateDrawerUseCase.kt
│       │   │       │   ├── GetDrawersUseCase.kt
│       │   │       │   ├── ShareDrawerUseCase.kt
│       │   │       │   └── DeleteDrawerUseCase.kt
│       │   │       ├── photo/
│       │   │       │   ├── UploadPhotoUseCase.kt
│       │   │       │   ├── GetPhotosUseCase.kt
│       │   │       │   └── DeletePhotoUseCase.kt
│       │   │       └── order/
│       │   │           ├── CreateOrderUseCase.kt
│       │   │           └── GetOrdersUseCase.kt
│       │   │
│       │   └── 📂 presentation/    # Presentation Layer (UI)
│       │       ├── 📂 auth/        # Đăng nhập / Đăng ký
│       │       │   ├── LoginScreen.kt
│       │       │   ├── RegisterScreen.kt
│       │       │   └── AuthViewModel.kt
│       │       ├── 📂 drawer/      # Ngăn kéo kỷ niệm
│       │       │   ├── DrawerListScreen.kt
│       │       │   ├── DrawerDetailScreen.kt
│       │       │   ├── CreateDrawerScreen.kt
│       │       │   ├── ShareDrawerScreen.kt
│       │       │   └── DrawerViewModel.kt
│       │       ├── 📂 photo/       # Quản lý ảnh
│       │       │   ├── PhotoGridScreen.kt
│       │       │   ├── PhotoViewerScreen.kt
│       │       │   └── PhotoViewModel.kt
│       │       ├── 📂 photobooth/  # Tạo photobooth
│       │       │   ├── TemplateListScreen.kt
│       │       │   ├── PhotoboothBuilderScreen.kt
│       │       │   ├── PhotoboothPreviewScreen.kt
│       │       │   └── PhotoboothViewModel.kt
│       │       ├── 📂 order/       # Đơn hàng
│       │       │   ├── OrderScreen.kt
│       │       │   ├── OrderDetailScreen.kt
│       │       │   └── OrderViewModel.kt
│       │       ├── 📂 membership/  # Gói hội viên
│       │       │   ├── MembershipScreen.kt
│       │       │   └── MembershipViewModel.kt
│       │       ├── 📂 profile/     # Hồ sơ cá nhân
│       │       │   ├── ProfileScreen.kt
│       │       │   └── ProfileViewModel.kt
│       │       ├── 📂 navigation/  # App navigation
│       │       │   └── NavGraph.kt
│       │       └── 📂 components/  # Shared UI components
│       │           ├── DrawerCard.kt
│       │           ├── PhotoThumbnail.kt
│       │           ├── LoadingIndicator.kt
│       │           └── ErrorDialog.kt
│       │
│       └── 📂 res/                 # Android resources
│           ├── 📂 drawable/
│           ├── 📂 values/
│           └── 📂 font/
│
└── 📂 gradle/
    └── libs.versions.toml          # Version catalog
```

---

## Chi tiết cấu trúc Web App (Next.js – dự kiến)

> Sẽ được khởi tạo khi bắt đầu phase code.

```
app/web/
├── 📄 package.json
├── 📄 next.config.ts
├── 📄 tsconfig.json
├── 📂 public/                      # Static assets
│   ├── images/
│   └── fonts/
├── 📂 src/
│   ├── 📂 app/                     # App Router (Next.js 14+)
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page (/)
│   │   ├── 📂 about/
│   │   │   └── page.tsx            # Giới thiệu (/about)
│   │   ├── 📂 download/
│   │   │   └── page.tsx            # Trang tải app (/download)
│   │   └── 📂 admin/               # Admin dashboard
│   │       ├── layout.tsx          # Admin layout (sidebar)
│   │       ├── page.tsx            # Dashboard home
│   │       ├── 📂 users/
│   │       │   └── page.tsx        # Quản lý user
│   │       ├── 📂 templates/
│   │       │   └── page.tsx        # Quản lý template
│   │       ├── 📂 orders/
│   │       │   └── page.tsx        # Quản lý đơn hàng
│   │       └── 📂 membership/
│   │           └── page.tsx        # Quản lý gói hội viên
│   ├── 📂 components/              # Shared components
│   │   ├── ui/                     # Base UI components
│   │   ├── layout/                 # Header, Footer, Sidebar
│   │   └── admin/                  # Admin-specific components
│   ├── 📂 lib/                     # Utilities & configs
│   │   ├── supabase.ts             # Supabase client config
│   │   └── utils.ts                # Helper functions
│   └── 📂 styles/                  # CSS
│       └── globals.css
└── 📂 supabase/                    # Supabase local config
    ├── 📄 config.toml
    ├── 📂 migrations/              # DB migrations
    └── 📂 functions/               # Edge Functions
        ├── create-thumbnail/
        ├── process-payment/
        └── handle-order/
```

---

## Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Kotlin files | PascalCase | `DrawerRepository.kt` |
| Kotlin packages | lowercase | `com.pause.app.data.remote` |
| TypeScript files | kebab-case hoặc PascalCase (components) | `supabase.ts`, `DrawerCard.tsx` |
| CSS | kebab-case | `globals.css` |
| Docs | kebab-case | `domain-glossary.md` |
| Thư mục docs | số thứ tự + tên | `01-BA`, `02-Architecture` |
| Database tables | snake_case | `drawer_shares`, `print_orders` |
