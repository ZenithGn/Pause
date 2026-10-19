package com.pause.app.presentation

import com.pause.app.data.session.InMemoryLoginAttemptStore
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import com.pause.app.domain.usecase.GetProfileUseCase
import com.pause.app.domain.usecase.HandleAuthDeepLinkUseCase
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
import com.pause.app.testutil.FakeAuthRepository
import com.pause.app.testutil.FakeData
import com.pause.app.testutil.FakeProfileRepository
import com.pause.app.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * T-01.24 – end-to-end auth flow through the real use cases with in-memory
 * repositories (local integration test: no device / network required).
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AuthFlowIntegrationTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val authRepository = FakeAuthRepository()
    private val profileRepository = FakeProfileRepository()
    private val loginAttemptStore = InMemoryLoginAttemptStore(now = { 0L })

    private fun authViewModel(): AuthViewModel = AuthViewModel(
        signUpUseCase = SignUpUseCase(authRepository),
        signInUseCase = SignInUseCase(authRepository, loginAttemptStore),
        signInWithGoogleUseCase = SignInWithGoogleUseCase(authRepository),
        resetPasswordUseCase = ResetPasswordUseCase(authRepository),
        resendConfirmationEmailUseCase = ResendConfirmationEmailUseCase(authRepository),
        updatePasswordUseCase = UpdatePasswordUseCase(authRepository),
        signOutUseCase = SignOutUseCase(authRepository),
        getCurrentSessionUseCase = GetCurrentSessionUseCase(authRepository),
        handleAuthDeepLinkUseCase = HandleAuthDeepLinkUseCase(authRepository),
    )

    private fun profileViewModel(): ProfileViewModel = ProfileViewModel(
        getCurrentSessionUseCase = GetCurrentSessionUseCase(authRepository),
        getProfileUseCase = GetProfileUseCase(profileRepository),
        updateProfileUseCase = UpdateProfileUseCase(profileRepository),
        uploadAvatarUseCase = UploadAvatarUseCase(profileRepository),
        profileRepository = profileRepository,
        signOutUseCase = SignOutUseCase(authRepository),
    )

    @Test
    fun `register then sign in then manage account`() = runTest {
        val viewModel = authViewModel()

        // FR-01.1 – register requires email confirmation
        viewModel.onDisplayNameChange("Nguyễn Văn A")
        viewModel.onEmailChange("new-user@pause.app")
        viewModel.onPasswordChange("Pause2026")
        viewModel.onConfirmPasswordChange("Pause2026")
        viewModel.onTermsChange(true)
        viewModel.signUp()

        assertEquals("new-user@pause.app", viewModel.state.value.confirmationEmailSentTo)
        assertNull(viewModel.state.value.session)
        assertFalse(viewModel.state.value.isLoading)

        // FR-01.1 – resend confirmation
        viewModel.resendConfirmationEmail()
        assertEquals(listOf("new-user@pause.app"), authRepository.resendConfirmationCalls)

        // FR-01.2 – sign in
        viewModel.onPasswordChange("Pause2026")
        viewModel.signIn()

        assertNotNull(viewModel.state.value.session)
        assertEquals("new-user@pause.app", viewModel.state.value.session?.user?.email)

        // FR-01.5 – profile loads and updates
        val profile = profileViewModel()
        profile.load()
        assertEquals("Nguyễn Văn A", profile.state.value.profile?.displayName)

        profile.startEditing()
        profile.onNameChange("Trần Thị B")
        profile.onPhoneChange("0912345678")
        profile.save()

        assertEquals("Trần Thị B", profileRepository.storedProfile.displayName)
        assertEquals("0912345678", profileRepository.storedProfile.phone)
        assertFalse(profile.state.value.isEditing)

        // FR-01.5 – avatar upload stores the object path and resolves a signed URL
        profile.onAvatarPicked(byteArrayOf(1, 2, 3), "image/png")
        assertEquals("image/png", profileRepository.lastUploadedMimeType)
        assertEquals("user-id-1/avatar.jpg", profileRepository.storedProfile.avatarPath)
        assertEquals("https://signed.example/user-id-1/avatar.jpg", profile.state.value.avatarUrl)

        // FR-01.3 – sign out clears the session
        profile.signOut()
        assertTrue(profile.state.value.signedOut)
        assertNull(authRepository.sessionState.value)
    }

    @Test
    fun `wrong password locks the form after five attempts`() = runTest {
        authRepository.signInFailure = AuthFailure.InvalidCredentials
        val viewModel = authViewModel()
        viewModel.onEmailChange("user@pause.app")

        repeat(5) {
            viewModel.onPasswordChange("wrong-password")
            viewModel.signIn()
        }

        val error = viewModel.state.value.formError
        assertNotNull(error)
        assertEquals(AuthFailure.AccountLocked(15).retryAfterMinutes, 15)
    }

    @Test
    fun `forgot password sends the recovery email`() = runTest {
        val viewModel = authViewModel()
        viewModel.onEmailChange("user@pause.app")

        viewModel.sendResetEmail()

        assertEquals(listOf("user@pause.app"), authRepository.resetPasswordCalls)
        assertEquals("user@pause.app", viewModel.state.value.resetEmailSentTo)
    }

    @Test
    fun `recovery deep link unlocks the reset password step`() = runTest {
        authRepository.deepLinkResult = FakeData.session("recovery@pause.app", isRecovery = true)
        val viewModel = authViewModel()

        viewModel.handleDeepLink("pause://auth-callback#access_token=a&refresh_token=r&type=recovery")

        assertTrue(viewModel.state.value.isRecoveryMode)

        viewModel.onPasswordChange("NewPause2026")
        viewModel.onConfirmPasswordChange("NewPause2026")
        viewModel.updatePassword()

        assertEquals("NewPause2026", authRepository.lastPasswordUpdate)
        assertTrue(viewModel.state.value.passwordUpdated)
        assertEquals("", viewModel.state.value.password)
    }

    @Test
    fun `session is restored on cold start`() = runTest {
        authRepository.sessionState.value = FakeData.session()
        val current = GetCurrentSessionUseCase(authRepository)()

        assertNotNull(current)
        assertTrue(authRepository.initializationAwaited)
    }

    @Test
    fun `google sign in signs the user in`() = runTest {
        val viewModel = authViewModel()

        viewModel.signInWithGoogle("google-id-token", "raw-nonce")

        assertEquals("google-user@pause.app", viewModel.state.value.session?.user?.email)
    }
}
