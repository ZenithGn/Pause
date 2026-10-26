package com.pause.app.presentation.profile

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.AuthField
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.theme.PauseColors
import com.pause.app.presentation.theme.PlayfairDisplayFontFamily
import kotlinx.coroutines.delay

/**
 * Profile Screen matching pause_design_form design system and Pause brand identity.
 */
@Composable
fun ProfileScreen(
    state: ProfileUiState,
    userEmail: String? = null,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onCancelEdit: () -> Unit,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onSave: () -> Unit,
    onAvatarPicked: (ByteArray, String) -> Unit,
    onSignOut: () -> Unit,
    onViewOrders: () -> Unit = {},
    onUpgrade: () -> Unit = {},
    onConsumeMessage: () -> Unit,
    onNavigate: (PauseTab) -> Unit,
) {
    BackHandler { onBack() }

    val context = LocalContext.current
    var showLogoutDialog by rememberSaveable { mutableStateOf(false) }
    var showSettingsDialog by rememberSaveable { mutableStateOf(false) }
    var showSupportDialog by rememberSaveable { mutableStateOf(false) }

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
                onSelect = onNavigate,
            )
        },
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = PauseColors.Ink)
            }
        } else {
            val profile = state.profile
            val isPremium = profile?.isPremium == true

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Title
                item {
                    Text(
                        text = stringResource(R.string.profile_title),
                        fontFamily = PlayfairDisplayFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 28.sp,
                        color = PauseColors.Ink
                    )
                }

                // Profile Header Card (Avatar + Name + Contact + Membership Tier)
                item {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = PauseColors.Surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Avatar Box with Edit Badge
                            Box(contentAlignment = Alignment.BottomEnd) {
                                Surface(
                                    shape = CircleShape,
                                    color = PauseColors.Ink,
                                    modifier = Modifier
                                        .size(80.dp)
                                        .clickable {
                                            avatarPicker.launch(
                                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                            )
                                        }
                                ) {
                                    if (state.avatarUrl != null) {
                                        AsyncImage(
                                            model = state.avatarUrl,
                                            contentDescription = stringResource(R.string.profile_change_avatar),
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(80.dp)
                                                .clip(CircleShape)
                                        )
                                    } else {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = profile?.initials ?: "P",
                                                fontFamily = PlayfairDisplayFontFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 32.sp,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }

                                Surface(
                                    shape = CircleShape,
                                    color = PauseColors.GoldAccent,
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clickable { onEdit() }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Edit,
                                            contentDescription = stringResource(R.string.profile_edit),
                                            tint = Color.White,
                                            modifier = Modifier.size(15.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = profile?.displayName?.ifBlank { "Thành viên Pause" } ?: "Thành viên Pause",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = PauseColors.Ink
                            )

                            val contactSubtitle = buildString {
                                if (!userEmail.isNullOrBlank()) {
                                    append(userEmail)
                                }
                                val phone = profile?.phone
                                if (!phone.isNullOrBlank()) {
                                    if (isNotEmpty()) append(" • ")
                                    append(phone)
                                }
                            }

                            if (contactSubtitle.isNotBlank()) {
                                Text(
                                    text = contactSubtitle,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PauseColors.Muted
                                )
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Membership Badge Pill
                            Surface(
                                color = if (isPremium) PauseColors.GoldLight else PauseColors.CategoryBg,
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.WorkspacePremium,
                                        contentDescription = null,
                                        tint = PauseColors.GoldAccent,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = if (isPremium) {
                                            "Thành viên Premium (${profile?.maxDrawers ?: 15} tủ × 1 GB)"
                                        } else {
                                            "Gói Cơ bản • Free (${profile?.maxDrawers ?: 3} tủ × 256 MB)"
                                        },
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Medium,
                                        color = PauseColors.Ink
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Quota Stats Row
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(PauseColors.Paper, RoundedCornerShape(12.dp))
                                    .padding(vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceEvenly,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "${profile?.maxDrawers ?: 3}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = PauseColors.Ink
                                    )
                                    Text(
                                        text = "Hạn mức Tủ",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = PauseColors.Muted
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .width(1.dp)
                                        .height(24.dp)
                                        .background(PauseColors.Line)
                                )

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = if (isPremium) "1 GB" else "256 MB",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = PauseColors.Wine
                                    )
                                    Text(
                                        text = "Mỗi ngăn kéo",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = PauseColors.Muted
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .width(1.dp)
                                        .height(24.dp)
                                        .background(PauseColors.Line)
                                )

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = if (isPremium) "VIP" else "FREE",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isPremium) PauseColors.GoldAccent else PauseColors.Ink
                                    )
                                    Text(
                                        text = "Hạng thành viên",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = PauseColors.Muted
                                    )
                                }
                            }
                        }
                    }
                }

                // Menu List Card matching pause_design_form
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = PauseColors.Surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            ProfileMenuRow(
                                icon = Icons.AutoMirrored.Filled.ReceiptLong,
                                title = "Quản lý đơn hàng",
                                subtitle = "Theo dõi tiến độ in ấn & lịch sử đặt hàng",
                                tag = "profile_orders_menu",
                                onClick = onViewOrders
                            )
                            HorizontalDivider(color = PauseColors.Line.copy(alpha = 0.6f))
                            ProfileMenuRow(
                                icon = Icons.Default.AutoAwesome,
                                title = "Nâng cấp gói",
                                subtitle = "Mở khóa Pause Premium, tăng dung lượng & ưu đãi in",
                                tag = "profile_upgrade_menu",
                                onClick = onUpgrade
                            )
                            HorizontalDivider(color = PauseColors.Line.copy(alpha = 0.6f))
                            ProfileMenuRow(
                                icon = Icons.Default.Settings,
                                title = "Cài đặt",
                                subtitle = "Thông tin cá nhân, đồng bộ đám mây & bộ nhớ đệm",
                                tag = "profile_settings_menu",
                                onClick = { showSettingsDialog = true }
                            )
                            HorizontalDivider(color = PauseColors.Line.copy(alpha = 0.6f))
                            ProfileMenuRow(
                                icon = Icons.AutoMirrored.Filled.HelpOutline,
                                title = "Hỗ trợ",
                                subtitle = "Trung tâm trợ giúp, chính sách bảo hành in ấn",
                                tag = "profile_support_menu",
                                onClick = { showSupportDialog = true }
                            )
                            HorizontalDivider(color = PauseColors.Line.copy(alpha = 0.6f))
                            ProfileMenuRow(
                                icon = Icons.AutoMirrored.Filled.ExitToApp,
                                title = "Đăng xuất",
                                subtitle = "Thoát khỏi phiên làm việc hiện tại",
                                isDestructive = true,
                                tag = "profile_logout_menu",
                                onClick = { showLogoutDialog = true }
                            )
                        }
                    }
                }
            }
        }
    }

    // Message Toast
    state.message?.let {
        PauseToast(message = it.asString())
    }

    // Edit Profile Dialog
    if (state.isEditing) {
        AlertDialog(
            onDismissRequest = onCancelEdit,
            title = {
                Text(
                    text = "Chỉnh sửa hồ sơ cá nhân",
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Quick Avatar Change Button inside dialog
                    OutlinedButton(
                        onClick = {
                            avatarPicker.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhotoCamera,
                            contentDescription = null,
                            tint = PauseColors.Ink,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = stringResource(R.string.profile_change_avatar),
                            color = PauseColors.Ink
                        )
                    }

                    OutlinedTextField(
                        value = state.editName,
                        onValueChange = onNameChange,
                        label = { Text(stringResource(R.string.profile_name_label)) },
                        isError = state.fieldErrors[AuthField.DISPLAY_NAME] != null,
                        supportingText = state.fieldErrors[AuthField.DISPLAY_NAME]?.let {
                            { Text(it.asString()) }
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = state.editPhone,
                        onValueChange = onPhoneChange,
                        label = { Text(stringResource(R.string.profile_phone_label)) },
                        isError = state.fieldErrors[AuthField.PHONE] != null,
                        supportingText = state.fieldErrors[AuthField.PHONE]?.let {
                            { Text(it.asString()) }
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = onSave,
                    enabled = !state.isSaving,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Ink,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(text = if (state.isSaving) "Đang lưu..." else stringResource(R.string.save))
                }
            },
            dismissButton = {
                TextButton(onClick = onCancelEdit) {
                    Text(text = stringResource(R.string.cancel), color = PauseColors.Muted)
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Settings & Sync Dialog
    if (showSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = {
                Text(
                    text = "Cài đặt & Đồng bộ đám mây",
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CloudDone,
                            contentDescription = null,
                            tint = PauseColors.GoldAccent
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Đã kết nối dịch vụ lưu trữ Pause Cloud",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.bodyMedium,
                            color = PauseColors.Ink
                        )
                    }
                    Text(
                        text = "• Tự động tối ưu hóa hình ảnh trước khi lưu trữ đám mây để tiết kiệm dung lượng.\n• Dữ liệu ảnh và ngăn kéo kỷ niệm được đồng bộ bảo mật và mã hóa.",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = { showSettingsDialog = false }) {
                    Text("Đóng", color = PauseColors.Ink, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Support Dialog
    if (showSupportDialog) {
        AlertDialog(
            onDismissRequest = { showSupportDialog = false },
            title = {
                Text(
                    text = "Hỗ trợ khách hàng Pause",
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink
                )
            },
            text = {
                Text(
                    text = "• Hotline hỗ trợ in ấn & giao hàng: 1900 6868 (08:00 – 21:00)\n• Email: support@pause-memories.vn\n• Cam kết đổi trả miễn phí 100% trong 7 ngày nếu sản phẩm in ấn Photobook / Photobooth bị lỗi màu hoặc cong vênh khi vận chuyển.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Charcoal
                )
            },
            confirmButton = {
                TextButton(onClick = { showSupportDialog = false }) {
                    Text("Đã hiểu", color = PauseColors.Ink, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Logout Confirmation Dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = {
                Text(
                    text = stringResource(R.string.profile_logout_confirm_title),
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink
                )
            },
            text = {
                Text(
                    text = stringResource(R.string.profile_logout_confirm_message),
                    color = PauseColors.Charcoal
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onSignOut()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Error,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(text = stringResource(R.string.profile_logout))
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text(text = stringResource(R.string.cancel), color = PauseColors.Muted)
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun ProfileMenuRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    isDestructive: Boolean = false,
    tag: String = "",
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 16.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = if (isDestructive) PauseColors.WineLight else PauseColors.CategoryBg,
            modifier = Modifier.size(44.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = if (isDestructive) PauseColors.Error else PauseColors.Ink
                )
            }
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (isDestructive) PauseColors.Error else PauseColors.Ink
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = PauseColors.Muted
            )
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = PauseColors.Muted
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
