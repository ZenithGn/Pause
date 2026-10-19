package com.pause.app.domain.usecase

import com.pause.app.domain.model.UserProfile
import com.pause.app.domain.repository.ProfileRepository

/** FR-01.5 – load the signed-in user profile. */
class GetProfileUseCase(
    private val profileRepository: ProfileRepository,
) {
    suspend operator fun invoke(userId: String): Result<UserProfile> =
        authResult { profileRepository.getProfile(userId) }
}
