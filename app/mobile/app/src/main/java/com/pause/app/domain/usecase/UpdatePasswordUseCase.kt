package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.validation.CredentialsValidator

/** FR-01.4 – step 3: store the new password on the recovery session. */
class UpdatePasswordUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(newPassword: String, confirmPassword: String): Result<AuthSession> {
        val errors = buildMap {
            CredentialsValidator.validatePassword(newPassword)?.let { put(AuthField.PASSWORD, it) }
            CredentialsValidator.validateConfirmPassword(newPassword, confirmPassword)
                ?.let { put(AuthField.CONFIRM_PASSWORD, it) }
        }
        if (errors.isNotEmpty()) {
            return Result.failure(AuthFailure.InvalidInput(errors))
        }
        return authResult { authRepository.updatePassword(newPassword) }
    }
}
