package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow

/** T-01.22 – react to session refresh / sign-out performed by any layer. */
class ObserveSessionUseCase(
    private val authRepository: AuthRepository,
) {
    operator fun invoke(): Flow<AuthSession?> = authRepository.sessionChanges
}
