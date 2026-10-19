package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.validation.CredentialsValidator

/**
 * FR-01.4 – step 1: ask Supabase to email a recovery link (and OTP).
 * Step 2 happens in `HandleAuthDeepLinkUseCase` + [UpdatePasswordUseCase].
 */
class ResetPasswordUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(email: String): Result<Unit> {
        val normalized = email.trim()
        val error = CredentialsValidator.validateEmail(normalized)
        if (error != null) {
            return Result.failure(AuthFailure.InvalidInput(mapOf(AuthField.EMAIL to error)))
        }
        return authResult { authRepository.resetPassword(normalized) }
    }
}
