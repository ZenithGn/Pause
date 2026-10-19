package com.pause.app.data.repository

import com.pause.app.data.mapper.toAuthFailure
import com.pause.app.data.mapper.toDomain
import com.pause.app.data.remote.dto.ProfileDto
import com.pause.app.data.remote.dto.ProfileUpdateDto
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.UserProfile
import com.pause.app.domain.repository.ProfileRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.time.Duration.Companion.seconds

/** FR-01.5 – PostgREST + Storage implementation (T-01.09). */
class ProfileRepositoryImpl(
    private val client: SupabaseClient,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : ProfileRepository {

    override suspend fun getProfile(userId: String): UserProfile = withContext(ioDispatcher) {
        try {
            client.from(TABLE)
                .select { filter { eq("id", userId) } }
                .decodeSingleOrNull<ProfileDto>()
                ?.toDomain()
                ?: throw AuthFailure.Unknown("Profile row not found for $userId")
        } catch (error: Exception) {
            throw error.toAuthFailure()
        }
    }

    override suspend fun updateProfile(
        userId: String,
        displayName: String,
        phone: String?,
        avatarPath: String?,
    ): UserProfile = withContext(ioDispatcher) {
        try {
            client.from(TABLE)
                .update(ProfileUpdateDto(displayName = displayName, phone = phone, avatarUrl = avatarPath)) {
                    filter { eq("id", userId) }
                }
            client.from(TABLE)
                .select { filter { eq("id", userId) } }
                .decodeSingleOrNull<ProfileDto>()
                ?.toDomain()
                ?: throw AuthFailure.Unknown("Profile row not found for $userId")
        } catch (error: Exception) {
            throw error.toAuthFailure()
        }
    }

    override suspend fun uploadAvatar(
        userId: String,
        bytes: ByteArray,
        mimeType: String,
    ): String = withContext(ioDispatcher) {
        val extension = when (mimeType.lowercase()) {
            "image/png" -> "png"
            "image/webp" -> "webp"
            else -> "jpg"
        }
        val path = "$userId/avatar.$extension"
        try {
            client.storage.from(AVATARS_BUCKET).upload(path, bytes, true)
            path
        } catch (error: Exception) {
            throw error.toAuthFailure()
        }
    }

    override suspend fun signedAvatarUrl(path: String, expiresInSeconds: Long): String? =
        withContext(ioDispatcher) {
            runCatching {
                client.storage.from(AVATARS_BUCKET).createSignedUrl(path, expiresInSeconds.seconds)
            }.getOrNull()
        }

    private companion object {
        const val TABLE = "profiles"
        const val AVATARS_BUCKET = "avatars"
    }
}
