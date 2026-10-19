package com.pause.app.presentation.auth

import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.AuthSession
import com.pause.app.presentation.common.UiText

/** UI state shared by Login / Register / Forgot password / Reset password. */
data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val displayName: String = "",
    val acceptedTerms: Boolean = false,
    val isLoading: Boolean = false,
    val fieldErrors: Map<AuthField, UiText> = emptyMap(),
    val formError: UiText? = null,
    /** Non-null after a successful sign-up that still requires email confirmation. */
    val confirmationEmailSentTo: String? = null,
    /** Non-null after a successful "forgot password" request. */
    val resetEmailSentTo: String? = null,
    /** True after the recovery deep link has been consumed. */
    val isRecoveryMode: Boolean = false,
    /** True after the password was successfully updated. */
    val passwordUpdated: Boolean = false,
    val session: AuthSession? = null,
) {
    val isFormValid: Boolean
        get() = email.isNotBlank() && password.isNotBlank()
}

/** One-off navigation / messaging events. */
sealed interface AuthEvent {
    data object NavigateToHome : AuthEvent
    data object NavigateToLogin : AuthEvent
    data object OpenResetPassword : AuthEvent
    data object SignedOut : AuthEvent
    data class ShowMessage(val message: UiText) : AuthEvent
}
