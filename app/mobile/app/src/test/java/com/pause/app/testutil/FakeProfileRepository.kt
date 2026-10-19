package com.pause.app.testutil

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.UserProfile
import com.pause.app.domain.repository.ProfileRepository

/** In-memory [ProfileRepository] used by unit/integration tests. */
class FakeProfileRepository : ProfileRepository {

    var storedProfile: UserProfile = UserProfile(
        id = "user-id-1",
        displayName = "Nguyễn Văn A",
        phone = null,
        maxDrawers = 3,
    )

    var failure: AuthFailure? = null
    var lastUploadedBytes: ByteArray? = null
    var lastUploadedMimeType: String? = null
    var lastSignedUrlPath: String? = null

    override suspend fun getProfile(userId: String): UserProfile {
        failure?.let { throw it }
        return storedProfile
    }

    override suspend fun updateProfile(
        userId: String,
        displayName: String,
        phone: String?,
        avatarPath: String?,
    ): UserProfile {
        failure?.let { throw it }
        storedProfile = storedProfile.copy(
            displayName = displayName,
            phone = phone,
            avatarPath = avatarPath ?: storedProfile.avatarPath,
        )
        return storedProfile
    }

    override suspend fun uploadAvatar(
        userId: String,
        bytes: ByteArray,
        mimeType: String,
    ): String {
        failure?.let { throw it }
        lastUploadedBytes = bytes
        lastUploadedMimeType = mimeType
        return "$userId/avatar.jpg"
    }

    override suspend fun signedAvatarUrl(path: String, expiresInSeconds: Long): String? {
        lastSignedUrlPath = path
        return "https://signed.example/$path"
    }
}
