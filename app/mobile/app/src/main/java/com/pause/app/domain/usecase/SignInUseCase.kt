package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.repository.LoginAttemptStore
import com.pause.app.domain.validation.CredentialsValidator

/**
 * FR-01.2 – sign in with email/password including the
 * "5 failed attempts → 15 minute lock" rule.
 */
class SignInUseCase(
    private val authRepository: AuthRepository,
    private val loginAttemptStore: LoginAttemptStore,
) {

    suspend operator fun invoke(email: String, password: String): Result<AuthSession> {
        val normalizedEmail = email.trim()

        val errors = buildMap {
            CredentialsValidator.validateEmail(normalizedEmail)?.let { put(AuthField.EMAIL, it) }
            CredentialsValidator.validatePassword(password, requireStrength = false)
                ?.let { put(AuthField.PASSWORD, it) }
        }
        if (errors.isNotEmpty()) {
            return Result.failure(AuthFailure.InvalidInput(errors))
        }

        val lockedFor = loginAttemptStore.lockRemainingMillis(normalizedEmail)
        if (lockedFor > 0) {
            return Result.failure(AuthFailure.AccountLocked(minutesUntil(lockedFor)))
        }

        return try {
            val session = authRepository.signIn(normalizedEmail, password)
            loginAttemptStore.clear(normalizedEmail)
            Result.success(session)
        } catch (failure: AuthFailure) {
            if (failure is AuthFailure.InvalidCredentials) {
                loginAttemptStore.registerFailure(normalizedEmail)
                val remaining = loginAttemptStore.lockRemainingMillis(normalizedEmail)
                if (remaining > 0) {
                    Result.failure(AuthFailure.AccountLocked(minutesUntil(remaining)))
                } else {
                    Result.failure(failure)
                }
            } else {
                Result.failure(failure)
            }
        } catch (error: Exception) {
            Result.failure(AuthFailure.Unknown(error.message))
        }
    }
}
