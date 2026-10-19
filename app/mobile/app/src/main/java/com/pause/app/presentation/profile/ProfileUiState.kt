package com.pause.app.presentation.profile

import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.UserProfile
import com.pause.app.presentation.common.UiText

/** FR-01.5 – profile screen state. */
data class ProfileUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val isEditing: Boolean = false,
    val profile: UserProfile? = null,
    val editName: String = "",
    val editPhone: String = "",
    val avatarUrl: String? = null,
    val fieldErrors: Map<AuthField, UiText> = emptyMap(),
    val formError: UiText? = null,
    val message: UiText? = null,
    val signedOut: Boolean = false,
)
