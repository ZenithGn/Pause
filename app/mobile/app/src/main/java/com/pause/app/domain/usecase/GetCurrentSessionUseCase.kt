package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository

/** T-01.22 – read the session restored from storage (splash / auto-login). */
class GetCurrentSessionUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(): AuthSession? = authResult {
        authRepository.awaitInitialization()
        authRepository.currentSession()
    }.getOrNull()
}
