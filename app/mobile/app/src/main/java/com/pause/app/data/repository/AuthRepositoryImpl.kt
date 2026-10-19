package com.pause.app.data.repository

import android.net.Uri
import com.pause.app.data.mapper.toAuthFailure
import com.pause.app.data.mapper.toDomain
import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthSession
import com.pause.app.domain.repository.AuthRepository
import com.pause.app.domain.repository.SignUpOutcome
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.OtpType
import io.github.jan.supabase.gotrue.SessionStatus
import io.github.jan.supabase.gotrue.SignOutScope
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.parseSessionFromUrl
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.providers.builtin.IDToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Supabase-backed implementation of [AuthRepository] (T-01.08).
 *
 * Session persistence / auto-refresh is delegated to the Supabase SDK
 * (`autoLoadFromStorage` + `alwaysAutoRefresh`), which is what T-01.22 relies on.
 */
class AuthRepositoryImpl(
    private val client: SupabaseClient,
    private val redirectUrl: String,
) : AuthRepository {

    override val sessionChanges: Flow<AuthSession?> = client.auth.sessionStatus
        .map { status ->
            when (status) {
                is SessionStatus.Authenticated -> status.session.toDomain()
                else -> null
            }
        }
        .distinctUntilChanged()

    override suspend fun awaitInitialization() {
        runCatching { client.auth.awaitInitialization() }
    }

    override suspend fun currentSession(): AuthSession? =
        client.auth.currentSessionOrNull()?.toDomain()

    override suspend fun signUp(
        email: String,
        password: String,
        displayName: String,
    ): SignUpOutcome = authCall {
        client.auth.signUpWith(Email, redirectUrl) {
            this.email = email
            this.password = password
            data = buildJsonObject {
                put("display_name", displayName)
            }
        }
        val session = client.auth.currentSessionOrNull()
        if (session != null) {
            SignUpOutcome.SignedIn(session.toDomain())
        } else {
            SignUpOutcome.ConfirmationRequired(email)
        }
    }

    override suspend fun signIn(email: String, password: String): AuthSession = authCall {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        requireSession()
    }

    override suspend fun signInWithGoogle(idToken: String, nonce: String?): AuthSession = authCall {
        client.auth.signInWith(IDToken) {
            this.idToken = idToken
            provider = Google
            this.nonce = nonce
        }
        requireSession()
    }

    override suspend fun signOut() {
        runCatching { client.auth.signOut(SignOutScope.GLOBAL) }
    }

    override suspend fun resetPassword(email: String) = authCall {
        client.auth.resetPasswordForEmail(email, redirectUrl)
    }

    override suspend fun resendConfirmationEmail(email: String) = authCall {
        client.auth.resendEmail(OtpType.Email.SIGNUP, email, redirectUrl)
    }

    override suspend fun updatePassword(newPassword: String): AuthSession = authCall {
        client.auth.updateUser {
            password = newPassword
        }
        requireSession()
    }

    /**
     * Handles links coming from Supabase emails:
     * - implicit flow: `pause://auth-callback#access_token=…&refresh_token=…&type=recovery`
     * - PKCE flow: `pause://auth-callback?code=…`
     */
    override suspend fun handleAuthDeepLink(uri: String?): AuthSession? {
        if (uri.isNullOrBlank()) return null

        return authCall {
            val isRecovery = uri.contains("type=recovery", ignoreCase = true)
            val parsedSession = runCatching { client.auth.parseSessionFromUrl(uri) }.getOrNull()

            if (parsedSession != null) {
                client.auth.importSession(parsedSession)
                parsedSession.toDomain(isRecovery = isRecovery)
            } else {
                val code = Uri.parse(uri).getQueryParameter("code")
                    ?: throw AuthFailure.Unknown("Deep link does not contain a session or code")
                client.auth.exchangeCodeForSession(code).toDomain(isRecovery = true)
            }
        }
    }

    private fun requireSession(): AuthSession =
        client.auth.currentSessionOrNull()?.toDomain()
            ?: throw AuthFailure.SessionExpired

    private suspend inline fun <T> authCall(block: () -> T): T = try {
        block()
    } catch (error: Exception) {
        throw error.toAuthFailure()
    }
}
