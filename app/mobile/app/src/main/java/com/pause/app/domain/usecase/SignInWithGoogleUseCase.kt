package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository

/**
 * FR-01.1 / FR-01.2 – Google sign-in.
 *
 * The ID token is obtained by the presentation layer through Credential Manager
 * (see `GoogleSignInLauncher`), keeping this use case Android-free.
 */
class SignInWithGoogleUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(idToken: String, nonce: String? = null): Result<AuthSession> {
        if (idToken.isBlank()) {
            return Result.failure(com.pause.app.domain.model.AuthFailure.GoogleSignInUnavailable)
        }
        return authResult { authRepository.signInWithGoogle(idToken, nonce) }
    }
}
