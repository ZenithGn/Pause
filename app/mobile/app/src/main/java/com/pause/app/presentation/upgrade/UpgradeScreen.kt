package com.pause.app.presentation.upgrade

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pause.app.presentation.theme.PauseColors
import com.pause.app.presentation.theme.PlayfairDisplayFontFamily

enum class MembershipPlan(
    val id: String,
    val title: String,
    val storageCapacity: String,
    val priceVnd: Int,
    val priceLabel: String,
    val badge: String? = null,
    val isRecommended: Boolean = false,
    val maxDrawers: Int,
) {
    PAUSE_GO(
        id = "pause_go",
        title = "PAUSE Go",
        storageCapacity = "5GB/năm",
        priceVnd = 30_000,
        priceLabel = "30.000 VNĐ/năm",
        badge = null,
        isRecommended = false,
        maxDrawers = 10,
    ),
    PAUSE_PLUS(
        id = "pause_plus",
        title = "PAUSE Plus",
        storageCapacity = "10GB/năm",
        priceVnd = 55_000,
        priceLabel = "55.000 VNĐ/năm",
        badge = "Khuyên dùng",
        isRecommended = true,
        maxDrawers = 25,
    ),
    PAUSE_PREMIUM(
        id = "pause_premium",
        title = "PAUSE Premium",
        storageCapacity = "20GB/năm",
        priceVnd = 100_000,
        priceLabel = "100.000 VNĐ/năm",
        badge = "Tối ưu nhất",
        isRecommended = false,
        maxDrawers = 50,
    );
}

/**
 * Screen 15: Upgrade (Nâng cấp gói Hội viên Pause)
 * Supports PAUSE Go (30k/year), PAUSE Plus (55k/year), PAUSE Premium (100k/year).
 * Upgraded members unlock VIP Photobooth Templates and extensive cloud storage.
 */
@Composable
fun UpgradeScreen(
    isPremium: Boolean = false,
    maxDrawers: Int = 3,
    onBack: () -> Unit,
    onSelectPlan: (MembershipPlan) -> Unit = {},
    onUpgradeClick: ((isYearly: Boolean) -> Unit)? = null,
) {
    BackHandler { onBack() }

    var selectedPlan by remember { mutableStateOf(MembershipPlan.PAUSE_PLUS) }
    var confirmDialogMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .windowInsetsPadding(WindowInsets.statusBars)
            .windowInsetsPadding(WindowInsets.navigationBars),
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.testTag("upgrade_back_button"),
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Quay lại",
                    tint = PauseColors.Ink,
                )
            }
            Text(
                text = "Gói Hội viên Pause",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = PauseColors.Ink,
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Hero Banner
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = PauseColors.Ink),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(22.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.WorkspacePremium,
                            contentDescription = null,
                            tint = PauseColors.GoldAccent,
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "PAUSE MEMBERSHIP",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.GoldAccent,
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Mở rộng Kỷ niệm & Trải nghiệm VIP",
                        fontFamily = PlayfairDisplayFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        color = Color.White,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Toàn quyền sử dụng kho mẫu VIP Photobooth, mở rộng lưu trữ đám mây tốc độ cao và thỏa sức lưu giữ mọi khoảnh khắc thanh xuân.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFA1A1AA),
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = Color.White.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        Text(
                            text = "Trạng thái hiện tại: ${if (isPremium) "Đã nâng cấp VIP" else "Gói Miễn phí (Free)"} • $maxDrawers tủ",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isPremium) PauseColors.GoldLight else Color.White,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        )
                    }
                }
            }

            // Membership Packages List
            Text(
                text = "Chọn gói nâng cấp phù hợp",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = PauseColors.Ink,
            )

            MembershipPlan.entries.forEach { plan ->
                val isSelected = selectedPlan == plan
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = if (isSelected) PauseColors.Ink else PauseColors.Surface,
                    border = BorderStroke(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) PauseColors.GoldAccent else PauseColors.Line,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedPlan = plan },
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .background(
                                            if (isSelected) PauseColors.GoldAccent else Color.Transparent,
                                            CircleShape,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (isSelected) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = null,
                                            tint = PauseColors.Ink,
                                            modifier = Modifier.size(16.dp),
                                        )
                                    } else {
                                        Surface(
                                            shape = CircleShape,
                                            border = BorderStroke(2.dp, PauseColors.Line),
                                            color = Color.Transparent,
                                            modifier = Modifier.size(20.dp),
                                        ) {}
                                    }
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = plan.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else PauseColors.Ink,
                                )
                            }

                            plan.badge?.let { badgeText ->
                                Surface(
                                    color = if (isSelected) PauseColors.GoldAccent else PauseColors.WineLight,
                                    shape = RoundedCornerShape(6.dp),
                                ) {
                                    Text(
                                        text = badgeText,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) PauseColors.Ink else PauseColors.Wine,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom,
                        ) {
                            Column {
                                Text(
                                    text = "Dung lượng: ${plan.storageCapacity}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (isSelected) PauseColors.GoldLight else PauseColors.Wine,
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Mở khóa 100% VIP Templates • Tối đa ${plan.maxDrawers} tủ",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (isSelected) Color(0xFFA1A1AA) else PauseColors.Muted,
                                )
                            }

                            Text(
                                text = plan.priceLabel,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else PauseColors.Ink,
                            )
                        }
                    }
                }
            }

            // Comparison Checklist Table
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = PauseColors.Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Quyền lợi chi tiết",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                    )
                    ComparisonFeatureRow("Kho mẫu Photobooth", "Mẫu cơ bản", "Toàn bộ VIP Templates")
                    ComparisonFeatureRow("Dung lượng lưu trữ", "50 ảnh / tủ", "5GB – 20GB/năm")
                    ComparisonFeatureRow("Giới hạn ngăn kéo", "3 ngăn kéo", "10 – 50 ngăn kéo")
                    ComparisonFeatureRow("Chất lượng ảnh", "Tiêu chuẩn", "Chất lượng gốc HD")
                    ComparisonFeatureRow("Chia sẻ cộng tác", "Tối đa 3 người", "Không giới hạn thành viên")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Sticky Bottom CTA "Nâng cấp ngay"
        Surface(
            color = PauseColors.Surface,
            shadowElevation = 10.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Button(
                onClick = {
                    onSelectPlan(selectedPlan)
                    onUpgradeClick?.invoke(true)
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = PauseColors.Ink,
                    contentColor = Color.White,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
                    .height(52.dp)
                    .testTag("upgrade_now_button"),
            ) {
                Text(
                    text = "Nâng cấp ${selectedPlan.title} • ${selectedPlan.priceLabel}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }

    if (confirmDialogMessage != null) {
        AlertDialog(
            onDismissRequest = { confirmDialogMessage = null },
            title = {
                Text(
                    text = "Thông báo đăng ký",
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink,
                )
            },
            text = {
                Text(
                    text = confirmDialogMessage ?: "",
                    color = PauseColors.Charcoal,
                )
            },
            confirmButton = {
                Button(
                    onClick = { confirmDialogMessage = null },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Ink,
                        contentColor = Color.White,
                    ),
                    shape = RoundedCornerShape(8.dp),
                ) {
                    Text("Đồng ý")
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp),
        )
    }
}

@Composable
private fun ComparisonFeatureRow(
    feature: String,
    freeValue: String,
    premiumValue: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = feature,
            style = MaterialTheme.typography.bodySmall,
            color = PauseColors.Ink,
            modifier = Modifier.weight(1.2f),
        )
        Text(
            text = freeValue,
            style = MaterialTheme.typography.labelSmall,
            color = PauseColors.Muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(0.9f),
        )
        Text(
            text = premiumValue,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = PauseColors.Wine,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1.1f),
        )
    }
}
