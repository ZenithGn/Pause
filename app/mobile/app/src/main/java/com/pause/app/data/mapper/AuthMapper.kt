package com.pause.app.data.mapper

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.model.User
import io.github.jan.supabase.gotrue.user.UserInfo
import io.github.jan.supabase.gotrue.user.UserSession
import java.time.Instant

fun UserSession.toDomain(isRecovery: Boolean = false): AuthSession {
    val info: UserInfo = user ?: throw AuthFailure.SessionExpired
    return AuthSession(
        user = info.toDomain(),
        accessToken = accessToken,
        refreshToken = refreshToken,
        expiresAt = Instant.ofEpochMilli(expiresAt.toEpochMilliseconds()),
        isRecovery = isRecovery,
    )
}

fun UserInfo.toDomain(): User = User(
    id = id,
    email = email,
    emailConfirmed = emailConfirmedAt != null,
)
