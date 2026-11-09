package com.pause.app.data.remote.dto

import com.pause.app.domain.model.AppNotification
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant

/** Row of `public.notifications` returned by PostgREST. */
@Serializable
data class NotificationDto(
    val id: String,
    @SerialName("user_id") val userId: String,
    val type: String = "system",
    val title: String,
    val body: String,
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
) {
    fun toDomain(): AppNotification = AppNotification(
        id = id,
        type = type,
        title = title,
        body = body,
        isRead = isRead,
        createdAt = createdAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
    )
}

@Serializable
data class NotificationReadUpdateDto(
    @SerialName("is_read") val isRead: Boolean = true,
)
