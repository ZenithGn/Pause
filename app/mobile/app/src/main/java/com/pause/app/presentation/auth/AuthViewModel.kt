package com.pause.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.repository.SignUpOutcome
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import com.pause.app.domain.usecase.HandleAuthDeepLinkUseCase
import com.pause.app.domain.usecase.ResendConfirmationEmailUseCase
import com.pause.app.domain.usecase.ResetPasswordUseCase
import com.pause.app.domain.usecase.SignInUseCase
import com.pause.app.domain.usecase.SignInWithGoogleUseCase
import com.pause.app.domain.usecase.SignOutUseCase
import com.pause.app.domain.usecase.SignUpUseCase
import com.pause.app.domain.usecase.UpdatePasswordUseCase
import com.pause.app.presentation.common.AuthFailureMapper
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for the whole authentication flow (FR-01.1 → FR-01.4, T-01.22).
 *
 * Validation lives in the use cases; this class only translates results into
 * [AuthUiState] and emits one-off [AuthEvent]s for navigation.
 */
class AuthViewModel(
    private val signUpUseCase: SignUpUseCase,
    private val signInUseCase: SignInUseCase,
    private val signInWithGoogleUseCase: SignInWithGoogleUseCase,
    private val resetPasswordUseCase: ResetPasswordUseCase,
    private val resendConfirmationEmailUseCase: ResendConfirmationEmailUseCase,
    private val updatePasswordUseCase: UpdatePasswordUseCase,
    private val signOutUseCase: SignOutUseCase,
    private val getCurrentSessionUseCase: GetCurrentSessionUseCase,
    private val handleAuthDeepLinkUseCase: HandleAuthDeepLinkUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    private val _events = Channel<AuthEvent>(Channel.BUFFERED)
    val events: Flow<AuthEvent> = _events.receiveAsFlow()

    // ---------------------------------------------------------------- input

    fun onEmailChange(value: String) {
        _state.update {
            it.copy(
                email = value,
                fieldErrors = it.fieldErrors - AuthField.EMAIL,
                formError = null,
            )
        }
    }

    fun onPasswordChange(value: String) {
        _state.update {
            it.copy(
                password = value,
                fieldErrors = it.fieldErrors - AuthField.PASSWORD,
                formError = null,
            )
        }
    }

    fun onConfirmPasswordChange(value: String) {
        _state.update {
            it.copy(
                confirmPassword = value,
                fieldErrors = it.fieldErrors - AuthField.CONFIRM_PASSWORD,
                formError = null,
            )
        }
    }

    fun onDisplayNameChange(value: String) {
        _state.update {
            it.copy(
                displayName = value,
                fieldErrors = it.fieldErrors - AuthField.DISPLAY_NAME,
                formError = null,
            )
        }
    }

    fun onTermsChange(accepted: Boolean) {
        _state.update {
            it.copy(acceptedTerms = accepted, fieldErrors = it.fieldErrors - AuthField.TERMS)
        }
    }

    fun dismissError() {
        _state.update { it.copy(formError = null, fieldErrors = emptyMap()) }
    }

    /** Clears transient messages when (re)entering a screen. */
    fun resetTransientState() {
        _state.update {
            it.copy(
                formError = null,
                fieldErrors = emptyMap(),
                confirmationEmailSentTo = null,
                resetEmailSentTo = null,
                passwordUpdated = false,
                acceptedTerms = false,
            )
        }
    }

    // ---------------------------------------------------------------- actions

    /** FR-01.2 */
    fun signIn() {
        if (_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null, fieldErrors = emptyMap()) }
            signInUseCase(_state.value.email, _state.value.password)
                .onSuccess { session ->
                    _state.update { it.copy(isLoading = false, password = "", session = session) }
                    _events.send(AuthEvent.NavigateToHome)
                }
                .onFailure(::applyFailure)
        }
    }

    /** FR-01.1 */
    fun signUp() {
        if (_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null, fieldErrors = emptyMap()) }
            signUpUseCase(
                email = _state.value.email,
                password = _state.value.password,
                confirmPassword = _state.value.confirmPassword,
                displayName = _state.value.displayName,
                acceptedTerms = _state.value.acceptedTerms,
            )
                .onSuccess { outcome ->
                    when (outcome) {
                        is SignUpOutcome.ConfirmationRequired -> _state.update {
                            it.copy(
                                isLoading = false,
                                password = "",
                                confirmPassword = "",
                                confirmationEmailSentTo = outcome.email,
                            )
                        }

                        is SignUpOutcome.SignedIn -> {
                            _state.update {
                                it.copy(isLoading = false, password = "", session = outcome.session)
                            }
                            _events.send(AuthEvent.NavigateToHome)
                        }
                    }
                }
                .onFailure(::applyFailure)
        }
    }

    /** FR-01.1 alternative flow – Google. */
    fun signInWithGoogle(idToken: String, nonce: String?) {
        if (_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null, fieldErrors = emptyMap()) }
            signInWithGoogleUseCase(idToken, nonce)
                .onSuccess { session ->
                    _state.update { it.copy(isLoading = false, session = session) }
                    _events.send(AuthEvent.NavigateToHome)
                }
                .onFailure(::applyFailure)
        }
    }

    /** Called when the user dismisses the Google account chooser. */
    fun onGoogleSignInCancelled() {
        _state.update {
            it.copy(
                isLoading = false,
                formError = AuthFailureMapper.toUiText(AuthFailure.GoogleSignInCancelled),
            )
        }
    }

    /** Called when Credential Manager fails for a non-cancellation reason. */
    fun onGoogleSignInFailed(error: Throwable) {
        _state.update {
            it.copy(
                isLoading = false,
                formError = AuthFailureMapper.toUiText(AuthFailure.Unknown(error.message)),
            )
        }
    }

    /** FR-01.4 – request the recovery email. */
    fun sendResetEmail() {
        if (_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null, fieldErrors = emptyMap()) }
            resetPasswordUseCase(_state.value.email)
                .onSuccess {
                    _state.update {
                        it.copy(isLoading = false, resetEmailSentTo = it.email.trim())
                    }
                }
                .onFailure(::applyFailure)
        }
    }

    /** FR-01.1 – resend the confirmation email. */
    fun resendConfirmationEmail() {
        val email = _state.value.confirmationEmailSentTo ?: _state.value.email
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null) }
            resendConfirmationEmailUseCase(email)
                .onSuccess {
                    _state.update { it.copy(isLoading = false) }
                    _events.send(AuthEvent.ShowMessage(UiText.Resource(R.string.register_resend_success)))
                }
                .onFailure(::applyFailure)
        }
    }

    /** FR-01.4 step 3 – save the new password on the recovery session. */
    fun updatePassword() {
        if (_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null, fieldErrors = emptyMap()) }
            updatePasswordUseCase(_state.value.password, _state.value.confirmPassword)
                .onSuccess {
                    _state.update {
                        it.copy(isLoading = false, password = "", confirmPassword = "", passwordUpdated = true)
                    }
                    _events.send(
                        AuthEvent.ShowMessage(UiText.Resource(R.string.reset_success)),
                    )
                    _events.send(AuthEvent.NavigateToLogin)
                }
                .onFailure(::applyFailure)
        }
    }

    /** FR-01.3 */
    fun signOut() {
        viewModelScope.launch {
            signOutUseCase()
            _state.update { AuthUiState() }
            _events.send(AuthEvent.SignedOut)
        }
    }

    // ---------------------------------------------------------------- session

    /** T-01.22 – auto-login when a persisted session exists. */
    suspend fun restoreSession(): Boolean {
        val session = getCurrentSessionUseCase()
        _state.update { it.copy(session = session) }
        return session != null
    }

    /** FR-01.4 – consume `pause://auth-callback#...` deep links. */
    fun handleDeepLink(uri: String?) {
        if (uri.isNullOrBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            handleAuthDeepLinkUseCase(uri)
                .onSuccess { session ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            isRecoveryMode = session?.isRecovery == true,
                            session = session ?: it.session,
                        )
                    }
                    if (session?.isRecovery == true) {
                        _events.send(AuthEvent.OpenResetPassword)
                    }
                }
                .onFailure(::applyFailure)
        }
    }

    // ---------------------------------------------------------------- helpers

    private fun applyFailure(throwable: Throwable) {
        val failure = throwable as? AuthFailure ?: AuthFailure.Unknown(throwable.message)
        if (failure is AuthFailure.InvalidInput) {
            _state.update {
                it.copy(
                    isLoading = false,
                    fieldErrors = failure.errors.mapValues { (_, error) ->
                        AuthFailureMapper.validationText(error)
                    },
                )
            }
            return
        }
        _state.update {
            it.copy(isLoading = false, formError = AuthFailureMapper.toUiText(failure))
        }
    }
}
