package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.UserProfile
import com.pause.app.domain.repository.ProfileRepository
import com.pause.app.domain.validation.CredentialsValidator

/** FR-01.5 – update display name / phone / avatar. */
class UpdateProfileUseCase(
    private val profileRepository: ProfileRepository,
) {
    suspend operator fun invoke(
        userId: String,
        displayName: String,
        phone: String?,
        avatarPath: String? = null,
    ): Result<UserProfile> {
        val errors = buildMap {
            CredentialsValidator.validateDisplayName(displayName)?.let { put(AuthField.DISPLAY_NAME, it) }
            CredentialsValidator.validateOptionalPhone(phone)?.let { put(AuthField.PHONE, it) }
        }
        if (errors.isNotEmpty()) {
            return Result.failure(AuthFailure.InvalidInput(errors))
        }

        return authResult {
            profileRepository.updateProfile(
                userId = userId,
                displayName = displayName.trim(),
                phone = phone?.trim()?.ifBlank { null },
                avatarPath = avatarPath,
            )
        }
    }
}
