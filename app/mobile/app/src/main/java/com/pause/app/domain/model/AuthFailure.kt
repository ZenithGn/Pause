package com.pause.app.domain.model

/** Editable form fields of the auth / profile forms. */
enum class AuthField {
    EMAIL,
    PASSWORD,
    CONFIRM_PASSWORD,
    DISPLAY_NAME,
    PHONE,
    TERMS,
}

/** Field-level validation problems, mapped to `strings.xml` in the UI layer. */
enum class ValidationError {
    EMAIL_REQUIRED,
    EMAIL_INVALID,
    PASSWORD_REQUIRED,
    PASSWORD_TOO_SHORT,
    PASSWORD_WEAK,
    PASSWORD_MISMATCH,
    NAME_REQUIRED,
    NAME_TOO_SHORT,
    PHONE_INVALID,
    TERMS_REQUIRED,
}

/**
 * Domain-level auth errors. Kept free of Android resources so the domain layer
 * stays testable; [com.pause.app.presentation.common.AuthFailureMapper] turns
 * these into localized strings.
 */
sealed class AuthFailure : Exception() {

    /** Field validation failed before any network call was made. */
    data class InvalidInput(
        val errors: Map<AuthField, ValidationError>,
    ) : AuthFailure() {
        override val message: String = "Invalid input: $errors"
    }

    data object InvalidCredentials : AuthFailure()

    data object EmailNotConfirmed : AuthFailure()

    data object EmailAlreadyRegistered : AuthFailure()

    data object WeakPassword : AuthFailure()

    data object SessionExpired : AuthFailure()

    data object GoogleSignInCancelled : AuthFailure()

    data object GoogleSignInUnavailable : AuthFailure()

    /** FR-01.2: 5 failed attempts lock the account for 15 minutes. */
    data class AccountLocked(val retryAfterMinutes: Int) : AuthFailure()

    data object NetworkUnavailable : AuthFailure()

    data class Unknown(val details: String? = null) : AuthFailure()
}
