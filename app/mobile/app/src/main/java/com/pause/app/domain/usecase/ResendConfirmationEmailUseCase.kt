package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.validation.CredentialsValidator

/** FR-01.1 – resend the confirmation email when the first one was lost. */
class ResendConfirmationEmailUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(email: String): Result<Unit> {
        val normalized = email.trim()
        val error = CredentialsValidator.validateEmail(normalized)
        if (error != null) {
            return Result.failure(AuthFailure.InvalidInput(mapOf(AuthField.EMAIL to error)))
        }
        return authResult { authRepository.resendConfirmationEmail(normalized) }
    }
}
