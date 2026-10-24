package com.pause.app.presentation.photobooth

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.presentation.common.UiText

data class PhotoboothUiState(
    val isLoadingTemplates: Boolean = true,
    val templates: List<PhotoboothTemplate> = emptyList(),
    val selectedTemplate: PhotoboothTemplate? = null,
    val drawers: List<Drawer> = emptyList(),
    val selectedDrawerId: String? = null,
    val isLoadingPhotos: Boolean = false,
    val photos: List<Photo> = emptyList(),
    val photoUrls: Map<String, String> = emptyMap(),
    val selectedPhotoIds: List<String> = emptyList(),
    val isSaving: Boolean = false,
    val savedDraftId: String? = null,
    val error: UiText? = null,
) {
    val requiredSlots: Int get() = selectedTemplate?.slotCount ?: 0
    val canPreview: Boolean get() = requiredSlots > 0 && selectedPhotoIds.size == requiredSlots
}
