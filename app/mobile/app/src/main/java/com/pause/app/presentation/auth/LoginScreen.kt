package com.pause.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pause.app.BuildConfig
import com.pause.app.R
import com.pause.app.domain.model.AuthField
import com.pause.app.presentation.common.components.PauseDividerLabel
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.common.components.PauseLogo
import com.pause.app.presentation.common.components.PausePasswordField
import com.pause.app.presentation.common.components.PausePrimaryButton
import com.pause.app.presentation.common.components.PauseSocialButton
import com.pause.app.presentation.common.components.PauseTextButton
import com.pause.app.presentation.common.components.PauseTextField
import com.pause.app.presentation.theme.PauseColors
import androidx.compose.ui.graphics.Color

/**
 * Screen 1 of the Figma auth flow – dark logo area (~1/3) + light form area.
 * FR-01.2
 */
@Composable
fun LoginScreen(
    state: AuthUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSignIn: () -> Unit,
    onForgotPassword: () -> Unit,
    onRegister: () -> Unit,
    onGoogleIdToken: (String, String) -> Unit,
    onGoogleCancelled: () -> Unit,
    onGoogleFailure: (Throwable) -> Unit,
) {
    val launchGoogle = rememberGoogleSignInAction(
        serverClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID,
        onIdToken = onGoogleIdToken,
        onCancelled = onGoogleCancelled,
        onFailure = onGoogleFailure,
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .imePadding(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.34f)
                .background(PauseColors.Ink)
                .padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                PauseLogo(color = Color.White)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.app_tagline),
                    color = Color.White.copy(alpha = 0.65f),
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                )
            }
        }

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.66f),
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            color = PauseColors.Surface,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 28.dp),
            ) {
                Text(
                    text = stringResource(R.string.login_welcome_back),
                    style = MaterialTheme.typography.headlineMedium,
                    color = PauseColors.Ink,
                )
                Spacer(modifier = Modifier.height(20.dp))

                PauseErrorBanner(state.formError)
                if (state.formError != null) Spacer(modifier = Modifier.height(16.dp))

                PauseTextField(
                    value = state.email,
                    onValueChange = onEmailChange,
                    label = stringResource(R.string.login_email_label),
                    placeholder = stringResource(R.string.login_email_placeholder),
                    error = state.fieldErrors[AuthField.EMAIL],
                    enabled = !state.isLoading,
                )
                Spacer(modifier = Modifier.height(8.dp))

                PausePasswordField(
                    value = state.password,
                    onValueChange = onPasswordChange,
                    label = stringResource(R.string.login_password_label),
                    placeholder = stringResource(R.string.login_password_placeholder),
                    error = state.fieldErrors[AuthField.PASSWORD],
                    enabled = !state.isLoading,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    PauseTextButton(
                        text = stringResource(R.string.login_forgot_password),
                        onClick = onForgotPassword,
                        enabled = !state.isLoading,
                    )
                }

                PausePrimaryButton(
                    text = stringResource(R.string.login_cta),
                    onClick = onSignIn,
                    loading = state.isLoading,
                )

                Spacer(modifier = Modifier.height(20.dp))
                PauseDividerLabel(text = stringResource(R.string.or_continue_with))
                Spacer(modifier = Modifier.height(20.dp))

                PauseSocialButton(
                    text = stringResource(R.string.login_with_google),
                    mark = "G",
                    onClick = launchGoogle,
                    enabled = !state.isLoading,
                )
                Spacer(modifier = Modifier.height(10.dp))
                PauseSocialButton(
                    text = stringResource(R.string.login_with_apple),
                    mark = "",
                    onClick = {},
                    enabled = false,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = stringResource(R.string.login_apple_coming_soon),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                )

                Spacer(modifier = Modifier.height(16.dp))
                PauseTextButton(
                    text = stringResource(R.string.login_no_account),
                    onClick = onRegister,
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
