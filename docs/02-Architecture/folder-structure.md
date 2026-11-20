# Cấu trúc thư mục dự án (Folder Structure)

> Cập nhật lần cuối: sau khi hoàn thành **FR-06 – Admin Dashboard (Web Next.js + Supabase Backend)**.
> Cấu trúc dưới đây phản ánh code thực tế trong repo.

## Tổng quan Monorepo

```
Pause/
├── 📄 AGENTS.md                    # Hướng dẫn AI coding agents
├── 📄 .gitignore
├── 📂 docs/                        # 📚 Tài liệu dự án
│   ├── 📂 01-BA/                   # Business Analysis
│   │   ├── 📂 SRS/                 # 00-overview, 01-fr, 02-nfr
│   │   ├── domain-glossary.md
│   │   └── production.md
│   ├── 📂 02-Architecture/         # system-design.md, folder-structure.md
│   ├── 📂 03-References/           # db-schema.md, screen-inventory.md
│   └── 📂 04-Plans/
│       ├── 📂 active/              # task-breakdown.md (FR đang làm)
│       └── 📂 completed/           # Biên bản hoàn thành từng module
│
├── 📂 supabase/                    # 🗄️ Backend (migrations, config, email templates)
│   ├── config.toml                 # Auth providers, email templates, rate limit
│   ├── migrations/                 # SQL migrations (profiles, drawers, photos, shares, FR-04..FR-07, FR-06 admin)
│   ├── seed/                       # admin_seed.sql (dữ liệu mẫu local/staging)
│   ├── templates/                  # Email xác nhận + khôi phục mật khẩu
│   ├── functions/                  # Edge Functions (create-thumbnail, payos-webhook, send-notification, ...)
│   ├── tests/                      # validate_migrations.py (146 checks trên Postgres embedded)
│   └── README.md                   # Hướng dẫn setup project Supabase
│
└── 📂 app/
    ├── 📂 mobile/                  # 📱 Android app (Kotlin + Compose)
    └── 📂 web/                     # 🌐 Next.js 15 App Router (Admin Dashboard + landing placeholder)
```

> **Ghi chú**: `supabase/` đặt ở root (không phải `app/web/supabase/`) vì migration
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

## Chi tiết Web App (Next.js App Router – FR-06 Admin)

> Đã triển khai trên nhánh `webapp-dev`: TypeScript strict, Vanilla CSS / CSS Modules (MD3 tokens), không dùng TailwindCSS.

```
app/web/
├── 📄 .env.example
├── 📄 .gitignore
├── 📄 eslint.config.mjs
├── 📄 next.config.ts                       # Security headers (X-Frame-Options, nosniff, Referrer-Policy) + remotePatterns
├── 📄 package.json · package-lock.json
├── 📄 playwright.config.ts                 # Cấu hình E2E 4 trình duyệt (chromium, firefox, webkit, msedge)
├── 📄 README.md                            # Setup, env, deploy Vercel, hướng dẫn UI kit
├── 📄 tsconfig.json                        # strict: true, @/* -> ./src/*
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
│   │   ├── 📄 action-result.ts · errors.ts · format.ts · pagination.ts · nav.ts · mock-data.ts
│   ├── 📂 styles/ (tokens.css, globals.css)
│   └── 📂 types/ (admin.ts, database.ts)
└── 📂 tests/
    ├── 📂 unit/                            # auth-guard.test.ts, dashboard.test.ts, membership.test.ts, orders.test.ts, templates.test.ts, users.test.ts
    └── 📂 e2e/                             # playwright.d.ts, auth.spec.ts, admin-flows.spec.ts
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
