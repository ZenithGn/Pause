package com.pause.app.presentation.drawer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.DrawerCard
import com.pause.app.presentation.common.components.DrawerEmptyState
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.theme.PauseColors
import kotlinx.coroutines.delay

/**
 * Figma "Memories" tab / drawer list (FR-02.1).
 * Owned and shared drawers are grouped so the "shared" badge reads naturally.
 */
@Composable
fun DrawerListScreen(
    state: DrawerListUiState,
    onDrawerClick: (Drawer) -> Unit,
    onCreateClick: () -> Unit,
    onDismissQuota: () -> Unit,
    onRetry: () -> Unit,
    onNavigate: (PauseTab) -> Unit,
    onConsumeToast: () -> Unit,
    onRespondInvitation: (ShareInvitation, Boolean) -> Unit,
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
        bottomBar = {
            PauseBottomBar(
                selected = PauseTab.MEMORIES,
                onSelect = onNavigate,
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onCreateClick,
                containerColor = PauseColors.Ink,
                contentColor = androidx.compose.ui.graphics.Color.White,
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text(text = stringResource(R.string.drawers_create)) },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            Box(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text(
                        text = stringResource(R.string.drawers_title),
                        style = MaterialTheme.typography.headlineMedium,
                        color = PauseColors.Ink,
                    )
                }
            }

            when {
                state.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = PauseColors.Ink)
                    }
                }

                state.error != null && state.isEmpty -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            text = state.error.asString(),
                            style = MaterialTheme.typography.bodyLarge,
                            color = PauseColors.Error,
                        )
                        TextButton(onClick = onRetry) {
                            Text(text = stringResource(R.string.drawers_retry))
                        }
                    }
                }

                state.isEmpty -> {
                    DrawerEmptyState(
                        title = stringResource(R.string.drawers_empty_title),
                        message = stringResource(R.string.drawers_empty_message),
                        actionLabel = stringResource(R.string.drawers_create),
                        onAction = onCreateClick,
                    )
                }

                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        if (state.invitations.isNotEmpty()) {
                            item {
                                Text(
                                    text = stringResource(R.string.invitations_title),
                                    style = MaterialTheme.typography.titleLarge,
                                    color = PauseColors.Muted,
                                )
                            }
                            items(state.invitations, key = { "invitation-${it.id}" }) { invitation ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    color = PauseColors.Surface,
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text(
                                            text = stringResource(
                                                R.string.invitation_subtitle,
                                                invitation.ownerName,
                                                invitation.drawerName,
                                            ),
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = PauseColors.Ink,
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            androidx.compose.material3.Button(
                                                onClick = { onRespondInvitation(invitation, true) },
                                                shape = RoundedCornerShape(999.dp),
                                            ) {
                                                Text(text = stringResource(R.string.invitation_accept))
                                            }
                                            TextButton(onClick = { onRespondInvitation(invitation, false) }) {
                                                Text(
                                                    text = stringResource(R.string.invitation_reject),
                                                    color = PauseColors.Error,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (state.owned.isNotEmpty()) {
                            item {
                                Text(
                                    text = stringResource(R.string.drawers_owned_section),
                                    style = MaterialTheme.typography.titleLarge,
                                    color = PauseColors.Muted,
                                )
                            }
                            items(state.owned, key = { it.id }) { drawer ->
                                DrawerCard(
                                    drawer = drawer,
                                    thumbnailUrl = null,
                                    onClick = { onDrawerClick(drawer) },
                                )
                            }
                        }

                        if (state.shared.isNotEmpty()) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = stringResource(R.string.drawers_shared_section),
                                    style = MaterialTheme.typography.titleLarge,
                                    color = PauseColors.Muted,
                                )
                            }
                            items(state.shared, key = { it.id }) { drawer ->
                                DrawerCard(
                                    drawer = drawer,
                                    thumbnailUrl = null,
                                    onClick = { onDrawerClick(drawer) },
                                )
                            }
                        }

                        item { Spacer(modifier = Modifier.height(88.dp)) }
                    }
                }
            }
        }

        toast?.let {
            PauseToast(message = it.asString())
        }
    }

    state.quotaReachedMaxDrawers?.let { maxDrawers ->
        AlertDialog(
            onDismissRequest = onDismissQuota,
            title = { Text(text = stringResource(R.string.drawers_quota_title)) },
            text = {
                Text(text = stringResource(R.string.drawers_quota_message, maxDrawers))
            },
            confirmButton = {
                TextButton(onClick = onDismissQuota) {
                    Text(text = stringResource(R.string.drawers_quota_action))
                }
            },
            dismissButton = {
                TextButton(onClick = onDismissQuota) {
                    Text(text = stringResource(R.string.cancel))
                }
            },
        )
    }

    if (state.error != null && !state.isEmpty) {
        AlertDialog(
            onDismissRequest = onRetry,
            title = { Text(text = stringResource(R.string.error_unknown)) },
            text = { Text(text = state.error.asString()) },
            confirmButton = {
                TextButton(onClick = onRetry) {
                    Text(text = stringResource(R.string.drawers_retry))
                }
            },
        )
    }
}

/** Bottom sheet for FR-02.2. */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun CreateDrawerSheet(
    state: DrawerListUiState,
    onDismiss: () -> Unit,
    onNameChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = PauseColors.Surface,
    ) {
        Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
            Text(
                text = stringResource(R.string.drawer_create_title),
                style = MaterialTheme.typography.headlineSmall,
                color = PauseColors.Ink,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(16.dp))
            com.pause.app.presentation.common.components.PauseTextField(
                value = state.createName,
                onValueChange = onNameChange,
                label = stringResource(R.string.drawer_name_label),
                placeholder = stringResource(R.string.drawer_name_placeholder),
                error = state.createNameError,
                enabled = !state.isCreating,
            )
            Spacer(modifier = Modifier.height(8.dp))
            com.pause.app.presentation.common.components.PauseTextField(
                value = state.createDescription,
                onValueChange = onDescriptionChange,
                label = stringResource(R.string.drawer_description_label),
                placeholder = stringResource(R.string.drawer_description_placeholder),
                error = state.createDescriptionError,
                enabled = !state.isCreating,
                singleLine = false,
            )
            Spacer(modifier = Modifier.height(20.dp))
            com.pause.app.presentation.common.components.PausePrimaryButton(
                text = stringResource(R.string.drawer_create_submit),
                onClick = onSubmit,
                loading = state.isCreating,
            )
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
