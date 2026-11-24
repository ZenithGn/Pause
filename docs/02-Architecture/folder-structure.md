# Cấu trúc thư mục dự án (Folder Structure)

> Cập nhật lần cuối: sau khi tách **Web Admin (`app/web-admin/`)** và xây dựng **Web User (`app/web-user/`)**.
> Cấu trúc dưới đây phản ánh code thực tế trong repo.

## Tổng quan Monorepo

```
Pause/
├── 📄 AGENTS.md                    # Hướng dẫn AI coding agents
├── 📄 DESIGN.md                    # Hệ thống thiết kế thương hiệu Pause
├── 📄 .gitignore
├── 📂 .github/workflows/           # GitHub Actions CI/CD (ci-mobile, ci-supabase, ci-web-admin, ci-web-user)
├── 📂 docs/                        # 📚 Tài liệu dự án
│   ├── 📂 01-BA/                   # Business Analysis
│   │   ├── 📂 SRS/                 # 00-overview, 01-fr, 02-nfr
│   │   ├── domain-glossary.md
│   │   └── production.md
│   ├── 📂 02-Architecture/         # system-design.md, folder-structure.md, ci-cd-guide.md
│   ├── 📂 03-References/           # db-schema.md, screen-inventory.md, storage-strategy.md
│   └── 📂 04-Plans/
│       ├── 📂 active/              # task-breakdown & design prompts đang triển khai
│       └── 📂 completed/           # Biên bản hoàn thành từng module
│
├── 📂 supabase/                    # 🗄️ Backend (migrations, config, email templates)
│   ├── config.toml                 # Auth providers, email templates, rate limit
│   ├── migrations/                 # SQL migrations (profiles, drawers, photos, shares, FR-04..FR-07, FR-06 admin)
│   ├── seed/                       # admin_seed.sql (dữ liệu mẫu local/staging)
│   ├── templates/                  # Email xác nhận + khôi phục mật khẩu
│   ├── functions/                  # Edge Functions (create-thumbnail, payos-webhook, send-notification, ...)
│   ├── tests/                      # validate_migrations.py (149+ checks trên Postgres embedded)
│   └── README.md                   # Hướng dẫn setup project Supabase
│
└── 📂 app/
    ├── 📂 mobile/                  # 📱 Android app (Kotlin + Compose)
    ├── 📂 web-admin/               # 🛠️ Next.js 15 App Router (FR-06 Admin Dashboard, port 3000)
    └── 📂 web-user/                # 🌐 Next.js 15 App Router (Public Showcase, Preview 3D & Download, port 3001)
```

> **Ghi chú**: `supabase/` đặt ở root (không phải `app/web-admin/supabase/`) vì migration
> là backend dùng chung cho cả mobile và web, và `supabase` CLI mặc định tìm thư mục
> này ở root repo.

---

## Chi tiết Mobile App (Kotlin – đã triển khai FR-01)

```
app/mobile/
├── 📄 build.gradle.kts                     # Root build (plugins)
├── 📄 settings.gradle.kts
├── 📄 gradle.properties
├── 📄 local.properties.example             # Mẫu cấu hình (copy → local.properties)
├── 📄 README.md                            # Setup + build + phạm vi FR-01
├── 📂 gradle/
│   └── 📄 libs.versions.toml               # Version catalog (AGP, Compose, Supabase...)
└── 📂 app/
    ├── 📄 build.gradle.kts                 # compileSdk 34, minSdk 26, BuildConfig secrets
    ├── 📄 proguard-rules.pro
    └── 📂 src/
        ├── 📂 main/
        │   ├── 📄 AndroidManifest.xml      # Deep link pause://auth-callback
        │   ├── 📂 java/com/pause/app/
        │   │   ├── 📄 PauseApplication.kt  # startKoin
        │   │   ├── 📄 MainActivity.kt      # Compose host + deep link intent
        │   │   │
        │   │   ├── 📂 di/
        │   │   │   └── 📄 AppModule.kt     # Koin: SupabaseClient, repos, use cases, VMs
        │   │   │
        │   │   ├── 📂 domain/              # Không phụ thuộc Android
        │   │   │   ├── 📂 model/           # User, UserProfile, AuthSession, AuthFailure
        │   │   │   ├── 📂 repository/      # AuthRepository, ProfileRepository, LoginAttemptStore
        │   │   │   ├── 📂 usecase/         # SignUp, SignIn, SignInWithGoogle, SignOut,
        │   │   │   │                       # ResetPassword, UpdatePassword, Get/UpdateProfile,
        │   │   │   │                       # UploadAvatar, Get/ObserveSession, HandleAuthDeepLink
        │   │   │   └── 📂 validation/      # CredentialsValidator
        │   │   │
        │   │   ├── 📂 data/
        │   │   │   ├── 📂 local/          # Room cache: DrawerEntity, PhotoEntity, ShareEntity
        │   │   │   ├── 📂 media/          # AndroidPhotoProcessor (nén ảnh + thumbnail)
        │   │   │   ├── 📂 remote/dto/      # ProfileDto, DrawerDto, PhotoDto, ShareDto
        │   │   │   ├── 📂 mapper/          # DTO/UserSession → domain, Throwable → AuthFailure
        │   │   │   ├── 📂 repository/      # AuthRepositoryImpl, ProfileRepositoryImpl
        │   │   │   └── 📂 session/         # InMemoryLoginAttemptStore (FR-01.2 lockout)
        │   │   │
        │   │   └── 📂 presentation/
        │   │       ├── 📂 auth/            # AuthViewModel, AuthUiState, Login/Register/
        │   │       │                       # ForgotPassword/ResetPassword, GoogleSignInLauncher
        │   │       ├── 📂 drawer/          # Drawer list/detail + ViewModels, CreateDrawerSheet
        │   │       ├── 📂 photo/           # PhotoViewerScreen (zoom/swipe)
        │   │       ├── 📂 share/           # ShareDrawerScreen + ViewModel (lời mời)
        │   │       ├── 📂 profile/         # ProfileViewModel, ProfileScreen, ProfileUiState
        │   │       ├── 📂 splash/          # SplashScreen, SplashViewModel (auto-login)
        │   │       ├── 📂 home/            # HomeScreen (placeholder, FR-02 thay thế)
        │   │       ├── 📂 navigation/      # PauseNavGraph, Routes
        │   │       ├── 📂 common/          # UiText, AuthFailureMapper
        │   │       │   └── 📂 components/  # PauseButton/TextField/AuthTopBar/BottomBar...
        │   │       └── 📂 theme/           # PauseTheme (grayscale theo Figma)
        │   │
        │   └── 📂 res/
        │       ├── 📂 values/              # strings.xml (tiếng Việt), colors, themes
        │       ├── 📂 drawable/            # ic_launcher_foreground
        │       └── 📂 mipmap-anydpi-v26/   # adaptive icon
        └── 📂 test/java/com/pause/app/     # JVM unit + local integration tests
            ├── 📂 testutil/                # FakeAuthRepository, FakeProfileRepository, MainDispatcherRule
            ├── 📂 domain/                  # CredentialsValidatorTest, SignUp/SignInUseCaseTest
            ├── 📂 data/session/            # InMemoryLoginAttemptStoreTest
            └── 📂 presentation/            # AuthFlowIntegrationTest (T-01.24)
```

Khi làm FR-02+ sẽ bổ sung các package `drawer/`, `photo/`, `photobooth/`, `order/`,
`membership/` theo cùng pattern (domain/usecase + data/repository + presentation).

---

## Chi tiết Web Admin (`app/web-admin/` – Next.js App Router, FR-06 Admin)

> Đã triển khai trên nhánh `webapp-dev` (chạy port `3000`, workflow `.github/workflows/ci-web-admin.yml`): TypeScript strict, Vanilla CSS / CSS Modules (MD3 tokens), không dùng TailwindCSS.

```
app/web-admin/
├── 📄 .env.example
├── 📄 .gitignore
├── 📄 eslint.config.mjs
├── 📄 next.config.ts                       # Security headers (X-Frame-Options, nosniff, Referrer-Policy) + remotePatterns
├── 📄 package.json · package-lock.json
├── 📄 playwright.config.ts                 # Cấu hình E2E 4 trình duyệt (chromium, firefox, webkit, msedge)
├── 📄 README.md                            # Setup, env, deploy Vercel, hướng dẫn UI kit
├── 📄 tsconfig.json                        # strict: true, @/* -> ./src/*
├── 📄 vercel.json                          # framework: nextjs, regions: ["sin1"]
├── 📄 vitest.config.ts · vitest.setup.ts   # Vitest + React Testing Library (jsdom)
├── 📂 src/
│   ├── 📄 middleware.ts                    # Refresh Supabase session + chặn /admin/** (trừ /admin/login, /admin/forbidden)
│   ├── 📂 app/
│   │   ├── 📄 layout.tsx                   # Root layout + ToastProvider
│   │   ├── 📄 page.tsx · page.module.css   # Landing placeholder dẫn tới /admin/login
│   │   ├── 📂 (admin-auth)/admin/login/
│   │   │   ├── 📄 page.tsx · LoginForm.tsx · login.module.css
│   │   │   └── 📄 actions.ts               # signInAdminAction (kiểm tra is_admin() & is_locked), signOutAdminAction
│   │   ├── 📂 (admin)/admin/
│   │   │   ├── 📄 layout.tsx               # requireAdmin() + AdminShell
│   │   │   ├── 📄 page.tsx                 # FR-06.5 Dashboard thống kê (Suspense + ErrorBoundary từng widget)
│   │   │   ├── 📄 error.tsx · loading.tsx · not-found.tsx
│   │   │   ├── 📂 forbidden/page.tsx
│   │   │   ├── 📂 users/
│   │   │   │   ├── 📄 page.tsx · loading.tsx
│   │   │   │   └── 📂 [id]/ (page.tsx, loading.tsx, not-found.tsx)
│   │   │   ├── 📂 templates/
│   │   │   │   ├── 📄 page.tsx · loading.tsx
│   │   │   │   ├── 📂 new/page.tsx
│   │   │   │   └── 📂 [id]/page.tsx
│   │   │   ├── 📂 orders/
│   │   │   │   ├── 📄 page.tsx · loading.tsx
│   │   │   │   └── 📂 [id]/ (page.tsx, not-found.tsx, print/page.tsx)
│   │   │   ├── 📂 membership/
│   │   │   │   ├── 📄 page.tsx             # Redirect sang /admin/membership/plans
│   │   │   │   ├── 📂 plans/ (page.tsx, new/page.tsx, [id]/page.tsx)
│   │   │   │   └── 📂 subscribers/page.tsx
│   │   │   └── 📂 transactions/page.tsx    # FR-05.2 đối soát giao dịch phía admin
│   │   └── 📂 api/admin/orders/[id]/print-pack/
│   │       └── 📄 route.ts                 # GET zip gói in (requireAdmin + JSZip)
│   ├── 📂 components/
│   │   ├── 📂 layout/                      # AdminShell, AdminSidebar, AdminHeader, PageHeader (+ .module.css)
│   │   └── 📂 ui/                          # MD3 UI Kit: Button, IconButton, TextField, Textarea, Select, Switch,
│   │                                       # Checkbox, Card, StatusChip, DataTable, Pagination, SearchInput, FilterBar,
│   │                                       # DateRangePicker, Dialog, ConfirmDialog, Toast, EmptyState, ErrorState,
│   │                                       # Skeleton (+ .module.css & ui.test.tsx)
│   ├── 📂 features/
│   │   ├── 📂 dashboard/                   # analytics.ts, date-range.ts, queries.ts, components/ (KPI, RevenueChart, OrderStatus, MembershipDistribution, TopTemplates, RecentActivity, Skeletons, ErrorBoundary)
│   │   ├── 📂 users/                       # queries.ts, actions.ts (khóa/mở khóa + rollback Auth), schemas.ts, components/ (UsersFilters, UsersTable, UserDetailView, UserLockButton, UserAvatar, UserTierChip)
│   │   ├── 📂 templates/                   # queries.ts, actions.ts, schemas.ts, mock-store.ts, layout/ (presets, json-line-map), components/ (TemplatesListView, TemplateForm, TemplateImageUploader, VisualLayoutEditor, MobileTemplatePreview)
│   │   ├── 📂 orders/                      # queries.ts, actions.ts, schemas.ts, status-machine.ts, csv.ts, print-pack.ts, components/ (OrdersListView, OrderStatusPanel, OrderNotesEditor, ShippingInfoCard, PrintShippingSlip, SafeOrderImage)
│   │   ├── 📂 membership/                  # queries.ts, actions.ts, schemas.ts, mock-store.ts, components/ (PlansView, MembershipPlanForm, SubscribersView)
│   │   └── 📂 transactions/                # queries.ts, components/ (TransactionsView)
│   ├── 📂 lib/
│   │   ├── 📂 auth/require-admin.ts        # Guard server: auth.getUser() + RPC is_admin() + is_locked
│   │   ├── 📂 cloudinary/sign-upload.ts    # server-only: ký upload Cloudinary pause/templates + fallback Supabase bucket templates
│   │   ├── 📂 supabase/ (client.ts, server.ts, admin.ts)   # admin.ts = service role, server-only
│   │   ├── 📄 public-env.ts                # Chỉ NEXT_PUBLIC_* (an toàn cho Client Components)
│   │   ├── 📄 env.ts                       # Validation biến môi trường server + re-export public-env
│   │   ├── 📄 action-result.ts · errors.ts · format.ts · pagination.ts · nav.ts · mock-data.ts · payment-timeout.ts
│   ├── 📂 styles/ (tokens.css, globals.css)
│   └── 📂 types/ (admin.ts, database.ts)
└── 📂 tests/
    ├── 📂 unit/                            # auth-guard.test.ts, dashboard.test.ts, membership.test.ts, orders.test.ts, payment-timeout.test.ts, templates.test.ts, users.test.ts
    └── 📂 e2e/                             # playwright.d.ts, auth.spec.ts, admin-flows.spec.ts
```

---

## Chi tiết Web User (`app/web-user/` – Public Showcase, Preview 3D & Download)

> Chạy độc lập ở port `3001`, workflow `.github/workflows/ci-web-user.yml`. TypeScript strict, Vanilla CSS / CSS Modules (3-color palette: Wine `#630D11`, White/Paper `#FFFFFF`/`#F7F6F5`, Gold `#C59B38`), Three.js (`@react-three/fiber`, `@react-three/drei`), chỉ đọc công khai Supabase qua anon key (tuyệt đối không dùng service role hay secret server).

```
app/web-user/
├── 📄 .env.example                         # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ANDROID_APK_URL, NEXT_PUBLIC_CAMERA_GLB_URL
├── 📄 .gitignore
├── 📄 eslint.config.mjs
├── 📄 next.config.ts                       # transpilePackages: ["three"], security headers, images.remotePatterns
├── 📄 package.json · package-lock.json
├── 📄 README.md                            # Hướng dẫn chạy dev port 3001 & scripts kiểm tra
├── 📄 tsconfig.json                        # strict: true, @/* -> ./src/*
├── 📄 vercel.json                          # framework: nextjs, regions: ["sin1"]
├── 📄 vitest.config.ts · vitest.setup.ts   # Vitest + React Testing Library (jsdom)
├── 📂 public/
│   └── 📂 samples/                         # sample-1.svg .. sample-4.svg (ảnh mẫu dùng cho nút Điền ảnh mẫu nhanh)
├── 📂 src/
│   ├── 📂 app/
│   │   ├── 📄 layout.tsx                   # Playfair Display + Be Vietnam Pro + Navbar + Footer
│   │   ├── 📄 page.tsx                     # Trang chủ (/) – Hero, Giới thiệu Ngăn kéo, 3 bước in, Bảng giá Membership & Camera 3D scroll
│   │   ├── 📂 preview/page.tsx             # Studio Preview mẫu in 3D (/preview)
│   │   └── 📂 download/page.tsx            # Trang tải phần mềm Android APK, QR SVG, hướng dẫn 3 bước & FAQ (/download)
│   ├── 📂 components/
│   │   ├── 📂 layout/                      # Navbar (+ .module.css), Footer (+ .module.css)
│   │   └── 📂 three/                       # WebGLErrorBoundary, VintageCameraModel, CameraScrollStage, PrintPreviewScene3D
│   ├── 📂 features/
│   │   ├── 📂 home/                        # Các section trang chủ (Hero, Features, Process, Pricing, DownloadCta)
│   │   ├── 📂 preview/                     # PreviewStudio, chọn mẫu in, quản lý slot ảnh, tuỳ chỉnh chất liệu
│   │   └── 📂 download/                    # apk-config.ts, qr-svg.ts, DownloadHero, DownloadActions, QrCodeCard, InstallSteps, DownloadFaq
│   ├── 📂 lib/
│   │   ├── 📄 supabase-public.ts           # Anon-only read client (photobooth_templates, membership_plans)
│   │   ├── 📄 catalog-data.ts              # Fetch Supabase + fallback 6 templates & 4 gói membership chuẩn
│   │   └── 📄 template-canvas.ts           # Pure Canvas2D renderer (front crop-fill + back watermark) -> THREE.CanvasTexture
│   ├── 📂 styles/ (tokens.css, globals.css)
│   └── 📂 types/catalog.ts
└── 📂 tests/
    └── 📂 unit/                            # template-canvas.test.ts, download.test.ts, ...
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
| SQL migrations | `YYYYMMDDHHMMSS_mô_tả.sql` | `20251112090000_profiles.sql` |
