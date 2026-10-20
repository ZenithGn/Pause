package com.pause.app.presentation.share

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.usecase.GetDrawerSharesUseCase
import com.pause.app.domain.usecase.GetDrawerUseCase
import com.pause.app.domain.usecase.RevokeShareUseCase
import com.pause.app.domain.usecase.ShareDrawerUseCase
import com.pause.app.presentation.common.DrawerFailureMapper
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** FR-02.7 – share / revoke state. */
data class ShareDrawerUiState(
    val isLoading: Boolean = true,
    val drawer: Drawer? = null,
    val shares: List<DrawerShare> = emptyList(),
    val email: String = "",
    val permission: SharePermission = SharePermission.VIEW,
    val isSubmitting: Boolean = false,
    val emailError: UiText? = null,
    val error: UiText? = null,
    val toast: UiText? = null,
)

/** FR-02.7 – add and revoke drawer shares. */
class ShareDrawerViewModel(
    private val drawerId: String,
    private val getDrawerUseCase: GetDrawerUseCase,
    private val getDrawerSharesUseCase: GetDrawerSharesUseCase,
    private val shareDrawerUseCase: ShareDrawerUseCase,
    private val revokeShareUseCase: RevokeShareUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(ShareDrawerUiState())
    val state: StateFlow<ShareDrawerUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            getDrawerUseCase(drawerId)
                .onSuccess { drawer ->
                    val shares = getDrawerSharesUseCase(drawer).getOrNull().orEmpty()
                    _state.update { it.copy(isLoading = false, drawer = drawer, shares = shares) }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = DrawerFailureMapper.toUiText(error.asDrawerFailure()),
                        )
                    }
                }
        }
    }

    fun onEmailChange(value: String) {
        _state.update { it.copy(email = value, emailError = null) }
    }

    fun onPermissionChange(permission: SharePermission) {
        _state.update { it.copy(permission = permission) }
    }

    fun submit() {
        val drawer = _state.value.drawer ?: return
        if (_state.value.isSubmitting) return

        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, emailError = null, error = null) }
            shareDrawerUseCase(drawer, _state.value.email, _state.value.permission)
                .onSuccess {
                    val shares = getDrawerSharesUseCase(drawer).getOrNull().orEmpty()
                    _state.update {
                        it.copy(
                            isSubmitting = false,
                            email = "",
                            shares = shares,
                            toast = UiText.Resource(R.string.share_success),
                        )
                    }
                }
                .onFailure { error ->
                    val failure = error.asDrawerFailure()
                    _state.update {
                        it.copy(
                            isSubmitting = false,
                            emailError = DrawerFailureMapper.fieldError(failure, DrawerField.SHARE_EMAIL),
                            error = if (failure is DrawerFailure.InvalidInput) null
                            else DrawerFailureMapper.toUiText(failure),
                        )
                    }
                }
        }
    }

    fun revoke(share: DrawerShare) {
        val drawer = _state.value.drawer ?: return
        viewModelScope.launch {
            revokeShareUseCase(drawer, share)
                .onSuccess {
                    _state.update {
                        it.copy(
                            shares = it.shares.filterNot { item -> item.id == share.id },
                            toast = UiText.Resource(R.string.share_revoked),
                        )
                    }
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
}

private fun Throwable.asDrawerFailure(): DrawerFailure =
    this as? DrawerFailure ?: DrawerFailure.Unknown(message)
