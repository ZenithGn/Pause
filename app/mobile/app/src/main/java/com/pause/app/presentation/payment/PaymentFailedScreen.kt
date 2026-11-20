package com.pause.app.presentation.payment

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pause.app.R
import com.pause.app.presentation.theme.PauseColors

/**
 * Screen 12 in screen-inventory.md: Payment Failed (Thanh toán không thành công).
 * Shown when a QR payment is cancelled or expires.
 */
@Composable
fun PaymentFailedScreen(
    paymentType: String,
    referenceId: String,
    amountVnd: Int,
    onRetry: () -> Unit,
    onBackHome: () -> Unit,
) {
    BackHandler { onBackHome() }

    var showSupportDialog by remember { mutableStateOf(false) }

    val paymentLabel = remember(paymentType) {
        when (paymentType) {
            "membership_yearly" -> "Gói Pause Premium 1 năm"
            "membership_monthly" -> "Gói Pause Premium 1 tháng"
            "single_drawer" -> "Mở thêm +1 Ngăn kéo Kỷ niệm"
            else -> "Đơn đặt in Photobooth"
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .windowInsetsPadding(WindowInsets.statusBars)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        // ── Error Icon Circle ──
        Box(
            modifier = Modifier
                .size(92.dp)
                .clip(CircleShape)
                .background(PauseColors.WineLight)
                .border(2.dp, PauseColors.Error.copy(alpha = 0.35f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(PauseColors.Error),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(36.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Thanh toán không thành công",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = PauseColors.Ink,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Giao dịch đã bị hủy hoặc hết hạn thanh toán.\nBạn có thể thử quét lại mã QR hoặc liên hệ bộ phận hỗ trợ nếu đã chuyển khoản.",
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )

        Spacer(modifier = Modifier.height(24.dp))

        // ── Transaction Summary Card ──
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = PauseColors.Surface,
            border = BorderStroke(1.dp, PauseColors.Line),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Dịch vụ",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                    )
                    Text(
                        text = paymentLabel,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = PauseColors.Ink,
                    )
                }

                HorizontalDivider(color = PauseColors.Line)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Mã tham chiếu",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                    )
                    Text(
                        text = "#${referenceId.takeLast(8).uppercase()}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                    )
                }

                HorizontalDivider(color = PauseColors.Line)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Số tiền",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                    )
                    Text(
                        text = stringResource(R.string.order_format_currency, amountVnd),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Error,
                    )
                }

                HorizontalDivider(color = PauseColors.Line)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Trạng thái",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                    )
                    Surface(
                        color = PauseColors.WineLight,
                        shape = RoundedCornerShape(6.dp),
                    ) {
                        Text(
                            text = "Đã hủy / Chưa hoàn tất",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.Error,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // ── Primary Button: Thử lại ──
        Button(
            onClick = onRetry,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = PauseColors.Wine,
                contentColor = Color.White,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Thử lại",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Secondary Button: Về trang chủ ──
        OutlinedButton(
            onClick = onBackHome,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, PauseColors.Line),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            Text(
                text = stringResource(R.string.order_back_home),
                fontWeight = FontWeight.SemiBold,
                color = PauseColors.Ink,
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // ── Support Link: Hỗ trợ khách hàng ──
        TextButton(onClick = { showSupportDialog = true }) {
            Icon(
                imageVector = Icons.Default.SupportAgent,
                contentDescription = null,
                tint = PauseColors.Wine,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "Hỗ trợ khách hàng",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = PauseColors.Wine,
            )
        }
    }

    if (showSupportDialog) {
        AlertDialog(
            onDismissRequest = { showSupportDialog = false },
            title = {
                Text(
                    text = "Hỗ trợ khách hàng Pause",
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Ink,
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Nếu tài khoản ngân hàng của bạn đã bị trừ tiền nhưng giao dịch báo lỗi, vui lòng cung cấp mã tham chiếu cho đội ngũ hỗ trợ:",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Charcoal,
                    )
                    Text(
                        text = "• Mã giao dịch: #${referenceId.takeLast(8).uppercase()}\n• Hotline/Zalo: 1900 6868 (08:00 – 22:00)\n• Email: support@pause.vn",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = PauseColors.Ink,
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { showSupportDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = PauseColors.Ink),
                    shape = RoundedCornerShape(8.dp),
                ) {
                    Text("Đã hiểu", color = Color.White)
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp),
        )
    }
}
