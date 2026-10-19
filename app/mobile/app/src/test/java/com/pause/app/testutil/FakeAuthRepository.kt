package com.pause.app.testutil

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.model.User
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.repository.SignUpOutcome
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** In-memory [AuthRepository] used by unit/integration tests. */
class FakeAuthRepository : AuthRepository {

    val sessionState = MutableStateFlow<AuthSession?>(null)

    override val sessionChanges: Flow<AuthSession?> = sessionState

    var signUpFailure: AuthFailure? = null
    var signInFailure: AuthFailure? = null
    var resetPasswordFailure: AuthFailure? = null
    var updatePasswordFailure: AuthFailure? = null
    var deepLinkResult: AuthSession? = null

    var signUpOutcome: SignUpOutcome =
        SignUpOutcome.ConfirmationRequired("new-user@pause.app")

    var signInCalls = 0
    var signOutCalls = 0
    var resetPasswordCalls = mutableListOf<String>()
    var resendConfirmationCalls = mutableListOf<String>()
    var lastSignedUpEmail: String? = null
    var lastSignedUpDisplayName: String? = null
    var lastPasswordUpdate: String? = null
    var initializationAwaited = false

    override suspend fun awaitInitialization() {
        initializationAwaited = true
    }

    override suspend fun currentSession(): AuthSession? = sessionState.value

    override suspend fun signUp(
        email: String,
        password: String,
        displayName: String,
    ): SignUpOutcome {
        signUpFailure?.let { throw it }
        lastSignedUpEmail = email
        lastSignedUpDisplayName = displayName
        return signUpOutcome
    }

    override suspend fun signIn(email: String, password: String): AuthSession {
        signInCalls++
        signInFailure?.let { throw it }
        val session = FakeData.session(email)
        sessionState.value = session
        return session
    }

    override suspend fun signInWithGoogle(idToken: String, nonce: String?): AuthSession {
        val session = FakeData.session("google-user@pause.app")
        sessionState.value = session
        return session
    }

    override suspend fun signOut() {
        signOutCalls++
        sessionState.value = null
    }

    override suspend fun resetPassword(email: String) {
        resetPasswordFailure?.let { throw it }
        resetPasswordCalls += email
    }

    override suspend fun resendConfirmationEmail(email: String) {
        resendConfirmationCalls += email
    }

    override suspend fun updatePassword(newPassword: String): AuthSession {
        updatePasswordFailure?.let { throw it }
        lastPasswordUpdate = newPassword
        return sessionState.value ?: FakeData.session("recovery@pause.app")
    }

    override suspend fun handleAuthDeepLink(uri: String?): AuthSession? {
        if (uri.isNullOrBlank()) return null
        return deepLinkResult
    }
}

object FakeData {

    fun user(
        email: String = "user@pause.app",
        id: String = "user-id-1",
    ): User = User(id = id, email = email, emailConfirmed = true)

    fun session(
        email: String = "user@pause.app",
        isRecovery: Boolean = false,
    ): AuthSession = AuthSession(
        user = user(email = email),
        accessToken = "access-token",
        refreshToken = "refresh-token",
        isRecovery = isRecovery,
    )
}
