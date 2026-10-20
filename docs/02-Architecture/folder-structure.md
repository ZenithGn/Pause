# Cấu trúc thư mục dự án (Folder Structure)

> Cập nhật lần cuối: sau khi hoàn thành **FR-01 – Authentication & Account**.
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
│   ├── migrations/                 # SQL migrations (profiles, drawers, photos, shares, RLS)
│   ├── templates/                  # Email xác nhận + khôi phục mật khẩu
│   ├── functions/create-thumbnail/ # (tuỳ chọn) Edge Function backfill thumbnail
│   ├── tests/                      # validate_migrations.py (chạy SQL trên Postgres embedded)
│   └── README.md                   # Hướng dẫn setup project Supabase
│
└── 📂 app/
    ├── 📂 mobile/                  # 📱 Android app (Kotlin + Compose) — đã khởi tạo
    └── 📂 web/                     # 🌐 Next.js (landing + admin) — chưa khởi tạo
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

## Chi tiết Web App (Next.js – dự kiến)

> Sẽ được khởi tạo khi bắt đầu module FR-06 (Admin).

```
app/web/
├── 📄 package.json
├── 📄 next.config.ts
├── 📄 tsconfig.json
├── 📂 src/
│   ├── 📂 app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing page
│   │   ├── about/page.tsx
│   │   ├── download/page.tsx
│   │   └── admin/                    # Dashboard, users, templates, orders, membership
│   ├── 📂 components/                # ui/, layout/, admin/
│   ├── 📂 lib/
│   │   └── supabase.ts
│   └── 📂 styles/globals.css
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
