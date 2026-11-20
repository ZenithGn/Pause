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

    /** FR-04.1 / FR-04.2 – upgrades the user's membership (PAUSE Go: 10, Plus: 25, Premium: 50). */
    suspend fun upgradeMembership(userId: String, isYearly: Boolean = true, planType: String? = null): UserProfile {
        val current = getProfile(userId)
        val target = when (planType) {
            "pause_go" -> 10
            "pause_plus" -> 25
            "pause_premium" -> 50
            else -> 15
        }
        return current.copy(maxDrawers = maxOf(current.maxDrawers, target))
    }

    /** FR-04.3 – purchases +1 permanent extra drawer (29,000 VND). */
    suspend fun purchaseExtraDrawer(userId: String): UserProfile {
        val current = getProfile(userId)
        return current.copy(maxDrawers = current.maxDrawers + 1)
    }
}
