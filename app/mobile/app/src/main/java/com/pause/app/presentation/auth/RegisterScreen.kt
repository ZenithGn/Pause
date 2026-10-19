package com.pause.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.domain.model.AuthField
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.PauseAuthTopBar
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.common.components.PausePasswordField
import com.pause.app.presentation.common.components.PausePrimaryButton
import com.pause.app.presentation.common.components.PauseTextButton
import com.pause.app.presentation.common.components.PauseTextField
import com.pause.app.presentation.theme.PauseColors

/** Screen 2 of the Figma auth flow. FR-01.1 */
@Composable
fun RegisterScreen(
    state: AuthUiState,
    onBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onTermsChange: (Boolean) -> Unit,
    onSignUp: () -> Unit,
    onResendConfirmation: () -> Unit,
    onLoginClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .imePadding(),
    ) {
        PauseAuthTopBar(
            title = stringResource(R.string.register_title),
            onBack = onBack,
        )

        if (state.confirmationEmailSentTo != null) {
            VerificationSentPanel(
                email = state.confirmationEmailSentTo,
                isLoading = state.isLoading,
                onResend = onResendConfirmation,
                onLoginClick = onLoginClick,
            )
            return@Column
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 8.dp),
        ) {
            PauseErrorBanner(state.formError)
            if (state.formError != null) Spacer(modifier = Modifier.height(16.dp))

            PauseTextField(
                value = state.displayName,
                onValueChange = onNameChange,
                label = stringResource(R.string.register_name_label),
                placeholder = stringResource(R.string.register_name_placeholder),
                error = state.fieldErrors[AuthField.DISPLAY_NAME],
                enabled = !state.isLoading,
            )
            Spacer(modifier = Modifier.height(8.dp))

            PauseTextField(
                value = state.email,
                onValueChange = onEmailChange,
                label = stringResource(R.string.register_email_label),
                placeholder = stringResource(R.string.login_email_placeholder),
                error = state.fieldErrors[AuthField.EMAIL],
                enabled = !state.isLoading,
            )
            Spacer(modifier = Modifier.height(8.dp))

            PausePasswordField(
                value = state.password,
                onValueChange = onPasswordChange,
                label = stringResource(R.string.register_password_label),
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
                imeAction = androidx.compose.ui.text.input.ImeAction.Done,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .toggleable(
                        value = state.acceptedTerms,
                        enabled = !state.isLoading,
                        role = Role.Checkbox,
                        onValueChange = onTermsChange,
                    )
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = state.acceptedTerms,
                    onCheckedChange = null,
                    enabled = !state.isLoading,
                )
                Text(
                    text = stringResource(R.string.register_terms),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Ink,
                )
            }
            state.fieldErrors[AuthField.TERMS]?.let { error: UiText ->
                Text(
                    text = error.asString(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            PausePrimaryButton(
                text = stringResource(R.string.register_cta),
                onClick = onSignUp,
                loading = state.isLoading,
            )
            Spacer(modifier = Modifier.height(12.dp))
            PauseTextButton(
                text = stringResource(R.string.register_have_account),
                onClick = onLoginClick,
                enabled = !state.isLoading,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun VerificationSentPanel(
    email: String,
    isLoading: Boolean,
    onResend: () -> Unit,
    onLoginClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = stringResource(R.string.register_success_title),
            style = MaterialTheme.typography.headlineSmall,
            color = PauseColors.Ink,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.register_success_message, email),
            style = MaterialTheme.typography.bodyLarge,
            color = PauseColors.Muted,
        )
        Spacer(modifier = Modifier.height(24.dp))
        PausePrimaryButton(
            text = stringResource(R.string.register_resend_email),
            onClick = onResend,
            loading = isLoading,
        )
        Spacer(modifier = Modifier.height(8.dp))
        PauseTextButton(
            text = stringResource(R.string.register_have_account),
            onClick = onLoginClick,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
