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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.domain.model.AuthField
import com.pause.app.presentation.common.components.PauseAuthTopBar
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.common.components.PauseLogo
import com.pause.app.presentation.common.components.PausePasswordField
import com.pause.app.presentation.common.components.PausePrimaryButton
import com.pause.app.presentation.theme.PauseColors

/** FR-01.4 step 3 – set a new password on the recovery session. */
@Composable
fun ResetPasswordScreen(
    state: AuthUiState,
    onBack: () -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .imePadding(),
    ) {
        PauseAuthTopBar(
            title = stringResource(R.string.reset_title),
            onBack = onBack,
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 8.dp),
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

            PausePasswordField(
                value = state.password,
                onValueChange = onPasswordChange,
                label = stringResource(R.string.reset_new_password_label),
                placeholder = stringResource(R.string.register_password_hint),
                error = state.fieldErrors[AuthField.PASSWORD],
                enabled = !state.isLoading,
            )
            Spacer(modifier = Modifier.height(8.dp))
            PausePasswordField(
                value = state.confirmPassword,
                onValueChange = onConfirmPasswordChange,
                label = stringResource(R.string.register_confirm_password_label),
                error = state.fieldErrors[AuthField.CONFIRM_PASSWORD],
                enabled = !state.isLoading,
                imeAction = ImeAction.Done,
            )
            Spacer(modifier = Modifier.height(20.dp))
            PausePrimaryButton(
                text = stringResource(R.string.reset_cta),
                onClick = onSubmit,
                loading = state.isLoading,
            )
        }
    }
}
