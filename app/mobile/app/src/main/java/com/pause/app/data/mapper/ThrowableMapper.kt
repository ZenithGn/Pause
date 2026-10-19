package com.pause.app.data.mapper

import com.pause.app.domain.model.AuthFailure
import io.github.jan.supabase.exceptions.RestException
import io.github.jan.supabase.gotrue.exception.AuthRestException
import io.github.jan.supabase.gotrue.exception.AuthWeakPasswordException
import io.github.jan.supabase.gotrue.exception.AuthErrorCode
import java.io.IOException

/**
 * Translates Supabase SDK errors into domain [AuthFailure]s so that no SDK type
 * leaks into the domain / presentation layers.
 */
fun Throwable.toAuthFailure(): AuthFailure {
    if (this is AuthFailure) return this

    return when {
        this is AuthWeakPasswordException -> AuthFailure.WeakPassword

        this is AuthRestException -> mapRestException(this)

        this is RestException -> when (statusCode) {
            401, 403 -> AuthFailure.InvalidCredentials
            429 -> AuthFailure.AccountLocked(15)
            else -> AuthFailure.Unknown(message)
        }

        this is IOException -> AuthFailure.NetworkUnavailable

        else -> AuthFailure.Unknown(message)
    }
}

private fun mapRestException(exception: AuthRestException): AuthFailure = when {
    exception.errorCode == AuthErrorCode.EmailNotConfirmed -> AuthFailure.EmailNotConfirmed
    exception.errorCode == AuthErrorCode.EmailExists ||
        exception.errorCode == AuthErrorCode.UserAlreadyExists -> AuthFailure.EmailAlreadyRegistered
    exception.errorCode == AuthErrorCode.WeakPassword ||
        exception.errorCode == AuthErrorCode.SamePassword -> AuthFailure.WeakPassword
    exception.errorCode == AuthErrorCode.OverRequestRateLimit ||
        exception.errorCode == AuthErrorCode.OverEmailSendRateLimit -> AuthFailure.AccountLocked(15)
    exception.statusCode == 429 -> AuthFailure.AccountLocked(15)
    exception.statusCode == 400 || exception.statusCode == 401 -> AuthFailure.InvalidCredentials
    else -> AuthFailure.Unknown(exception.message)
}
