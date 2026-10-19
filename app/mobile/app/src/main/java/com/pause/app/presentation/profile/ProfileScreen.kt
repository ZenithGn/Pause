package com.pause.app.presentation.profile

import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Headset
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.AuthField
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.theme.PauseColors
import kotlinx.coroutines.delay

/** Figma screen 5 – profile + settings menu. FR-01.5 / FR-01.3 */
@Composable
fun ProfileScreen(
    state: ProfileUiState,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onCancelEdit: () -> Unit,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onSave: () -> Unit,
    onAvatarPicked: (ByteArray, String) -> Unit,
    onSignOut: () -> Unit,
    onConsumeMessage: () -> Unit,
    onOpenHome: () -> Unit,
) {
    val context = LocalContext.current
    var showLogoutDialog by remember { mutableStateOf(false) }

    val avatarPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) readImage(context, uri)?.let { (bytes, mimeType) ->
            onAvatarPicked(bytes, mimeType)
        }
    }

    LaunchedEffect(state.message) {
        if (state.message != null) {
            delay(2_500)
            onConsumeMessage()
        }
    }

    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(
                selected = PauseTab.PROFILE,
                onSelect = { if (it == PauseTab.HOME) onOpenHome() },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
        ) {
            Text(
                text = stringResource(R.string.profile_title),
                style = MaterialTheme.typography.titleLarge,
                color = PauseColors.Ink,
            )

            if (state.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = PauseColors.Ink)
                }
                return@Column
            }

            Spacer(modifier = Modifier.height(16.dp))

            val profile = state.profile
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(PauseColors.Surface, CircleShape)
                        .clickable { avatarPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    contentAlignment = Alignment.Center,
                ) {
                    val avatar = state.avatarUrl
                    if (avatar != null) {
                        AsyncImage(
                            model = avatar,
                            contentDescription = stringResource(R.string.profile_change_avatar),
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(72.dp)
                                .background(PauseColors.Surface, CircleShape),
                        )
                    } else {
                        Text(
                            text = profile?.initials ?: "P",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.Ink,
                        )
                    }
                }

                Spacer(modifier = Modifier.size(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = profile?.displayName.orEmpty(),
                        style = MaterialTheme.typography.headlineSmall,
                        color = PauseColors.Ink,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = profile?.phone?.takeIf { it.isNotBlank() }.orEmpty(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    MembershipBadge(isPremium = profile?.isPremium == true)
                }

                IconButton(onClick = onEdit) {
                    Icon(
                        imageVector = Icons.Filled.Edit,
                        contentDescription = stringResource(R.string.profile_edit),
                        tint = PauseColors.Ink,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            profile?.let {
                Text(
                    text = stringResource(R.string.profile_drawers_label, it.maxDrawers),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
            }

            state.message?.let { message ->
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = PauseColors.Ink,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = message.asString(),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            HorizontalDivider(color = PauseColors.Line)
            Spacer(modifier = Modifier.height(8.dp))

            ProfileMenuItem(
                icon = Icons.Filled.Receipt,
                label = stringResource(R.string.profile_orders),
                onClick = {},
            )
            ProfileMenuItem(
                icon = Icons.Filled.WorkspacePremium,
                label = stringResource(R.string.profile_upgrade),
                onClick = {},
            )
            ProfileMenuItem(
                icon = Icons.Filled.Settings,
                label = stringResource(R.string.profile_settings),
                onClick = {},
            )
            ProfileMenuItem(
                icon = Icons.Filled.Headset,
                label = stringResource(R.string.profile_support),
                onClick = {},
            )
            ProfileMenuItem(
                icon = Icons.AutoMirrored.Filled.Logout,
                label = stringResource(R.string.profile_logout),
                onClick = { showLogoutDialog = true },
                tint = PauseColors.Error,
            )

            Spacer(modifier = Modifier.height(24.dp))
            TextButton(onClick = onBack) {
                Text(text = stringResource(R.string.back), color = PauseColors.Muted)
            }
        }
    }

    if (state.isEditing) {
        AlertDialog(
            onDismissRequest = onCancelEdit,
            title = { Text(text = stringResource(R.string.profile_edit)) },
            text = {
                Column {
                    OutlinedTextField(
                        value = state.editName,
                        onValueChange = onNameChange,
                        label = { Text(stringResource(R.string.profile_name_label)) },
                        isError = state.fieldErrors[AuthField.DISPLAY_NAME] != null,
                        supportingText = state.fieldErrors[AuthField.DISPLAY_NAME]?.let {
                            { Text(it.asString()) }
                        },
                        singleLine = true,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.editPhone,
                        onValueChange = onPhoneChange,
                        label = { Text(stringResource(R.string.profile_phone_label)) },
                        isError = state.fieldErrors[AuthField.PHONE] != null,
                        supportingText = state.fieldErrors[AuthField.PHONE]?.let {
                            { Text(it.asString()) }
                        },
                        singleLine = true,
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = onSave, enabled = !state.isSaving) {
                    Text(text = stringResource(R.string.save))
                }
            },
            dismissButton = {
                TextButton(onClick = onCancelEdit) {
                    Text(text = stringResource(R.string.cancel))
                }
            },
        )
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(text = stringResource(R.string.profile_logout_confirm_title)) },
            text = { Text(text = stringResource(R.string.profile_logout_confirm_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onSignOut()
                    },
                ) {
                    Text(text = stringResource(R.string.profile_logout), color = PauseColors.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text(text = stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Composable
private fun MembershipBadge(isPremium: Boolean) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = if (isPremium) PauseColors.Ink else PauseColors.Surface,
    ) {
        Text(
            text = stringResource(
                if (isPremium) R.string.profile_member_premium else R.string.profile_member_free,
            ),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = if (isPremium) Color.White else PauseColors.Muted,
        )
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = PauseColors.Ink,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint)
        Text(
            text = label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyLarge,
            color = tint,
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = PauseColors.Muted,
        )
    }
}

private fun readImage(context: Context, uri: android.net.Uri): Pair<ByteArray, String>? =
    runCatching {
        val resolver = context.contentResolver
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
        val mimeType = resolver.getType(uri) ?: "image/jpeg"
        bytes to mimeType
    }.getOrNull()
