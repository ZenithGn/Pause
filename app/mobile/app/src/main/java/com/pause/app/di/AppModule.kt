package com.pause.app.di

import com.pause.app.BuildConfig
import com.pause.app.data.repository.AuthRepositoryImpl
import com.pause.app.data.repository.ProfileRepositoryImpl
import com.pause.app.data.session.InMemoryLoginAttemptStore
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.repository.LoginAttemptStore
import com.pause.app.domain.repository.ProfileRepository
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import com.pause.app.domain.usecase.GetProfileUseCase
import com.pause.app.domain.usecase.HandleAuthDeepLinkUseCase
import com.pause.app.domain.usecase.ObserveSessionUseCase
import com.pause.app.domain.usecase.ResendConfirmationEmailUseCase
import com.pause.app.domain.usecase.ResetPasswordUseCase
import com.pause.app.domain.usecase.SignInUseCase
import com.pause.app.domain.usecase.SignInWithGoogleUseCase
import com.pause.app.domain.usecase.SignOutUseCase
import com.pause.app.domain.usecase.SignUpUseCase
import com.pause.app.domain.usecase.UpdatePasswordUseCase
import com.pause.app.domain.usecase.UpdateProfileUseCase
import com.pause.app.domain.usecase.UploadAvatarUseCase
import com.pause.app.presentation.auth.AuthViewModel
import com.pause.app.presentation.profile.ProfileViewModel
import com.pause.app.presentation.splash.SplashViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

/**
 * Dependency graph. Koin is used instead of Hilt (AGENTS.md allows either and
 * Koin needs no annotation processing).
 */
val supabaseModule = module {
    single<SupabaseClient> {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
        ) {
            install(Auth) {
                // Deep link scheme declared in AndroidManifest
                scheme = "pause"
                host = "auth-callback"
                // T-01.22 – restore + refresh the session automatically
                alwaysAutoRefresh = true
                autoLoadFromStorage = true
                autoSaveToStorage = true
            }
            install(Postgrest)
            install(Storage)
        }
    }
}

val repositoryModule = module {
    single<AuthRepository> {
        AuthRepositoryImpl(client = get(), redirectUrl = BuildConfig.AUTH_REDIRECT_URL)
    }
    single<ProfileRepository> { ProfileRepositoryImpl(client = get()) }
    single<LoginAttemptStore> { InMemoryLoginAttemptStore() }
}

val useCaseModule = module {
    factory { SignUpUseCase(authRepository = get()) }
    factory { SignInUseCase(authRepository = get(), loginAttemptStore = get()) }
    factory { SignInWithGoogleUseCase(authRepository = get()) }
    factory { SignOutUseCase(authRepository = get()) }
    factory { ResetPasswordUseCase(authRepository = get()) }
    factory { ResendConfirmationEmailUseCase(authRepository = get()) }
    factory { UpdatePasswordUseCase(authRepository = get()) }
    factory { GetCurrentSessionUseCase(authRepository = get()) }
    factory { ObserveSessionUseCase(authRepository = get()) }
    factory { HandleAuthDeepLinkUseCase(authRepository = get()) }
    factory { GetProfileUseCase(profileRepository = get()) }
    factory { UpdateProfileUseCase(profileRepository = get()) }
    factory { UploadAvatarUseCase(profileRepository = get()) }
}

val viewModelModule = module {
    viewModel {
        AuthViewModel(
            signUpUseCase = get(),
            signInUseCase = get(),
            signInWithGoogleUseCase = get(),
            resetPasswordUseCase = get(),
            resendConfirmationEmailUseCase = get(),
            updatePasswordUseCase = get(),
            signOutUseCase = get(),
            getCurrentSessionUseCase = get(),
            handleAuthDeepLinkUseCase = get(),
        )
    }
    viewModel { SplashViewModel(getCurrentSessionUseCase = get()) }
    viewModel {
        ProfileViewModel(
            getCurrentSessionUseCase = get(),
            getProfileUseCase = get(),
            updateProfileUseCase = get(),
            uploadAvatarUseCase = get(),
            profileRepository = get(),
            signOutUseCase = get(),
        )
    }
}

val appModules = listOf(supabaseModule, repositoryModule, useCaseModule, viewModelModule)
