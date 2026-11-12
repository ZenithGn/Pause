package com.pause.app.data.repository

import android.content.SharedPreferences
import com.pause.app.data.mapper.toAuthFailure
import com.pause.app.data.mapper.toDomain
import com.pause.app.data.remote.dto.ProfileDto
import com.pause.app.data.remote.dto.ProfileUpdateDto
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.UserProfile
import com.pause.app.domain.repository.ProfileRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration.Companion.seconds

/** FR-01.5 & FR-04 – PostgREST + Storage implementation with quota persistence. */
class ProfileRepositoryImpl(
    private val client: SupabaseClient,
    private val prefs: SharedPreferences? = null,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : ProfileRepository {

    private val inMemoryMaxDrawers = ConcurrentHashMap<String, Int>()

    private fun getSavedMaxDrawers(userId: String): Int {
        val fromPrefs = prefs?.getInt("max_drawers_$userId", 0) ?: 0
        val fromMem = inMemoryMaxDrawers[userId] ?: 0
        return maxOf(fromPrefs, fromMem)
    }

    private fun saveMaxDrawers(userId: String, maxDrawers: Int) {
        inMemoryMaxDrawers[userId] = maxDrawers
        prefs?.edit()?.putInt("max_drawers_$userId", maxDrawers)?.apply()
    }

    private fun UserProfile.withEffectiveQuota(): UserProfile {
        val localMax = getSavedMaxDrawers(id)
        return if (localMax > maxDrawers) copy(maxDrawers = localMax) else this
    }

    override suspend fun getProfile(userId: String): UserProfile = withContext(ioDispatcher) {
        try {
            val profile = client.from(TABLE)
                .select { filter { eq("id", userId) } }
                .decodeSingleOrNull<ProfileDto>()
                ?.toDomain()
                ?: throw AuthFailure.Unknown("Profile row not found for $userId")
            profile.withEffectiveQuota()
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
            val profile = client.from(TABLE)
                .select { filter { eq("id", userId) } }
                .decodeSingleOrNull<ProfileDto>()
                ?.toDomain()
                ?: throw AuthFailure.Unknown("Profile row not found for $userId")
            profile.withEffectiveQuota()
        } catch (error: Exception) {
            throw error.toAuthFailure()
        }
    }

    override suspend fun upgradeMembership(userId: String, isYearly: Boolean, planType: String?): UserProfile =
        withContext(ioDispatcher) {
            val current = getProfile(userId)
            val targetMaxDrawers = when (planType) {
                "pause_go" -> 10
                "pause_plus" -> 25
                "pause_premium" -> 50
                else -> maxOf(current.maxDrawers, 15)
            }
            saveMaxDrawers(userId, targetMaxDrawers)

            runCatching {
                val params = buildJsonObject {
                    put("p_is_yearly", isYearly)
                    planType?.let { put("p_plan_type", it) }
                }
                client.postgrest.rpc("subscribe_membership", params)
            }

            runCatching { getProfile(userId) }.getOrElse { current.copy(maxDrawers = targetMaxDrawers) }
        }

    override suspend fun purchaseExtraDrawer(userId: String): UserProfile =
        withContext(ioDispatcher) {
            val current = getProfile(userId)
            val targetMaxDrawers = current.maxDrawers + 1
            saveMaxDrawers(userId, targetMaxDrawers)

            runCatching {
                client.postgrest.rpc("purchase_extra_drawer")
            }

            runCatching { getProfile(userId) }.getOrElse { current.copy(maxDrawers = targetMaxDrawers) }
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
