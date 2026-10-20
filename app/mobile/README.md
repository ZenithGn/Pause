# Pause — Android App (Kotlin)

Ứng dụng mobile của **Pause** — Kotlin + Jetpack Compose + Clean Architecture + MVVM.
Backend: Supabase (`../supabase/`).

---

## 1. Yêu cầu môi trường

| Thành phần | Phiên bản |
|---|---|
| JDK | 17+ (đã test với JDK 21) |
| Android SDK | compileSdk 34 (`android-34`) |
| Gradle | 8.7+ (wrapper chưa commit; dùng `gradle` hệ thống hoặc `gradle wrapper`) |
| minSdk | 26 (Android 8.0) |

---

## 2. Cấu hình bí mật (không commit)

Copy `local.properties.example` → `local.properties` và điền:

```properties
sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

`local.properties` đã nằm trong `.gitignore`. Các giá trị được expose qua
`BuildConfig` (không hardcode trong source — theo AGENTS.md).

> Với Supabase local stack + Android emulator: `SUPABASE_URL=http://10.0.2.2:54321`.

---

## 3. Build & test

```bash
cd app/mobile

gradle :app:assembleDebug          # build APK
gradle :app:testDebugUnitTest      # unit + local integration test (JVM, không cần device)
gradle :app:lintDebug              # lint
```

Kết quả test: `app/build/reports/tests/testDebugUnitTest/index.html`.

### Troubleshooting

- **"Gradle build daemon has been stopped: JVM garbage collector is thrashing"** →
  môi trường đang đặt `_JAVA_OPTIONS=-Xmx512M` (thắng cả `org.gradle.jvmargs`).
  Chạy lại với heap lớn hơn, ví dụ:
  `$env:_JAVA_OPTIONS="-Xmx4g"; gradle :app:assembleDebug`.
- **"SDK location not found"** → thiếu `sdk.dir` trong `app/mobile/local.properties`
  (hoặc `ANDROID_HOME`), và file không được có BOM UTF-8.

---

## 4. Kiến trúc

```
com.pause.app/
├── di/                 # Koin modules (SupabaseClient, repositories, use cases, ViewModel)
├── domain/             # Không phụ thuộc Android
│   ├── model/          # User, UserProfile, AuthSession, AuthFailure, ValidationError
│   ├── repository/     # AuthRepository, ProfileRepository, LoginAttemptStore
│   ├── usecase/        # SignUp, SignIn, SignInWithGoogle, SignOut, ResetPassword, ...
│   └── validation/     # CredentialsValidator
├── data/
│   ├── remote/dto/     # ProfileDto (PostgREST row)
│   ├── mapper/         # DTO/UserSession → domain, Throwable → AuthFailure
│   ├── repository/     # AuthRepositoryImpl, ProfileRepositoryImpl (Supabase SDK)
│   └── session/        # InMemoryLoginAttemptStore
└── presentation/
    ├── auth/           # Login / Register / Forgot / Reset + AuthViewModel
    ├── profile/        # ProfileScreen + ProfileViewModel
    ├── splash/         # Splash + SplashViewModel (auto-login)
    ├── home/           # Placeholder Home (FR-02 sẽ thay thế)
    ├── navigation/     # PauseNavGraph + Routes
    ├── common/         # UiText, AuthFailureMapper, components
    └── theme/          # PauseTheme (grayscale, theo Figma)
```

Luồng dữ liệu: `Compose → ViewModel → UseCase → Repository → Supabase SDK`.
`uiText` luôn được resolve trong Compose từ `strings.xml` (chuẩn bị i18n),
domain chỉ trả về `ValidationError` / `AuthFailure`.

---

## 5. Phạm vi FR-02 (đã implement)

| FR | Nội dung | Điểm vào |
|---|---|---|
| FR-02.1 | Danh sách ngăn kéo owned/shared + lời mời pending | `DrawerListScreen`, `DrawerListViewModel`, `list_drawers()` |
| FR-02.2 | Tạo ngăn kéo (validate + quota 3 ngăn kéo) | `CreateDrawerUseCase`, `CreateDrawerSheet` |
| FR-02.3 | Sửa tên/mô tả/ảnh bìa | `UpdateDrawerUseCase`, dialog trong `DrawerDetailScreen` |
| FR-02.4 | Xoá ngăn kéo (owner, cascade + dọn Storage) | `DeleteDrawerUseCase` |
| FR-02.5 | Upload batch: nén 2048px/q82, thumbnail 480px, progress | `UploadPhotosUseCase`, `AndroidPhotoProcessor`, `PhotoRepositoryImpl` |
| FR-02.6 | Grid ảnh, viewer pinch-to-zoom, multi-select xoá, phân trang | `DrawerDetailScreen`, `PhotoViewerScreen`, `GetPhotosUseCase` |
| FR-02.7 | Chia sẻ qua email: lời mời pending → accepted/rejected, thu hồi | `ShareDrawerUseCase`, `ShareInvitationUseCases`, `ShareDrawerScreen` |
| — | Offline cache (Room) cho drawers/photos/shares — **scope theo userId**, xoá khi đăng xuất | `data/local/PauseDatabase.kt` |
| — | Quota & storage indicator, empty state, upsell | `StorageIndicator`, `DrawerEmptyState`, quota dialog |

## 6. Phạm vi FR-01 (đã implement)

| FR | Nội dung | Điểm vào |
|---|---|---|
| FR-01.1 | Đăng ký email/password + Google | `SignUpUseCase`, `SignInWithGoogleUseCase`, `RegisterScreen` |
| FR-01.2 | Đăng nhập + khóa 5 lần/15 phút | `SignInUseCase`, `InMemoryLoginAttemptStore` |
| FR-01.3 | Đăng xuất | `SignOutUseCase`, `ProfileScreen` |
| FR-01.4 | Quên mật khẩu (email link + deep link) | `ResetPasswordUseCase`, `UpdatePasswordUseCase`, `ResetPasswordScreen` |
| FR-01.5 | Hồ sơ cá nhân + avatar (private bucket + signed URL) | `ProfileViewModel`, `ProfileRepositoryImpl` |

Session persistence (T-01.22): Supabase SDK (`autoLoadFromStorage`,
`alwaysAutoRefresh`) + `SplashViewModel` + `GetCurrentSessionUseCase`.

Google Sign-In dùng **Credential Manager** (`GoogleSignInLauncher.kt`), trả ID token
cho Supabase (`signInWith(IDToken)`), không cần Google SDK riêng.

---

## 7. Việc còn lại (manual / ngoài scope code)

- Tạo Supabase project + cấu hình providers: xem `../supabase/README.md`.
- Điền Google OAuth client ID (web) + thêm SHA-1/SHA-256 của signing key vào
  Google Cloud Console (yêu cầu bắt buộc để Credential Manager trả ID token).
- Deep link `pause://auth-callback` phải trùng `additional_redirect_urls` của Supabase.
- `gradle wrapper` chưa được commit (không tạo binary trong repo này); chạy
  `gradle wrapper --gradle-version 8.9` một lần nếu muốn dùng `./gradlew`.
