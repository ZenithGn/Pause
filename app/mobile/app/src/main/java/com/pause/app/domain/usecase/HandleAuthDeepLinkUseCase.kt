package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository

/**
 * Xử lý deep link `pause://auth-callback#access_token=…&refresh_token=…`
 * (xác nhận email / khôi phục mật khẩu). Xem `MainActivity`.
 */
class HandleAuthDeepLinkUseCase(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(uri: String?): Result<AuthSession?> =
        authResult { authRepository.awaitInitialization(); authRepository.handleAuthDeepLink(uri) }
}
