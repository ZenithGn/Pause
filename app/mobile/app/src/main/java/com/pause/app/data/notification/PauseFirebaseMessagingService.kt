package com.pause.app.data.notification

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.pause.app.domain.repository.NotificationRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * FR-07 (T-07.03, T-07.08) – Firebase Cloud Messaging service.
 * Persists refreshed FCM tokens to Supabase (`public.device_tokens`) and
 * displays incoming push notifications on the system tray.
 */
class PauseFirebaseMessagingService : FirebaseMessagingService(), KoinComponent {

    private val notificationRepository: NotificationRepository by inject()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        serviceScope.launch {
            runCatching { notificationRepository.registerDeviceToken(token) }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title
            ?: message.data["title"]
            ?: "Pause"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: return

        PauseNotificationHelper.showNotification(
            context = applicationContext,
            title = title,
            body = body,
        )
    }
}
