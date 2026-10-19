package com.pause.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.pause.app.presentation.auth.AuthViewModel
import com.pause.app.presentation.navigation.PauseNavGraph
import com.pause.app.presentation.profile.ProfileViewModel
import com.pause.app.presentation.splash.SplashViewModel
import com.pause.app.presentation.theme.PauseTheme
import org.koin.androidx.compose.koinViewModel

class MainActivity : ComponentActivity() {

    /** Deep link payload (password recovery / email confirmation), consumed by Compose. */
    private var deepLinkUri by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deepLinkUri = intent?.data?.toString()

        setContent {
            PauseTheme {
                PauseApp(
                    deepLinkUri = deepLinkUri,
                    onDeepLinkConsumed = { deepLinkUri = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deepLinkUri = intent.data?.toString()
    }
}

@Composable
private fun PauseApp(
    deepLinkUri: String?,
    onDeepLinkConsumed: () -> Unit,
) {
    val authViewModel: AuthViewModel = koinViewModel()
    val profileViewModel: ProfileViewModel = koinViewModel()
    val splashViewModel: SplashViewModel = koinViewModel()

    PauseNavGraph(
        authViewModel = authViewModel,
        profileViewModel = profileViewModel,
        splashViewModel = splashViewModel,
        deepLinkUri = deepLinkUri,
        onDeepLinkConsumed = onDeepLinkConsumed,
    )
}
