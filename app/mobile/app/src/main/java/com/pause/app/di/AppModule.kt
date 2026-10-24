package com.pause.app.di

import androidx.room.Room
import com.pause.app.BuildConfig
import com.pause.app.data.local.DrawerDao
import com.pause.app.data.local.PauseDatabase
import com.pause.app.data.local.PhotoDao
import com.pause.app.data.local.ShareDao
import com.pause.app.data.media.AndroidPhotoProcessor
import com.pause.app.data.remote.CloudinaryUploader
import com.pause.app.data.repository.AuthRepositoryImpl
import com.pause.app.data.repository.DrawerRepositoryImpl
import com.pause.app.data.repository.PhotoRepositoryImpl
import com.pause.app.data.repository.ProfileRepositoryImpl
import com.pause.app.data.repository.PhotoboothRepositoryImpl
import com.pause.app.data.repository.ShareRepositoryImpl
import com.pause.app.data.session.InMemoryLoginAttemptStore
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.repository.DrawerRepository
import com.pause.app.domain.repository.LoginAttemptStore
import com.pause.app.domain.repository.PhotoProcessor
import com.pause.app.domain.repository.PhotoRepository
import com.pause.app.domain.repository.PhotoboothRepository
import com.pause.app.domain.repository.ProfileRepository
import com.pause.app.domain.repository.ShareRepository
import com.pause.app.domain.usecase.CreateDrawerUseCase
import com.pause.app.domain.usecase.DeleteDrawerUseCase
import com.pause.app.domain.usecase.DeletePhotosUseCase
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import com.pause.app.domain.usecase.GetDrawerSharesUseCase
import com.pause.app.domain.usecase.GetDrawerUseCase
import com.pause.app.domain.usecase.GetShareInvitationsUseCase
import com.pause.app.domain.usecase.GetDrawersUseCase
import com.pause.app.domain.usecase.GetPhotoUrlsUseCase
import com.pause.app.domain.usecase.GetPhotosUseCase
import com.pause.app.domain.usecase.GetProfileUseCase
import com.pause.app.domain.usecase.HandleAuthDeepLinkUseCase
import com.pause.app.domain.usecase.ObserveSessionUseCase
import com.pause.app.domain.usecase.ResendConfirmationEmailUseCase
import com.pause.app.domain.usecase.ResetPasswordUseCase
import com.pause.app.domain.usecase.RespondShareInvitationUseCase
import com.pause.app.domain.usecase.RevokeShareUseCase
import com.pause.app.domain.usecase.ShareDrawerUseCase
import com.pause.app.domain.usecase.SignInUseCase
import com.pause.app.domain.usecase.SignInWithGoogleUseCase
import com.pause.app.domain.usecase.SignOutUseCase
import com.pause.app.domain.usecase.SignUpUseCase
import com.pause.app.domain.usecase.UpdateDrawerUseCase
import com.pause.app.domain.usecase.UpdatePasswordUseCase
import com.pause.app.domain.usecase.UpdateProfileUseCase
import com.pause.app.domain.usecase.UploadAvatarUseCase
import com.pause.app.domain.usecase.UploadPhotosUseCase
import com.pause.app.presentation.auth.AuthViewModel
import com.pause.app.presentation.drawer.DrawerDetailViewModel
import com.pause.app.presentation.drawer.DrawerListViewModel
import com.pause.app.presentation.order.OrderViewModel
import com.pause.app.presentation.profile.ProfileViewModel
import com.pause.app.presentation.photobooth.PhotoboothViewModel
import com.pause.app.presentation.share.ShareDrawerViewModel
import com.pause.app.presentation.splash.SplashViewModel
import com.pause.app.data.repository.OrderRepositoryImpl
import com.pause.app.domain.repository.OrderRepository
import com.pause.app.domain.usecase.CreateOrderUseCase
import com.pause.app.domain.usecase.GetOrdersUseCase
import com.pause.app.domain.usecase.GetOrderDetailUseCase
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import org.koin.android.ext.koin.androidContext
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

val databaseModule = module {
    single {
        Room.databaseBuilder(
            androidContext(),
            PauseDatabase::class.java,
            PauseDatabase.NAME,
        ).fallbackToDestructiveMigration().build()
    }
    single<DrawerDao> { get<PauseDatabase>().drawerDao() }
    single<PhotoDao> { get<PauseDatabase>().photoDao() }
    single<ShareDao> { get<PauseDatabase>().shareDao() }
}

val repositoryModule = module {
    single<AuthRepository> {
        AuthRepositoryImpl(
            client = get(),
            redirectUrl = BuildConfig.AUTH_REDIRECT_URL,
            clearLocalCache = {
                val database = get<PauseDatabase>()
                database.drawerDao().clearAll()
                database.photoDao().clearAll()
                database.shareDao().clearAll()
            },
        )
    }
    single<ProfileRepository> { ProfileRepositoryImpl(client = get()) }
    single<LoginAttemptStore> { InMemoryLoginAttemptStore() }

    // Cloudinary uploader (hybrid storage: Cloudinary for photos, Supabase for DB)
    single<HttpClient> { HttpClient(OkHttp) }
    single {
        CloudinaryUploader(
            cloudName = BuildConfig.CLOUDINARY_CLOUD_NAME,
            uploadPreset = BuildConfig.CLOUDINARY_UPLOAD_PRESET,
            httpClient = get(),
        )
    }

    // FR-02 & FR-03
    single<DrawerRepository> { DrawerRepositoryImpl(client = get(), drawerDao = get()) }
    single<PhotoRepository> {
        PhotoRepositoryImpl(
            client = get(),
            photoDao = get(),
            cloudinaryUploader = get(),
        )
    }
    single<PhotoboothRepository> { PhotoboothRepositoryImpl(client = get()) }
    single<ShareRepository> { ShareRepositoryImpl(client = get(), shareDao = get()) }
    single<PhotoProcessor> { AndroidPhotoProcessor() }
    single<OrderRepository> { OrderRepositoryImpl(client = get()) }
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

    // FR-02
    factory { GetDrawersUseCase(drawerRepository = get()) }
    factory { GetDrawerUseCase(drawerRepository = get()) }
    factory { CreateDrawerUseCase(drawerRepository = get(), profileRepository = get(), getCurrentSessionUseCase = get()) }
    factory { UpdateDrawerUseCase(drawerRepository = get()) }
    factory { DeleteDrawerUseCase(drawerRepository = get()) }
    factory { GetPhotosUseCase(photoRepository = get()) }
    factory { GetPhotoUrlsUseCase(photoRepository = get()) }
    factory { UploadPhotosUseCase(photoRepository = get(), photoProcessor = get()) }
    factory { DeletePhotosUseCase(photoRepository = get()) }
    factory { GetDrawerSharesUseCase(shareRepository = get()) }
    factory { ShareDrawerUseCase(shareRepository = get(), getCurrentSessionUseCase = get()) }
    factory { RevokeShareUseCase(shareRepository = get()) }
    factory { GetShareInvitationsUseCase(shareRepository = get()) }
    factory { RespondShareInvitationUseCase(shareRepository = get()) }

    // FR-03
    factory { CreateOrderUseCase(orderRepository = get()) }
    factory { GetOrdersUseCase(orderRepository = get()) }
    factory { GetOrderDetailUseCase(orderRepository = get()) }
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
    viewModel {
        DrawerListViewModel(
            getDrawersUseCase = get(),
            createDrawerUseCase = get(),
            getShareInvitationsUseCase = get(),
            respondShareInvitationUseCase = get(),
        )
    }
    viewModel { (drawerId: String) ->
        DrawerDetailViewModel(
            drawerId = drawerId,
            getDrawerUseCase = get(),
            getPhotosUseCase = get(),
            getPhotoUrlsUseCase = get(),
            uploadPhotosUseCase = get(),
            deletePhotosUseCase = get(),
            updateDrawerUseCase = get(),
            deleteDrawerUseCase = get(),
        )
    }
    viewModel {
        PhotoboothViewModel(
            photoboothRepository = get(),
            drawerRepository = get(),
            photoRepository = get(),
        )
    }
    viewModel { (drawerId: String) ->
        ShareDrawerViewModel(
            drawerId = drawerId,
            getDrawerUseCase = get(),
            getDrawerSharesUseCase = get(),
            shareDrawerUseCase = get(),
            revokeShareUseCase = get(),
        )
    }
    viewModel {
        OrderViewModel(
            createOrderUseCase = get(),
            getOrdersUseCase = get(),
            getOrderDetailUseCase = get(),
        )
    }
}

val appModules = listOf(
    supabaseModule,
    databaseModule,
    repositoryModule,
    useCaseModule,
    viewModelModule,
)
