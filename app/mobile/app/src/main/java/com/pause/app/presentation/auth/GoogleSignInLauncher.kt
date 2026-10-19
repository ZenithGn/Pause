package com.pause.app.presentation.auth

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.UUID

/**
 * Credential Manager based Google sign-in (FR-01.1 alternative flow).
 *
 * Returns a lambda that the login screen calls; the resulting ID token is passed
 * to [AuthViewModel.signInWithGoogle] which signs in through Supabase.
 *
 * @param serverClientId Google OAuth *Web application* client ID.
 */
@Composable
fun rememberGoogleSignInAction(
    serverClientId: String,
    onIdToken: (idToken: String, rawNonce: String) -> Unit,
    onCancelled: () -> Unit,
    onFailure: (Throwable) -> Unit,
): () -> Unit {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    return remember(serverClientId, context) {
        {
            scope.launch {
                if (serverClientId.isBlank()) {
                    onFailure(IllegalStateException("GOOGLE_WEB_CLIENT_ID is not configured"))
                    return@launch
                }
                try {
                    val rawNonce = UUID.randomUUID().toString()
                    val hashedNonce = MessageDigest.getInstance("SHA-256")
                        .digest(rawNonce.toByteArray())
                        .joinToString("") { byte -> "%02x".format(byte) }

                    val googleIdOption = GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setAutoSelectEnabled(false)
                        .setServerClientId(serverClientId)
                        .setNonce(hashedNonce)
                        .build()

                    val request = GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()

                    val credentialManager = CredentialManager.create(context)
                    val result = credentialManager.getCredential(context, request)
                    val credential = GoogleIdTokenCredential.createFrom(result.credential.data)
                    onIdToken(credential.idToken, rawNonce)
                } catch (cancellation: GetCredentialCancellationException) {
                    onCancelled()
                } catch (credentialError: GetCredentialException) {
                    onFailure(credentialError)
                } catch (error: Exception) {
                    onFailure(error)
                }
            }
            Unit
        }
    }
}
