package com.pause.app.presentation.drawer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.usecase.CreateDrawerUseCase
import com.pause.app.domain.usecase.GetDrawersUseCase
import com.pause.app.domain.usecase.GetShareInvitationsUseCase
import com.pause.app.domain.usecase.RespondShareInvitationUseCase
import com.pause.app.presentation.common.DrawerFailureMapper
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** FR-02.1 / FR-02.2 / T-02.30 – drawer list, creation and pending invitations. */
class DrawerListViewModel(
    private val getDrawersUseCase: GetDrawersUseCase,
    private val createDrawerUseCase: CreateDrawerUseCase,
    private val getShareInvitationsUseCase: GetShareInvitationsUseCase,
    private val respondShareInvitationUseCase: RespondShareInvitationUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(DrawerListUiState())
    val state: StateFlow<DrawerListUiState> = _state.asStateFlow()

    private var hasLoaded = false
    private var sessionUserId: String? = null

    /**
     * The ViewModel is scoped to the root navigation graph, so it survives a
     * sign-out/sign-in transition. Reset its in-memory state whenever the
     * authenticated account changes; otherwise account B briefly renders
     * account A's list until a manual refresh happens.
     */
    fun onSessionChanged(userId: String?) {
        if (sessionUserId == userId) return
        sessionUserId = userId
        hasLoaded = false
        _state.value = DrawerListUiState()
    }
    fun loadIfNeeded() {
        if (hasLoaded) return
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            val drawersResult = getDrawersUseCase()
            val invitations = getShareInvitationsUseCase().getOrNull().orEmpty()

            drawersResult
                .onSuccess { drawers ->
                    hasLoaded = true
                    _state.update {
                        it.copy(
                            isLoading = false,
                            owned = drawers.filter(Drawer::isOwner),
                            shared = drawers.filterNot(Drawer::isOwner),
                            invitations = invitations,
                        )
                    }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            invitations = invitations,
                            error = DrawerFailureMapper.toUiText(error.asDrawerFailure()),
                        )
                    }
                }
        }
    }

    /** T-02.22 / T-02.30 – accept or reject an invitation from the list screen. */
    fun respondInvitation(invitation: ShareInvitation, accept: Boolean) {
        viewModelScope.launch {
            respondShareInvitationUseCase(invitation, accept)
                .onSuccess {
                    _state.update { current ->
                        current.copy(
                            invitations = current.invitations.filterNot { it.id == invitation.id },
                            toast = UiText.Resource(
                                if (accept) R.string.invitation_accepted else R.string.invitation_rejected,
                            ),
                        )
                    }
                    if (accept) load()
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(error = DrawerFailureMapper.toUiText(error.asDrawerFailure()))
                    }
                }
        }
    }

    fun openCreateSheet() {
        _state.update {
            it.copy(
                isCreateSheetOpen = true,
                createName = "",
                createDescription = "",
                createNameError = null,
                createDescriptionError = null,
            )
        }
    }

    fun closeCreateSheet() {
        _state.update { it.copy(isCreateSheetOpen = false) }
    }

    fun onNameChange(value: String) {
        _state.update { it.copy(createName = value, createNameError = null) }
    }

    fun onDescriptionChange(value: String) {
        _state.update { it.copy(createDescription = value, createDescriptionError = null) }
    }

    fun createDrawer() {
        if (_state.value.isCreating) return
        viewModelScope.launch {
            _state.update {
                it.copy(isCreating = true, createNameError = null, createDescriptionError = null)
            }
            createDrawerUseCase(_state.value.createName, _state.value.createDescription)
                .onSuccess { drawer ->
                    _state.update {
                        it.copy(
                            isCreating = false,
                            isCreateSheetOpen = false,
                            owned = listOf(drawer) + it.owned,
                            toast = UiText.Resource(R.string.drawer_created),
                        )
                    }
                }
                .onFailure { error ->
                    val failure = error.asDrawerFailure()
                    when (failure) {
                        is DrawerFailure.InvalidInput -> _state.update {
                            it.copy(
                                isCreating = false,
                                createNameError = DrawerFailureMapper.fieldError(failure, DrawerField.NAME),
                                createDescriptionError = DrawerFailureMapper.fieldError(
                                    failure,
                                    DrawerField.DESCRIPTION,
                                ),
                            )
                        }

                        is DrawerFailure.DrawerQuotaReached -> _state.update {
                            it.copy(isCreating = false, quotaReachedMaxDrawers = failure.maxDrawers)
                        }

                        else -> _state.update {
                            it.copy(
                                isCreating = false,
                                error = DrawerFailureMapper.toUiText(failure),
                            )
                        }
                    }
                }
        }
    }

    fun dismissQuotaDialog() {
        _state.update { it.copy(quotaReachedMaxDrawers = null) }
    }

    fun consumeToast() {
        _state.update { it.copy(toast = null) }
    }

    fun onDrawerDeleted(drawerId: String) {
        _state.update { current ->
            current.copy(
                owned = current.owned.filterNot { it.id == drawerId },
                shared = current.shared.filterNot { it.id == drawerId },
                toast = UiText.Resource(R.string.drawer_deleted),
            )
        }
    }
}
