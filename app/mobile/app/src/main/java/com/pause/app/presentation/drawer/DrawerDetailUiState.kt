package com.pause.app.presentation.drawer

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.Photo
import com.pause.app.presentation.common.UiText

/** FR-02.3 → FR-02.6 – drawer detail (photos, multi-select, upload, edit, delete). */
data class DrawerDetailUiState(
    val isLoading: Boolean = true,
    val drawer: Drawer? = null,
    val photos: List<Photo> = emptyList(),
    /** Photo id → signed thumbnail URL. */
    val thumbnailUrls: Map<String, String> = emptyMap(),
    /** Photo id → signed original URL (for the viewer). */
    val originalUrls: Map<String, String> = emptyMap(),
    val error: UiText? = null,
    val toast: UiText? = null,
    val isUploading: Boolean = false,
    val uploadCompleted: Int = 0,
    val uploadTotal: Int = 0,
    val isSelectionMode: Boolean = false,
    val selectedPhotoIds: Set<String> = emptySet(),
    val isDeletingPhotos: Boolean = false,
    val isLoadingMore: Boolean = false,
    val canLoadMore: Boolean = false,
    val deleted: Boolean = false,
) {
    val canWrite: Boolean get() = drawer?.canWrite == true
    val selectionCount: Int get() = selectedPhotoIds.size
}
