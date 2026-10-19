package com.pause.app.domain.repository

import com.pause.app.domain.model.AuthSession
import kotlinx.coroutines.flow.Flow

/** Result of a successful sign-up: either pending email confirmation or signed in. */
sealed interface SignUpOutcome {
    data class ConfirmationRequired(val email: String) : SignUpOutcome
    data class SignedIn(val session: AuthSession) : SignUpOutcome
}

/**
 * Authentication boundary (FR-01.1 → FR-01.4).
 *
 * All methods throw [com.pause.app.domain.model.AuthFailure] on expected errors;
 * unexpected errors bubble up as-is and are mapped to `Unknown` by the data layer.
 */
interface AuthRepository {

    /** Emits the current session whenever Supabase refreshes / clears it (T-01.22). */
    val sessionChanges: Flow<AuthSession?>

    /** Suspends until the persisted session has been restored from storage. */
    suspend fun awaitInitialization()

    suspend fun currentSession(): AuthSession?

    suspend fun signUp(email: String, password: String, displayName: String): SignUpOutcome

    suspend fun signIn(email: String, password: String): AuthSession

    suspend fun signInWithGoogle(idToken: String, nonce: String? = null): AuthSession

    suspend fun signOut()

    suspend fun resetPassword(email: String)

    suspend fun resendConfirmationEmail(email: String)

    /** Uses the short-lived recovery session created by a reset deep link. */
    suspend fun updatePassword(newPassword: String): AuthSession

    /**
     * Handles `pause://auth-callback#access_token=...` links coming from the
     * confirmation / recovery emails.
     *
     * @return the restored session, or `null` when the link carries no token.
     */
    suspend fun handleAuthDeepLink(uri: String?): AuthSession?
}
