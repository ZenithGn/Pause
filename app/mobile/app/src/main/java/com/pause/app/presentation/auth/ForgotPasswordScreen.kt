package com.pause.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.domain.model.AuthField
import com.pause.app.presentation.common.components.PauseAuthTopBar
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.common.components.PauseLogo
import com.pause.app.presentation.common.components.PausePrimaryButton
import com.pause.app.presentation.common.components.PauseTextButton
import com.pause.app.presentation.common.components.PauseTextField
import com.pause.app.presentation.theme.PauseColors

/** Screen 3 of the Figma auth flow. FR-01.4 step 1. */
@Composable
fun ForgotPasswordScreen(
    state: AuthUiState,
    onBack: () -> Unit,
    onEmailChange: (String) -> Unit,
    onSendResetEmail: () -> Unit,
    onBackToLogin: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .imePadding(),
    ) {
        PauseAuthTopBar(
            title = stringResource(R.string.forgot_title),
            onBack = onBack,
        )

        if (state.resetEmailSentTo != null) {
            ResetEmailSentPanel(
                onBackToLogin = onBackToLogin,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp, vertical = 8.dp),
            )
        } else {
            ForgotPasswordForm(
                state = state,
                onEmailChange = onEmailChange,
                onSendResetEmail = onSendResetEmail,
                onBackToLogin = onBackToLogin,
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 8.dp),
            )
        }
    }
}

@Composable
private fun ForgotPasswordForm(
    state: AuthUiState,
    onEmailChange: (String) -> Unit,
    onSendResetEmail: () -> Unit,
    onBackToLogin: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(16.dp))
        PauseLogo()
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = stringResource(R.string.forgot_instruction),
            style = MaterialTheme.typography.bodyLarge,
            color = PauseColors.Muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(24.dp))

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
        Spacer(modifier = Modifier.height(20.dp))
        PausePrimaryButton(
            text = stringResource(R.string.forgot_cta),
            onClick = onSendResetEmail,
            loading = state.isLoading,
        )
        Spacer(modifier = Modifier.height(8.dp))
        PauseTextButton(
            text = stringResource(R.string.back),
            onClick = onBackToLogin,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun ResetEmailSentPanel(
    onBackToLogin: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(16.dp))
        PauseLogo()
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = stringResource(R.string.forgot_sent_title),
            style = MaterialTheme.typography.headlineSmall,
            color = PauseColors.Ink,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.forgot_sent_message),
            style = MaterialTheme.typography.bodyLarge,
            color = PauseColors.Muted,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(24.dp))
        PausePrimaryButton(
            text = stringResource(R.string.back),
            onClick = onBackToLogin,
        )
    }
}
