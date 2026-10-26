package com.pause.app.presentation.upgrade

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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

/**
 * Screen 15: Upgrade (Nâng cấp tài khoản Pause Premium)
 * Adapted from pause_design_form OrderAndUpgradeScreens.kt with Pause brand design system.
 */
@Composable
fun UpgradeScreen(
    isPremium: Boolean = false,
    onBack: () -> Unit,
    onUpgradeClick: ((isYearly: Boolean) -> Unit)? = null,
    onBuySingleDrawerClick: (() -> Unit)? = null,
) {
    BackHandler { onBack() }

    var isYearly by remember { mutableStateOf(false) }
    var confirmDialogMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .windowInsetsPadding(WindowInsets.statusBars)
            .windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.testTag("upgrade_back_button")
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Quay lại",
                    tint = PauseColors.Ink
                )
            }
            Text(
                text = "Nâng cấp Pause Premium",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = PauseColors.Ink
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Banner
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = PauseColors.Ink),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(22.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.WorkspacePremium,
                            contentDescription = null,
                            tint = PauseColors.GoldAccent
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "PAUSE PREMIUM MEMBERSHIP",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.GoldAccent
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Lưu trữ rộng lớn & In ấn ưu đãi mỗi tháng",
                        fontFamily = PlayfairDisplayFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 24.sp,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Mở khóa 15 Ngăn kéo Kỷ niệm (1 GB/ngăn kéo), toàn bộ mẫu Photobooth/Photobook độc quyền và miễn phí vận chuyển.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFA1A1AA)
                    )
                }
            }

            // Billing Cycle Toggle (Monthly vs Yearly Save 30%)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = if (!isYearly) PauseColors.Ink else PauseColors.Surface,
                    border = BorderStroke(1.5.dp, if (!isYearly) PauseColors.Ink else PauseColors.Line),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isYearly = false }
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Gói 1 tháng",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (!isYearly) Color(0xFFA1A1AA) else PauseColors.Muted
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "59,000đ",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (!isYearly) Color.White else PauseColors.Ink
                        )
                        Text(
                            text = "Thanh toán hàng tháng",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (!isYearly) Color(0xFFA1A1AA) else PauseColors.Muted
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = if (isYearly) PauseColors.Ink else PauseColors.Surface,
                    border = BorderStroke(2.dp, if (isYearly) PauseColors.GoldAccent else PauseColors.Line),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isYearly = true }
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Surface(
                            color = PauseColors.GoldAccent,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "Gói 1 năm (Tiết kiệm 30%)",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "499,000đ",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (isYearly) Color.White else PauseColors.Ink
                        )
                        Text(
                            text = "Chỉ ~41,500đ / tháng",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isYearly) PauseColors.GoldLight else PauseColors.Muted
                        )
                    }
                }
            }

            // Comparison Checklist Table (Free vs Premium)
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = PauseColors.Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "So sánh quyền lợi Hội viên",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink
                    )
                    ComparisonFeatureRow("Số lượng Ngăn kéo", "3 tủ (Free)", "15 tủ kỷ niệm")
                    ComparisonFeatureRow("Dung lượng mỗi tủ", "256 MB / tủ", "1 GB / tủ (Full HD)")
                    ComparisonFeatureRow("Kho mẫu thiết kế", "Mẫu cơ bản", "Mở khóa 100% Premium")
                    ComparisonFeatureRow("Ưu đãi in ấn hàng tháng", "Không", "Voucher giảm 20% + Freeship")
                    ComparisonFeatureRow("Chia sẻ cộng tác", "Tối đa 3 người", "Không giới hạn thành viên")
                }
            }

            // One-time Single Drawer Purchase Option (FR-04.3)
            Surface(
                color = PauseColors.BannerBg,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, PauseColors.Wine.copy(alpha = 0.2f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Chỉ cần thêm 1 Ngăn kéo?",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.Ink
                        )
                        Text(
                            text = "Mua lẻ +1 ngăn kéo vĩnh viễn (256 MB) chỉ 29,000đ, không cần đăng ký gói tháng.",
                            style = MaterialTheme.typography.bodySmall,
                            color = PauseColors.Muted
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    OutlinedButton(
                        onClick = {
                            if (onBuySingleDrawerClick != null) {
                                onBuySingleDrawerClick()
                            } else {
                                confirmDialogMessage = "Yêu cầu mở rộng thêm +1 Ngăn kéo Kỷ niệm (29,000đ) đã được ghi nhận."
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, PauseColors.Ink)
                    ) {
                        Text("Mua lẻ 29k", color = PauseColors.Ink, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Sticky Bottom CTA "Nâng cấp ngay"
        Surface(
            color = PauseColors.Surface,
            shadowElevation = 10.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Button(
                onClick = {
                    if (onUpgradeClick != null) {
                        onUpgradeClick(isYearly)
                    } else {
                        val planName = if (isYearly) "Gói 1 năm (499,000đ/năm)" else "Gói 1 tháng (59,000đ/tháng)"
                        confirmDialogMessage = "Yêu cầu nâng cấp Pause Premium ($planName) đã được gửi tới hệ thống xử lý thanh toán."
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = PauseColors.Ink,
                    contentColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
                    .height(52.dp)
                    .testTag("upgrade_now_button")
            ) {
                Text(
                    text = if (isPremium) {
                        "Gia hạn gói Pause Premium"
                    } else {
                        "Nâng cấp ngay • ${if (isYearly) "499,000đ/năm" else "59,000đ/tháng"}"
                    },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    // Confirmation / Notification Dialog
    if (confirmDialogMessage != null) {
        AlertDialog(
            onDismissRequest = { confirmDialogMessage = null },
            title = {
                Text(
                    text = "Thông báo đăng ký",
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink
                )
            },
            text = {
                Text(
                    text = confirmDialogMessage ?: "",
                    color = PauseColors.Charcoal
                )
            },
            confirmButton = {
                Button(
                    onClick = { confirmDialogMessage = null },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Ink,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Đồng ý")
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun ComparisonFeatureRow(
    feature: String,
    freeValue: String,
    premiumValue: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = feature,
            style = MaterialTheme.typography.bodySmall,
            color = PauseColors.Ink,
            modifier = Modifier.weight(1.2f)
        )
        Text(
            text = freeValue,
            style = MaterialTheme.typography.labelSmall,
            color = PauseColors.Muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(0.9f)
        )
        Text(
            text = premiumValue,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = PauseColors.Wine,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1.1f)
        )
    }
}
