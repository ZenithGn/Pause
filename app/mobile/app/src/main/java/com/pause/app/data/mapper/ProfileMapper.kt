package com.pause.app.data.mapper

import com.pause.app.data.remote.dto.ProfileDto
import com.pause.app.domain.model.UserProfile
import java.time.Instant

fun ProfileDto.toDomain(): UserProfile = UserProfile(
    id = id,
    displayName = displayName,
    avatarPath = avatarUrl,
    phone = phone,
    maxDrawers = maxDrawers,
    createdAt = createdAt?.let(::parseInstant),
)

private fun parseInstant(value: String): Instant? =
    runCatching { Instant.parse(value) }.getOrNull()
