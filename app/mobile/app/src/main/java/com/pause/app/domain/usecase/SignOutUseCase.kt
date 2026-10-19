package com.pause.app.domain.usecase

import com.pause.app.domain.repository.AuthRepository

/** FR-01.3 – sign out and clear the persisted session. */
class SignOutUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(): Result<Unit> = authResult { authRepository.signOut() }
}
