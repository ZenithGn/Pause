package com.pause.app.presentation.drawer

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.presentation.common.UiText

/** FR-02.1 / FR-02.2 / T-02.30 – list, create-sheet and pending invitations. */
data class DrawerListUiState(
    val isLoading: Boolean = true,
    val owned: List<Drawer> = emptyList(),
    val shared: List<Drawer> = emptyList(),
    val invitations: List<ShareInvitation> = emptyList(),
    val error: UiText? = null,
    val isCreateSheetOpen: Boolean = false,
    val createName: String = "",
    val createDescription: String = "",
    val isCreating: Boolean = false,
    val createNameError: UiText? = null,
    val createDescriptionError: UiText? = null,
    /** Non-null when the free-tier drawer quota is reached (FR-02.2 upsell). */
    val quotaReachedMaxDrawers: Int? = null,
    val toast: UiText? = null,
) {
    val isEmpty: Boolean get() = owned.isEmpty() && shared.isEmpty() && invitations.isEmpty()

    val recent: List<Drawer> get() = owned.take(3)

    val pendingInvitationCount: Int get() = invitations.count { it.status.wire == "pending" }
}
