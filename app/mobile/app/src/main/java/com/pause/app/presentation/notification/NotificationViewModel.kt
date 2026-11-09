package com.pause.app.presentation.notification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.domain.model.AppNotification
import com.pause.app.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class NotificationUiState(
    val isLoading: Boolean = false,
    val notifications: List<AppNotification> = emptyList(),
    val showUnreadOnly: Boolean = false,
) {
    val unreadCount: Int
        get() = notifications.count { !it.isRead }

    val displayedNotifications: List<AppNotification>
        get() = if (showUnreadOnly) notifications.filter { !it.isRead } else notifications
}

class NotificationViewModel(
    private val notificationRepository: NotificationRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(NotificationUiState())
    val state: StateFlow<NotificationUiState> = _state.asStateFlow()

    fun loadNotifications() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val list = runCatching { notificationRepository.getNotifications() }
                .getOrDefault(emptyList())
            _state.update {
                it.copy(
                    isLoading = false,
                    notifications = list,
                )
            }
        }
    }

    fun setFilter(unreadOnly: Boolean) {
        _state.update { it.copy(showUnreadOnly = unreadOnly) }
    }

    fun markAsRead(notificationId: String) {
        viewModelScope.launch {
            notificationRepository.markAsRead(notificationId)
            _state.update { current ->
                current.copy(
                    notifications = current.notifications.map {
                        if (it.id == notificationId) it.copy(isRead = true) else it
                    },
                )
            }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            notificationRepository.markAllAsRead()
            _state.update { current ->
                current.copy(
                    notifications = current.notifications.map { it.copy(isRead = true) },
                )
            }
        }
    }

    fun pushNotification(
        type: String,
        title: String,
        body: String,
        referenceId: String? = null,
    ) {
        viewModelScope.launch {
            notificationRepository.createNotification(type, title, body, referenceId)
            loadNotifications()
        }
    }
}
