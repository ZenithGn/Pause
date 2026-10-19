package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.repository.SignUpOutcome
import com.pause.app.domain.validation.CredentialsValidator

/**
 * FR-01.1 – register with email/password.
 *
 * Creates the auth user, then the `handle_new_user()` trigger provisions the
 * profile and the 3 default drawers on the server.
 */
class SignUpUseCase(
    private val authRepository: AuthRepository,
) {

    suspend operator fun invoke(
        email: String,
        password: String,
        confirmPassword: String,
        displayName: String,
        acceptedTerms: Boolean,
    ): Result<SignUpOutcome> {
        val errors = buildMap {
            CredentialsValidator.validateDisplayName(displayName)?.let { put(AuthField.DISPLAY_NAME, it) }
            CredentialsValidator.validateEmail(email)?.let { put(AuthField.EMAIL, it) }
            CredentialsValidator.validatePassword(password)?.let { put(AuthField.PASSWORD, it) }
            CredentialsValidator.validateConfirmPassword(password, confirmPassword)
                ?.let { put(AuthField.CONFIRM_PASSWORD, it) }
            CredentialsValidator.validateTerms(acceptedTerms)?.let { put(AuthField.TERMS, it) }
        }

        if (errors.isNotEmpty()) {
            return Result.failure(AuthFailure.InvalidInput(errors))
        }

        return authResult {
            authRepository.signUp(
                email = email.trim(),
                password = password,
                displayName = displayName.trim(),
            )
        }
    }
}
