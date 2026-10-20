package com.pause.app.presentation.share

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.domain.model.SharePermission
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.BadgeChip
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.common.components.PausePrimaryButton
import com.pause.app.presentation.common.components.PauseTextField
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.theme.PauseColors
import kotlinx.coroutines.delay

/** FR-02.7 – share a drawer + manage existing shares (owner only). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareDrawerScreen(
    state: ShareDrawerUiState,
    onBack: () -> Unit,
    onEmailChange: (String) -> Unit,
    onPermissionChange: (SharePermission) -> Unit,
    onSubmit: () -> Unit,
    onRevoke: (com.pause.app.domain.model.DrawerShare) -> Unit,
    onConsumeToast: () -> Unit,
) {
    var toast by remember { mutableStateOf<UiText?>(null) }

    LaunchedEffect(state.toast) {
        state.toast?.let {
            toast = it
            onConsumeToast()
        }
    }
    LaunchedEffect(toast) {
        if (toast != null) {
            delay(2_500)
            toast = null
        }
    }

    Scaffold(
        containerColor = PauseColors.Paper,
        topBar = {
            TopAppBar(
                title = { Text(text = stringResource(R.string.share_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back),
                            tint = PauseColors.Ink,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PauseColors.Paper),
            )
        },
    ) { innerPadding ->
        when {
            state.isLoading -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = PauseColors.Ink)
            }

            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .imePadding(),
            ) {
                if (state.drawer?.isOwner != true) {
                    PauseErrorBanner(
                        message = UiText.Resource(R.string.share_owner_only),
                        modifier = Modifier.padding(top = 8.dp),
                    )
                    return@Column
                }

                state.error?.let {
                    PauseErrorBanner(message = it, modifier = Modifier.padding(top = 8.dp))
                }

                Spacer(modifier = Modifier.height(8.dp))
                PauseTextField(
                    value = state.email,
                    onValueChange = onEmailChange,
                    label = stringResource(R.string.share_email_label),
                    placeholder = stringResource(R.string.share_email_placeholder),
                    error = state.emailError,
                    enabled = !state.isSubmitting,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.share_permission_label),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = state.permission == SharePermission.VIEW,
                        onClick = { onPermissionChange(SharePermission.VIEW) },
                        label = { Text(stringResource(R.string.share_permission_view)) },
                    )
                    FilterChip(
                        selected = state.permission == SharePermission.EDIT,
                        onClick = { onPermissionChange(SharePermission.EDIT) },
                        label = { Text(stringResource(R.string.share_permission_edit)) },
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                PausePrimaryButton(
                    text = stringResource(R.string.share_submit),
                    onClick = onSubmit,
                    loading = state.isSubmitting,
                )

                Spacer(modifier = Modifier.height(24.dp))
                HorizontalDivider(color = PauseColors.Line)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.share_people_section),
                    style = MaterialTheme.typography.titleLarge,
                    color = PauseColors.Ink,
                )

                if (state.shares.isEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.share_list_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                }

                state.shares.forEach { share ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .background(PauseColors.Surface, RoundedCornerShape(999.dp))
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                        ) {
                            Text(
                                text = share.displayName.take(1).uppercase(),
                                style = MaterialTheme.typography.titleLarge,
                                color = PauseColors.Ink,
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = share.displayName,
                                style = MaterialTheme.typography.bodyLarge,
                                color = PauseColors.Ink,
                            )
                            Text(
                                text = share.email,
                                style = MaterialTheme.typography.bodyMedium,
                                color = PauseColors.Muted,
                            )
                        }
                        BadgeChip(
                            text = stringResource(
                                if (share.permission == SharePermission.EDIT) {
                                    R.string.share_permission_edit
                                } else {
                                    R.string.share_permission_view
                                },
                            ),
                            filled = false,
                        )
                        TextButton(onClick = { onRevoke(share) }) {
                            Text(
                                text = stringResource(R.string.share_revoke),
                                color = PauseColors.Error,
                            )
                        }
                    }
                    HorizontalDivider(color = PauseColors.Line)
                }

                Spacer(modifier = Modifier.height(40.dp))
            }
        }

        toast?.let { PauseToast(message = it.asString()) }
    }
}
