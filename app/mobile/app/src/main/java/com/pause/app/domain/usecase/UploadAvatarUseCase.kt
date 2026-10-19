package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.repository.ProfileRepository

/** FR-01.5 – upload a new avatar to the private `avatars` bucket. */
class UploadAvatarUseCase(
    private val profileRepository: ProfileRepository,
) {
    suspend operator fun invoke(
        userId: String,
        bytes: ByteArray,
        mimeType: String = "image/jpeg",
    ): Result<String> {
        if (bytes.isEmpty()) {
            return Result.failure(AuthFailure.Unknown("Empty avatar payload"))
        }
        if (!mimeType.startsWith("image/")) {
            return Result.failure(AuthFailure.Unknown("Unsupported avatar mime type: $mimeType"))
        }
        return authResult { profileRepository.uploadAvatar(userId, bytes, mimeType) }
    }
}
