package com.pause.app.presentation.drawer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.RawPhoto
import com.pause.app.domain.usecase.DeleteDrawerUseCase
import com.pause.app.domain.usecase.DeletePhotosUseCase
import com.pause.app.domain.usecase.DrawerLimits
import com.pause.app.domain.usecase.GetDrawerUseCase
import com.pause.app.domain.usecase.GetPhotoUrlsUseCase
import com.pause.app.domain.usecase.GetPhotosUseCase
import com.pause.app.domain.usecase.UpdateDrawerUseCase
import com.pause.app.domain.usecase.UploadPhotosUseCase
import com.pause.app.presentation.common.DrawerFailureMapper
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** FR-02.3 → FR-02.6 – drawer detail ViewModel. */
class DrawerDetailViewModel(
    private val drawerId: String,
    private val getDrawerUseCase: GetDrawerUseCase,
    private val getPhotosUseCase: GetPhotosUseCase,
    private val getPhotoUrlsUseCase: GetPhotoUrlsUseCase,
    private val uploadPhotosUseCase: UploadPhotosUseCase,
    private val deletePhotosUseCase: DeletePhotosUseCase,
    private val updateDrawerUseCase: UpdateDrawerUseCase,
    private val deleteDrawerUseCase: DeleteDrawerUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(DrawerDetailUiState())
    val state: StateFlow<DrawerDetailUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            getDrawerUseCase(drawerId)
                .onSuccess { drawer ->
                    _state.update { it.copy(drawer = drawer) }
                    loadFirstPage()
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(isLoading = false, error = DrawerFailureMapper.toUiText(error.asDrawerFailure()))
                    }
                }
        }
    }

    fun refreshDrawer() {
        viewModelScope.launch {
            getDrawerUseCase(drawerId).onSuccess { drawer ->
                _state.update { it.copy(drawer = drawer) }
            }
        }
    }

    private suspend fun loadFirstPage() {
        getPhotosUseCase(drawerId, offset = 0)
            .onSuccess { photos ->
                val urls = getPhotoUrlsUseCase(photos).getOrNull().orEmpty()
                _state.update { current ->
                    current.copy(
                        isLoading = false,
                        photos = photos,
                        thumbnailUrls = urls.associate { it.photoId to it.thumbnailUrl.orEmpty() }
                            .filterValues { it.isNotBlank() },
                        originalUrls = urls.associate { it.photoId to it.originalUrl.orEmpty() }
                            .filterValues { it.isNotBlank() },
                        canLoadMore = photos.size >= DrawerLimits.PAGE_SIZE,
                    )
                }
            }
            .onFailure { error ->
                _state.update {
                    it.copy(isLoading = false, error = DrawerFailureMapper.toUiText(error.asDrawerFailure()))
                }
            }
    }

    fun loadMore() {
        val current = _state.value
        if (current.isLoadingMore || !current.canLoadMore) return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingMore = true) }
            getPhotosUseCase(drawerId, offset = current.photos.size)
                .onSuccess { page ->
                    val urls = getPhotoUrlsUseCase(page).getOrNull().orEmpty()
                    _state.update { state ->
                        state.copy(
                            isLoadingMore = false,
                            photos = state.photos + page,
                            thumbnailUrls = state.thumbnailUrls + urls
                                .associate { it.photoId to it.thumbnailUrl.orEmpty() }
                                .filterValues { it.isNotBlank() },
                            originalUrls = state.originalUrls + urls
                                .associate { it.photoId to it.originalUrl.orEmpty() }
                                .filterValues { it.isNotBlank() },
                            canLoadMore = page.size >= DrawerLimits.PAGE_SIZE,
                        )
                    }
                }
                .onFailure {
                    _state.update { it.copy(isLoadingMore = false) }
                }
        }
    }

    /** FR-02.5 – compress + upload a picked batch. */
    fun upload(rawPhotos: List<RawPhoto>) {
        val drawer = _state.value.drawer ?: return
        if (rawPhotos.isEmpty() || _state.value.isUploading) return

        viewModelScope.launch {
            _state.update {
                it.copy(
                    isUploading = true,
                    uploadCompleted = 0,
                    uploadTotal = rawPhotos.size,
                    error = null,
                )
            }
            uploadPhotosUseCase(drawer, rawPhotos) { completed, total ->
                _state.update { it.copy(uploadCompleted = completed, uploadTotal = total) }
            }
                .onSuccess { result ->
                    val urls = getPhotoUrlsUseCase(result.uploaded).getOrNull().orEmpty()
                    _state.update { current ->
                        current.copy(
                            isUploading = false,
                            photos = result.uploaded + current.photos,
                            thumbnailUrls = current.thumbnailUrls + urls
                                .associate { it.photoId to it.thumbnailUrl.orEmpty() }
                                .filterValues { it.isNotBlank() },
                            originalUrls = current.originalUrls + urls
                                .associate { it.photoId to it.originalUrl.orEmpty() }
                                .filterValues { it.isNotBlank() },
                            toast = when {
                                result.failures.isNotEmpty() -> UiText.Resource(
                                    R.string.drawer_upload_partial,
                                    listOf(result.uploaded.size, result.failures.size),
                                )

                                result.uploaded.isNotEmpty() -> UiText.Resource(
                                    R.string.drawer_upload_done,
                                    listOf(result.uploaded.size),
                                )

                                else -> null
                            },
                        )
                    }
                    refreshDrawer()
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isUploading = false,
                            error = DrawerFailureMapper.toUiText(error.asDrawerFailure()),
                        )
                    }
                }
        }
    }

    fun enterSelectionMode() {
        _state.update { it.copy(isSelectionMode = true) }
    }

    fun exitSelectionMode() {
        _state.update { it.copy(isSelectionMode = false, selectedPhotoIds = emptySet()) }
    }

    fun toggleSelection(photoId: String) {
        _state.update { current ->
            val selected = if (photoId in current.selectedPhotoIds) {
                current.selectedPhotoIds - photoId
            } else {
                current.selectedPhotoIds + photoId
            }
            current.copy(isSelectionMode = true, selectedPhotoIds = selected)
        }
    }

    fun deleteSelected() {
        val current = _state.value
        val drawer = current.drawer ?: return
        val selected = current.photos.filter { it.id in current.selectedPhotoIds }
        if (selected.isEmpty() || current.isDeletingPhotos) return

        viewModelScope.launch {
            _state.update { it.copy(isDeletingPhotos = true) }
            deletePhotosUseCase(drawer, selected)
                .onSuccess { count ->
                    val removedIds = selected.map(Photo::id).toSet()
                    _state.update { state ->
                        state.copy(
                            isDeletingPhotos = false,
                            isSelectionMode = false,
                            selectedPhotoIds = emptySet(),
                            photos = state.photos.filterNot { it.id in removedIds },
                            thumbnailUrls = state.thumbnailUrls - removedIds,
                            originalUrls = state.originalUrls - removedIds,
                            toast = UiText.Resource(R.string.drawer_photos_deleted, listOf(count)),
                        )
                    }
                    refreshDrawer()
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isDeletingPhotos = false,
                            error = DrawerFailureMapper.toUiText(error.asDrawerFailure()),
                        )
                    }
                }
        }
    }

    /** FR-02.3 – inline rename / description edit. */
    fun updateDrawer(name: String, description: String?) {
        val drawer = _state.value.drawer ?: return
        viewModelScope.launch {
            updateDrawerUseCase(drawer, name, description)
                .onSuccess { updated ->
                    _state.update {
                        it.copy(drawer = updated, toast = UiText.Resource(R.string.drawer_updated))
                    }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(error = DrawerFailureMapper.toUiText(error.asDrawerFailure()))
                    }
                }
        }
    }

    /** FR-02.4 */
    fun deleteDrawer() {
        val drawer = _state.value.drawer ?: return
        viewModelScope.launch {
            deleteDrawerUseCase(drawer)
                .onSuccess {
                    _state.update { it.copy(deleted = true) }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(error = DrawerFailureMapper.toUiText(error.asDrawerFailure()))
                    }
                }
        }
    }

    fun consumeToast() {
        _state.update { it.copy(toast = null) }
    }

    fun dismissError() {
        _state.update { it.copy(error = null) }
    }
}
