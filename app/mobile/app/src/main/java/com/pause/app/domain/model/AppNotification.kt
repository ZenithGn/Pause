package com.pause.app.domain.model

import java.time.Instant

/**
 * FR-07 – In-app notification item read from `public.notifications`.
 *
 * @param type one of `'drawer_share'`, `'print_order'`, `'membership'`, `'system'`.
 */
data class AppNotification(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val isRead: Boolean = false,
    val createdAt: Instant? = null,
    val referenceId: String? = null,
)
