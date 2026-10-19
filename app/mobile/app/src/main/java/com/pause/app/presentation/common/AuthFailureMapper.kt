package com.pause.app.presentation.common

import com.pause.app.R
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.ValidationError

/** Maps domain failures / validation errors to localized strings. */
object AuthFailureMapper {

    fun toUiText(failure: AuthFailure): UiText = when (failure) {
        is AuthFailure.InvalidInput ->
            failure.errors.values.firstOrNull()?.let(::validationText)
                ?: UiText.Resource(R.string.error_unknown)

        AuthFailure.InvalidCredentials -> UiText.Resource(R.string.error_invalid_credentials)
        AuthFailure.EmailNotConfirmed -> UiText.Resource(R.string.error_email_not_confirmed)
        AuthFailure.EmailAlreadyRegistered -> UiText.Resource(R.string.error_email_already_registered)
        AuthFailure.WeakPassword -> UiText.Resource(R.string.error_weak_password)
        AuthFailure.SessionExpired -> UiText.Resource(R.string.error_session_expired)
        AuthFailure.GoogleSignInCancelled -> UiText.Resource(R.string.error_google_cancelled)
        AuthFailure.GoogleSignInUnavailable -> UiText.Resource(R.string.error_unknown)
        AuthFailure.NetworkUnavailable -> UiText.Resource(R.string.error_network)
        is AuthFailure.AccountLocked ->
            UiText.Resource(R.string.error_too_many_attempts, listOf(failure.retryAfterMinutes))

        is AuthFailure.Unknown -> UiText.Resource(R.string.error_unknown)
    }

    fun validationText(error: ValidationError): UiText = when (error) {
        ValidationError.EMAIL_REQUIRED -> UiText.Resource(R.string.error_email_required)
        ValidationError.EMAIL_INVALID -> UiText.Resource(R.string.error_email_invalid)
        ValidationError.PASSWORD_REQUIRED -> UiText.Resource(R.string.error_password_required)
        ValidationError.PASSWORD_TOO_SHORT -> UiText.Resource(R.string.error_password_too_short)
        ValidationError.PASSWORD_WEAK -> UiText.Resource(R.string.error_password_weak)
        ValidationError.PASSWORD_MISMATCH -> UiText.Resource(R.string.error_password_mismatch)
        ValidationError.NAME_REQUIRED -> UiText.Resource(R.string.error_name_required)
        ValidationError.NAME_TOO_SHORT -> UiText.Resource(R.string.error_name_too_short)
        ValidationError.PHONE_INVALID -> UiText.Resource(R.string.error_phone_invalid)
        ValidationError.TERMS_REQUIRED -> UiText.Resource(R.string.error_terms_required)
    }
}
