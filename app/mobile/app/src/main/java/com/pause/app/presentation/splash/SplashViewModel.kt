package com.pause.app.presentation.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** T-01.22 – decides between auto-login and the login screen. */
class SplashViewModel(
    private val getCurrentSessionUseCase: GetCurrentSessionUseCase,
) : ViewModel() {

    private val _isSignedIn = MutableStateFlow<Boolean?>(null)

    /** `null` while the persisted session is still being restored. */
    val isSignedIn: StateFlow<Boolean?> = _isSignedIn.asStateFlow()

    init {
        viewModelScope.launch {
            _isSignedIn.value = getCurrentSessionUseCase() != null
        }
    }
}
