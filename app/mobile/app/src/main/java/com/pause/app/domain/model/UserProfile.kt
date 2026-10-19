package com.pause.app.domain.model

import java.time.Instant

/**
 * Public profile of the signed-in user (`public.profiles`).
 *
 * @param avatarPath object path inside the private `avatars` bucket. The UI must
 * resolve it through a signed URL — never store a public URL (AGENTS.md).
 * @param maxDrawers free tier defaults to 3 (FR-02.2).
 */
data class UserProfile(
    val id: String,
    val displayName: String,
    val avatarPath: String? = null,
    val phone: String? = null,
    val maxDrawers: Int = 3,
    val createdAt: Instant? = null,
) {
    val isPremium: Boolean
        get() = maxDrawers > DEFAULT_MAX_DRAWERS

    val initials: String
        get() = displayName
            .trim()
            .split(Regex("\\s+"))
            .filter { it.isNotBlank() }
            .take(2)
            .joinToString("") { it.first().uppercase() }
            .ifBlank { "P" }

    companion object {
        const val DEFAULT_MAX_DRAWERS = 3
    }
}
