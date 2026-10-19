package com.pause.app.domain.model

import java.time.Instant

/**
 * A signed-in session (JWT pair). Persistence is handled by the Supabase SDK so
 * the app can auto-login on next launch (T-01.22).
 */
data class AuthSession(
    val user: User,
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Instant? = null,
    /** True when the session was created from a password-recovery deep link. */
    val isRecovery: Boolean = false,
)
