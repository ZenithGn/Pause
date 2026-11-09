package com.pause.app.domain.repository

import com.pause.app.domain.model.AppNotification

/** FR-07 – Repository for reading and updating user notifications (`public.notifications`). */
interface NotificationRepository {
    suspend fun getNotifications(): List<AppNotification>
    suspend fun markAsRead(notificationId: String)
    suspend fun markAllAsRead()
    suspend fun createNotification(
        type: String,
        title: String,
        body: String,
        referenceId: String? = null,
    ): AppNotification
}
