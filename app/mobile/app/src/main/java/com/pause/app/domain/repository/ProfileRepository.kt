package com.pause.app.domain.repository

import com.pause.app.domain.model.UserProfile

/** FR-01.5 – read/update the editable profile (`public.profiles`). */
interface ProfileRepository {

    suspend fun getProfile(userId: String): UserProfile

    /** Only the non-null values are written; null keeps the stored value. */
    suspend fun updateProfile(
        userId: String,
        displayName: String,
        phone: String?,
        avatarPath: String? = null,
    ): UserProfile

    /**
     * Uploads a new avatar into the private `avatars` bucket.
     *
     * @return the storage object path, to be persisted in `profiles.avatar_url`.
     */
    suspend fun uploadAvatar(userId: String, bytes: ByteArray, mimeType: String): String

    /** Exchanges the stored object path for a short-lived signed URL. */
    suspend fun signedAvatarUrl(path: String, expiresInSeconds: Long = 3_600): String?
}
