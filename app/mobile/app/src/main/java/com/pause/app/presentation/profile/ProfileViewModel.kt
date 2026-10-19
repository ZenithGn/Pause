package com.pause.app.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.UserProfile
import com.pause.app.domain.repository.ProfileRepository
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import com.pause.app.domain.usecase.GetProfileUseCase
import com.pause.app.domain.usecase.SignOutUseCase
import com.pause.app.domain.usecase.UpdateProfileUseCase
import com.pause.app.domain.usecase.UploadAvatarUseCase
import com.pause.app.presentation.common.AuthFailureMapper
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** FR-01.5 – view / edit the signed-in user's profile. */
class ProfileViewModel(
    private val getCurrentSessionUseCase: GetCurrentSessionUseCase,
    private val getProfileUseCase: GetProfileUseCase,
    private val updateProfileUseCase: UpdateProfileUseCase,
    private val uploadAvatarUseCase: UploadAvatarUseCase,
    private val profileRepository: ProfileRepository,
    private val signOutUseCase: SignOutUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    private var userId: String? = null

    fun load() {
        if (_state.value.profile != null && !_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, formError = null, signedOut = false) }
            val session = getCurrentSessionUseCase()
            if (session == null) {
                _state.update { it.copy(isLoading = false, signedOut = true) }
                return@launch
            }
            userId = session.user.id
            getProfileUseCase(session.user.id)
                .onSuccess { profile -> applyProfile(profile) }
                .onFailure(::applyFailure)
        }
    }

    fun startEditing() {
        val profile = _state.value.profile ?: return
        _state.update {
            it.copy(
                isEditing = true,
                editName = profile.displayName,
                editPhone = profile.phone.orEmpty(),
                fieldErrors = emptyMap(),
                formError = null,
            )
        }
    }

    fun cancelEditing() {
        _state.update { it.copy(isEditing = false, fieldErrors = emptyMap(), formError = null) }
    }

    fun onNameChange(value: String) {
        _state.update {
            it.copy(editName = value, fieldErrors = it.fieldErrors - AuthField.DISPLAY_NAME)
        }
    }

    fun onPhoneChange(value: String) {
        _state.update {
            it.copy(editPhone = value, fieldErrors = it.fieldErrors - AuthField.PHONE)
        }
    }

    fun save() {
        val id = userId ?: return
        if (_state.value.isSaving) return
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, formError = null, fieldErrors = emptyMap()) }
            updateProfileUseCase(
                userId = id,
                displayName = _state.value.editName,
                phone = _state.value.editPhone,
                avatarPath = _state.value.profile?.avatarPath,
            )
                .onSuccess { profile ->
                    applyProfile(profile)
                    _state.update {
                        it.copy(
                            isSaving = false,
                            isEditing = false,
                            message = UiText.Resource(R.string.profile_updated),
                        )
                    }
                }
                .onFailure { failure ->
                    _state.update { it.copy(isSaving = false) }
                    applyFailure(failure)
                }
        }
    }

    fun onAvatarPicked(bytes: ByteArray, mimeType: String) {
        val id = userId ?: return
        val profile = _state.value.profile ?: return
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, formError = null) }
            uploadAvatarUseCase(id, bytes, mimeType)
                .onSuccess { path ->
                    updateProfileUseCase(
                        userId = id,
                        displayName = profile.displayName,
                        phone = profile.phone,
                        avatarPath = path,
                    )
                        .onSuccess { updated ->
                            applyProfile(updated)
                            _state.update {
                                it.copy(isSaving = false, message = UiText.Resource(R.string.profile_updated))
                            }
                        }
                        .onFailure { failure ->
                            _state.update { it.copy(isSaving = false) }
                            applyFailure(failure)
                        }
                }
                .onFailure { failure ->
                    _state.update { it.copy(isSaving = false) }
                    applyFailure(failure)
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            signOutUseCase()
            _state.update { ProfileUiState(signedOut = true) }
        }
    }

    fun consumeMessage() {
        _state.update { it.copy(message = null) }
    }

    private suspend fun applyProfile(profile: UserProfile) {
        val avatarUrl = profile.avatarPath?.let { path -> profileRepository.signedAvatarUrl(path) }
        _state.update {
            it.copy(
                isLoading = false,
                isSaving = false,
                profile = profile,
                avatarUrl = avatarUrl,
                editName = profile.displayName,
                editPhone = profile.phone.orEmpty(),
            )
        }
    }

    private fun applyFailure(throwable: Throwable) {
        val failure = throwable as? AuthFailure ?: AuthFailure.Unknown(throwable.message)
        if (failure is AuthFailure.InvalidInput) {
            _state.update {
                it.copy(
                    fieldErrors = failure.errors.mapValues { (_, error) ->
                        AuthFailureMapper.validationText(error)
                    },
                )
            }
            return
        }
        _state.update {
            it.copy(isLoading = false, formError = AuthFailureMapper.toUiText(failure))
        }
    }
}
