package com.pause.app.presentation.drawer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.presentation.common.StorageFormat
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.DrawerCard
import com.pause.app.presentation.common.components.DrawerEmptyState
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.theme.PauseColors
import com.pause.app.presentation.theme.PlayfairDisplayFontFamily
import kotlinx.coroutines.delay

/**
 * Redesigned "Memories" tab / drawer list matching pause_design_form.
 */
@Composable
fun DrawerListScreen(
    state: DrawerListUiState,
    maxDrawers: Int = 3,
    onDrawerClick: (Drawer) -> Unit,
    onCreateClick: () -> Unit,
    onDismissQuota: () -> Unit,
    onRetry: () -> Unit,
    onNavigate: (PauseTab) -> Unit,
    onConsumeToast: () -> Unit,
    onRespondInvitation: (ShareInvitation, Boolean) -> Unit,
) {
    var toast by remember { mutableStateOf<UiText?>(null) }
    var filterMode by rememberSaveable { mutableStateOf("all") } // "all", "owned", "shared"

    val allDrawers = remember(state.owned, state.shared) {
        state.owned + state.shared
    }

    val filteredDrawers = remember(allDrawers, filterMode) {
        when (filterMode) {
            "owned" -> state.owned
            "shared" -> state.shared
            else -> allDrawers
        }
    }

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

    val ownedCount = state.owned.size
    val totalUsedBytes = allDrawers.sumOf { it.storageUsedBytes }
    val totalLimitBytes = (maxDrawers * Drawer.DEFAULT_LIMIT_BYTES).coerceAtLeast(1L)
    val totalFraction = (totalUsedBytes.toFloat() / totalLimitBytes.toFloat()).coerceIn(0f, 1f)

    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(
                selected = PauseTab.MEMORIES,
                onSelect = onNavigate,
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // ── Top Header matching screenshot ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Tủ kỷ niệm của bạn",
                        fontFamily = PlayfairDisplayFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 26.sp,
                        color = PauseColors.Ink,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Quản lý dung lượng (256 MB/ngăn kéo) & phân quyền chia sẻ",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                IconButton(
                    onClick = onCreateClick,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(PauseColors.Ink),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = "Tạo ngăn kéo",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            when {
                state.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = PauseColors.Wine)
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
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        // ── Storage Quota Summary Card ──
                        item {
                            Surface(
                                color = PauseColors.Surface,
                                shape = RoundedCornerShape(16.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = "Hạn mức Ngăn kéo: $ownedCount / $maxDrawers tủ",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = PauseColors.Ink,
                                        )
                                        Text(
                                            text = "Tổng đã dùng: ${StorageFormat.bytes(totalUsedBytes)}",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = PauseColors.Wine,
                                            fontWeight = FontWeight.Medium,
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    LinearProgressIndicator(
                                        progress = { totalFraction },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(4.dp)),
                                        color = if (totalFraction > 0.85f) PauseColors.Error else PauseColors.Ink,
                                        trackColor = PauseColors.CategoryBg,
                                    )

                                    Spacer(modifier = Modifier.height(14.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        OutlinedButton(
                                            onClick = onCreateClick,
                                            shape = RoundedCornerShape(10.dp),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp),
                                        ) {
                                            Text(
                                                text = "Mua lẻ +1 Tủ (29k)",
                                                color = PauseColors.Ink,
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                        }

                                        Button(
                                            onClick = onCreateClick,
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = PauseColors.Ink,
                                                contentColor = Color.White,
                                            ),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp),
                                        ) {
                                            Text(
                                                text = "Nâng cấp Premium",
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.Bold,
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // ── Filter Chips: Tất cả, Của tôi, Được chia sẻ ──
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf(
                                    "all" to "Tất cả (${allDrawers.size})",
                                    "owned" to "Của tôi",
                                    "shared" to "Được chia sẻ",
                                ).forEach { (key, label) ->
                                    val isSelected = filterMode == key
                                    FilterChip(
                                        selected = isSelected,
                                        onClick = { filterMode = key },
                                        label = {
                                            Text(
                                                text = label,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            )
                                        },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = PauseColors.Ink,
                                            selectedLabelColor = Color.White,
                                            containerColor = PauseColors.Surface,
                                            labelColor = PauseColors.Ink,
                                        ),
                                        border = FilterChipDefaults.filterChipBorder(
                                            borderColor = if (isSelected) PauseColors.Ink else PauseColors.Line,
                                            enabled = true,
                                            selected = isSelected,
                                        ),
                                        shape = RoundedCornerShape(999.dp),
                                    )
                                }
                            }
                        }

                        // ── Lời mời chia sẻ (nếu có) ──
                        if (state.invitations.isNotEmpty() && (filterMode == "all" || filterMode == "shared")) {
                            items(state.invitations, key = { "invitation-${it.id}" }) { invitation ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(16.dp),
                                    color = PauseColors.WineLight,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Wine.copy(alpha = 0.25f)),
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text(
                                            text = stringResource(
                                                R.string.invitation_subtitle,
                                                invitation.ownerName,
                                                invitation.drawerName,
                                            ),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = PauseColors.Ink,
                                        )
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Button(
                                                onClick = { onRespondInvitation(invitation, true) },
                                                colors = ButtonDefaults.buttonColors(containerColor = PauseColors.Wine),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.height(36.dp),
                                            ) {
                                                Text(text = stringResource(R.string.invitation_accept), style = MaterialTheme.typography.labelSmall)
                                            }
                                            OutlinedButton(
                                                onClick = { onRespondInvitation(invitation, false) },
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.height(36.dp),
                                            ) {
                                                Text(
                                                    text = stringResource(R.string.invitation_reject),
                                                    color = PauseColors.Error,
                                                    style = MaterialTheme.typography.labelSmall,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ── Danh sách Drawer Cards ──
                        items(filteredDrawers, key = { it.id }) { drawer ->
                            DrawerCard(
                                drawer = drawer,
                                thumbnailUrl = null,
                                onClick = { onDrawerClick(drawer) },
                            )
                        }

                        item { Spacer(modifier = Modifier.height(32.dp)) }
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
