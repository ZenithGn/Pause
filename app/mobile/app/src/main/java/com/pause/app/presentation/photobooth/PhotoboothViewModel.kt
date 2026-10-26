package com.pause.app.presentation.photobooth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.DrawerRepository
import com.pause.app.domain.repository.PhotoRepository
import com.pause.app.domain.repository.PhotoboothRepository
import com.pause.app.domain.usecase.CreatePhotoboothUseCase
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PhotoboothViewModel(
    private val photoboothRepository: PhotoboothRepository,
    private val createPhotoboothUseCase: CreatePhotoboothUseCase,
    private val drawerRepository: DrawerRepository,
    private val photoRepository: PhotoRepository,
) : ViewModel() {
    private var requestedDrawerId: String? = null
    private val _state = MutableStateFlow(PhotoboothUiState())
    val state: StateFlow<PhotoboothUiState> = _state.asStateFlow()

    fun start(drawerId: String? = null) {
        requestedDrawerId = drawerId
        loadTemplates()
    }

    fun loadTemplates() = viewModelScope.launch {
        _state.update { it.copy(isLoadingTemplates = true, error = null) }
        runCatching { photoboothRepository.getActiveTemplates() }
            .onSuccess { templates -> _state.update { it.copy(isLoadingTemplates = false, templates = templates) } }
            .onFailure { exception ->
                android.util.Log.e("Photobooth", "Failed to load templates", exception)
                _state.update { it.copy(isLoadingTemplates = false, error = UiText.Resource(R.string.photobooth_error_templates)) }
            }
    }

    fun selectTemplate(templateId: String) {
        val template = _state.value.templates.firstOrNull { it.id == templateId } ?: return
        _state.update { it.copy(selectedTemplate = template, selectedPhotoIds = emptyList(), savedDraftId = null) }
        loadDrawers()
    }

    private fun loadDrawers() = viewModelScope.launch {
        runCatching { drawerRepository.listDrawers() }
            .onSuccess { drawers ->
                val initialDrawer = drawers.firstOrNull { it.id == requestedDrawerId } ?: drawers.firstOrNull()
                _state.update { it.copy(drawers = drawers, selectedDrawerId = initialDrawer?.id) }
                initialDrawer?.let { loadPhotos(it.id) }
            }
            .onFailure { _state.update { it.copy(error = UiText.Resource(R.string.error_network)) } }
    }

    fun selectDrawer(drawerId: String) {
        _state.update { it.copy(selectedDrawerId = drawerId, selectedPhotoIds = emptyList()) }
        loadPhotos(drawerId)
    }

    private fun loadPhotos(drawerId: String) = viewModelScope.launch {
        _state.update { it.copy(isLoadingPhotos = true, error = null) }
        runCatching {
            val photos = photoRepository.getPhotos(drawerId, 0, 60)
            val urls = photoRepository.signedPhotoUrls(photos)
            photos to urls.associate { it.photoId to (it.thumbnailUrl ?: it.originalUrl).orEmpty() }
        }.onSuccess { (photos, urls) ->
            _state.update { it.copy(isLoadingPhotos = false, photos = photos, photoUrls = urls.filterValues(String::isNotBlank)) }
        }.onFailure {
            _state.update { it.copy(isLoadingPhotos = false, error = UiText.Resource(R.string.photobooth_error_photos)) }
        }
    }

    fun togglePhoto(photo: Photo) {
        val current = _state.value
        val chosen = current.selectedPhotoIds
        val next = when {
            photo.id in chosen -> chosen - photo.id
            chosen.size >= current.requiredSlots -> chosen
            else -> chosen + photo.id
        }
        _state.update { it.copy(selectedPhotoIds = next, savedDraftId = null) }
    }

    fun onCaptionChange(value: String) {
        _state.update { it.copy(caption = value.take(40)) }
    }

    /** FR-03.2 – render preview + upload Cloudinary + persist draft. */
    fun saveDraft() = viewModelScope.launch {
        val current = _state.value
        val template = current.selectedTemplate ?: return@launch
        if (!current.canPreview || current.isSaving) return@launch

        val orderedUrls = current.selectedPhotoIds.map { id ->
            current.photoUrls[id].orEmpty()
        }

        _state.update { it.copy(isSaving = true, error = null) }
        createPhotoboothUseCase(
            template = template,
            photoIds = current.selectedPhotoIds,
            photoUrls = orderedUrls,
            caption = current.caption.trim().ifBlank { null },
        )
            .onSuccess { draft ->
                _state.update {
                    it.copy(
                        isSaving = false,
                        savedDraftId = draft.id,
                        previewUrl = draft.previewUrl,
                    )
                }
            }
            .onFailure {
                _state.update {
                    it.copy(isSaving = false, error = UiText.Resource(R.string.photobooth_error_save))
                }
            }
    }
}
