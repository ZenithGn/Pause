package com.pause.app.data.repository

import com.pause.app.data.remote.dto.NotificationDto
import com.pause.app.data.remote.dto.NotificationReadUpdateDto
import com.pause.app.domain.model.AppNotification
import com.pause.app.domain.repository.NotificationRepository
import com.pause.app.domain.repository.ShareRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList

/**
 * FR-07 – Supabase implementation reading `public.notifications`,
 * combined with pending share invitations and in-session notifications.
 */
class NotificationRepositoryImpl(
    private val client: SupabaseClient,
    private val shareRepository: ShareRepository? = null,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : NotificationRepository {

    private val localNotifications = CopyOnWriteArrayList<AppNotification>()
    private val readLocalIds = CopyOnWriteArrayList<String>()

    override suspend fun getNotifications(): List<AppNotification> = withContext(ioDispatcher) {
        val userId = client.auth.currentSessionOrNull()?.user?.id

        // 1) Read from Supabase public.notifications table
        val remoteList = if (userId != null) {
            runCatching {
                client.from(TABLE)
                    .select {
                        filter { eq("user_id", userId) }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<NotificationDto>()
                    .map { it.toDomain() }
            }.getOrDefault(emptyList())
        } else {
            emptyList()
        }

        // 2) Map pending share invitations into notifications if not already in remote
        val shareItems: List<AppNotification> = runCatching {
            shareRepository?.getInvitations().orEmpty().map { inv ->
                val notifId = "share_${inv.id}"
                AppNotification(
                    id = notifId,
                    type = "drawer_share",
                    title = "Lời mời chia sẻ ngăn kéo",
                    body = "${inv.ownerName} đã mời bạn truy cập ngăn kéo “${inv.drawerName}”.",
                    isRead = notifId in readLocalIds,
                    createdAt = inv.createdAt ?: Instant.now(),
                    referenceId = inv.drawerId,
                )
            }
        }.getOrDefault(emptyList())

        // 3) Welcome notification so the screen is never blank for a brand-new user
        val welcomeItem = AppNotification(
            id = "welcome_pause",
            type = "system",
            title = "Chào mừng bạn đến với Pause!",
            body = "Tạo Ngăn kéo Kỷ niệm đầu tiên để lưu giữ khoảnh khắc và đặt in dải ảnh Photobooth cổ điển.",
            isRead = "welcome_pause" in readLocalIds || remoteList.isNotEmpty() || localNotifications.isNotEmpty(),
            createdAt = Instant.now().minusSeconds(3600),
        )

        val currentLocals = localNotifications.map { item ->
            if (item.id in readLocalIds) item.copy(isRead = true) else item
        }

        val combined = (currentLocals + shareItems + remoteList)
            .distinctBy { "${it.type}:${it.title}:${it.body}" }
            .sortedByDescending { it.createdAt ?: Instant.EPOCH }

        if (combined.isEmpty()) listOf(welcomeItem) else combined + listOf(welcomeItem)
    }

    override suspend fun markAsRead(notificationId: String): Unit = withContext(ioDispatcher) {
        if (!readLocalIds.contains(notificationId)) {
            readLocalIds.add(notificationId)
        }
        val idx = localNotifications.indexOfFirst { it.id == notificationId }
        if (idx >= 0) {
            localNotifications[idx] = localNotifications[idx].copy(isRead = true)
        }
        runCatching {
            client.from(TABLE)
                .update(NotificationReadUpdateDto(isRead = true)) {
                    filter { eq("id", notificationId) }
                }
        }
    }

    override suspend fun markAllAsRead(): Unit = withContext(ioDispatcher) {
        val userId = client.auth.currentSessionOrNull()?.user?.id
        localNotifications.forEachIndexed { index, item ->
            localNotifications[index] = item.copy(isRead = true)
            if (!readLocalIds.contains(item.id)) readLocalIds.add(item.id)
        }
        if (!readLocalIds.contains("welcome_pause")) {
            readLocalIds.add("welcome_pause")
        }
        if (userId != null) {
            runCatching {
                client.from(TABLE)
                    .update(NotificationReadUpdateDto(isRead = true)) {
                        filter {
                            eq("user_id", userId)
                            eq("is_read", false)
                        }
                    }
            }
        }
    }

    override suspend fun createNotification(
        type: String,
        title: String,
        body: String,
        referenceId: String?,
    ): AppNotification = withContext(ioDispatcher) {
        val created = AppNotification(
            id = "local_notif_${UUID.randomUUID()}",
            type = type,
            title = title,
            body = body,
            isRead = false,
            createdAt = Instant.now(),
            referenceId = referenceId,
        )
        localNotifications.add(0, created)

        // Best-effort persist to Supabase via RPC if available
        runCatching {
            val params = buildJsonObject {
                put("p_type", type)
                put("p_title", title)
                put("p_body", body)
            }
            client.postgrest.rpc("create_user_notification", params)
        }
        created
    }

    private companion object {
        const val TABLE = "notifications"
    }
}
