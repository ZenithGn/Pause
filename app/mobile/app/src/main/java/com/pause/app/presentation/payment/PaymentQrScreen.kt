package com.pause.app.presentation.payment

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.presentation.theme.PauseColors
import kotlinx.coroutines.delay
import java.net.URLEncoder

/**
 * Screen 10 in screen-inventory.md: Payment (Quét mã QR để thanh toán - VietQR).
 * Used for both Print Order bank transfer and Membership / Extra Drawer purchases (FR-03, FR-04).
 */
@Composable
fun PaymentQrScreen(
    paymentType: String,
    referenceId: String,
    amountVnd: Int,
    isProcessing: Boolean = false,
    onConfirmPayment: () -> Unit,
    onCancel: () -> Unit,
    onBack: () -> Unit = onCancel,
) {
    BackHandler { onBack() }

    val context = LocalContext.current
    var remainingSeconds by remember { mutableIntStateOf(10 * 60) } // 10 minutes countdown
    var copiedLabel by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        while (remainingSeconds > 0) {
            delay(1_000)
            remainingSeconds--
        }
        onCancel()
    }

    LaunchedEffect(copiedLabel) {
        if (copiedLabel != null) {
            delay(2_000)
            copiedLabel = null
        }
    }

    val shortRef = referenceId.take(8).uppercase()
    val transferMemo = remember(paymentType, shortRef) {
        when (paymentType) {
            "membership_yearly" -> "PAUSE VIP NAM $shortRef"
            "membership_monthly" -> "PAUSE VIP THANG $shortRef"
            "single_drawer" -> "PAUSE MO TU $shortRef"
            else -> "PAUSE DON IN $shortRef"
        }
    }

    val paymentPurposeTitle = remember(paymentType) {
        when (paymentType) {
            "membership_yearly" -> "Gói Pause Premium 1 năm"
            "membership_monthly" -> "Gói Pause Premium 1 tháng"
            "single_drawer" -> "Mở thêm +1 Ngăn kéo Kỷ niệm"
            else -> "Thanh toán đơn đặt in Photobooth"
        }
    }

    val encodedMemo = remember(transferMemo) {
        runCatching { URLEncoder.encode(transferMemo, "UTF-8") }.getOrDefault(transferMemo)
    }
    val encodedAccountName = remember {
        runCatching { URLEncoder.encode("PAUSE MEMORY STUDIO", "UTF-8") }.getOrDefault("PAUSE%20MEMORY%20STUDIO")
    }
    val vietQrUrl = remember(amountVnd, encodedMemo) {
        "https://img.vietqr.io/image/MB-0388888888-compact2.png?amount=$amountVnd&addInfo=$encodedMemo&accountName=$encodedAccountName"
    }

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val countdownText = "%02d:%02d".format(minutes, seconds)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PauseColors.Paper)
            .windowInsetsPadding(WindowInsets.statusBars)
            .windowInsetsPadding(WindowInsets.navigationBars),
    ) {
        // ── Top Bar ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.back),
                    tint = PauseColors.Ink,
                )
            }
            Text(
                text = "Quét mã QR để thanh toán",
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
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // ── Status & Countdown Pill ──
            Surface(
                color = PauseColors.WineLight,
                shape = RoundedCornerShape(50),
                border = BorderStroke(1.dp, PauseColors.Wine.copy(alpha = 0.25f)),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.AccessTime,
                        contentDescription = null,
                        tint = PauseColors.Wine,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = "Đang chờ thanh toán • Còn $countdownText",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = PauseColors.Wine,
                    )
                }
            }

            // ── QR Code Card ──
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = PauseColors.Surface),
                border = BorderStroke(1.dp, PauseColors.Line),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // VietQR / Napas Header Badge
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Surface(
                            color = PauseColors.Wine,
                            shape = RoundedCornerShape(6.dp),
                        ) {
                            Text(
                                text = "VietQR",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            )
                        }
                        Text(
                            text = "Napas 247 • MB Bank",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = PauseColors.Ink,
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = paymentPurposeTitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // QR Image Box with deterministic vector QR pattern behind AsyncImage
                    Box(
                        modifier = Modifier
                            .size(230.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .border(1.5.dp, PauseColors.Line, RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        SimulatedQrMatrix(
                            seed = transferMemo.hashCode(),
                            modifier = Modifier.fillMaxSize(),
                        )
                        AsyncImage(
                            model = vietQrUrl,
                            contentDescription = "VietQR Code",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Fit,
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = stringResource(R.string.order_format_currency, amountVnd),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Wine,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Mở ứng dụng Ngân hàng bất kỳ và quét mã QR để tự động điền đúng số tiền & nội dung chuyển khoản.",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            // ── Bank Transfer Details Card ──
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = PauseColors.Surface),
                border = BorderStroke(1.dp, PauseColors.Line),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        text = "Thông tin chuyển khoản thủ công",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                    )

                    TransferInfoRow(
                        label = "Ngân hàng",
                        value = "MB Bank (Quân Đội)",
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    TransferInfoRow(
                        label = "Chủ tài khoản",
                        value = "PAUSE MEMORY STUDIO",
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    TransferInfoRow(
                        label = "Số tài khoản",
                        value = "0388 888 888",
                        onCopy = {
                            copyToClipboard(context, "0388888888")
                            copiedLabel = "Đã sao chép số tài khoản"
                        },
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    TransferInfoRow(
                        label = "Số tiền",
                        value = stringResource(R.string.order_format_currency, amountVnd),
                        highlight = true,
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    TransferInfoRow(
                        label = "Nội dung CK",
                        value = transferMemo,
                        highlight = true,
                        isMonospace = true,
                        onCopy = {
                            copyToClipboard(context, transferMemo)
                            copiedLabel = "Đã sao chép nội dung chuyển khoản"
                        },
                    )
                }
            }

            if (copiedLabel != null) {
                Surface(
                    color = PauseColors.Ink,
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            text = copiedLabel.orEmpty(),
                            style = MaterialTheme.typography.labelMedium,
                            color = Color.White,
                        )
                    }
                }
            }

            // Security note
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(bottom = 8.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.VerifiedUser,
                    contentDescription = null,
                    tint = PauseColors.Muted,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = "Giao dịch được bảo mật & đối soát tự động bởi Pause",
                    style = MaterialTheme.typography.labelSmall,
                    color = PauseColors.Muted,
                )
            }
        }

        // ── Bottom Actions ──
        Surface(
            color = PauseColors.Surface,
            shadowElevation = 10.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(
                    onClick = onConfirmPayment,
                    enabled = !isProcessing,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Wine,
                        contentColor = Color.White,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Tôi đã hoàn tất thanh toán",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                OutlinedButton(
                    onClick = onCancel,
                    enabled = !isProcessing,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, PauseColors.Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp),
                ) {
                    Text(
                        text = "Hủy giao dịch",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = PauseColors.Charcoal,
                    )
                }
            }
        }
    }
}

@Composable
private fun TransferInfoRow(
    label: String,
    value: String,
    highlight: Boolean = false,
    isMonospace: Boolean = false,
    onCopy: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = PauseColors.Muted,
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                fontFamily = if (isMonospace) FontFamily.Monospace else null,
                fontWeight = if (highlight) FontWeight.Bold else FontWeight.SemiBold,
                color = if (highlight) PauseColors.Wine else PauseColors.Ink,
            )
            if (onCopy != null) {
                Surface(
                    onClick = onCopy,
                    color = PauseColors.CategoryBg,
                    shape = CircleShape,
                ) {
                    Icon(
                        imageVector = Icons.Default.ContentCopy,
                        contentDescription = "Sao chép",
                        tint = PauseColors.Ink,
                        modifier = Modifier
                            .padding(6.dp)
                            .size(14.dp),
                    )
                }
            }
        }
    }
}

/**
 * Renders a crisp, realistic 21x21 QR Code matrix on Canvas so the QR box always looks
 * authentic even before/without network image load.
 */
@Composable
private fun SimulatedQrMatrix(
    seed: Int,
    modifier: Modifier = Modifier,
) {
    val gridSize = 21
    Canvas(modifier = modifier.padding(6.dp)) {
        val cellSize = size.width / gridSize

        fun isFinderPattern(r: Int, c: Int): Boolean {
            val inTopLeft = r in 0..6 && c in 0..6
            val inTopRight = r in 0..6 && c in (gridSize - 7) until gridSize
            val inBottomLeft = r in (gridSize - 7) until gridSize && c in 0..6
            return inTopLeft || inTopRight || inBottomLeft
        }

        fun drawFinder(startRow: Int, startCol: Int) {
            for (r in 0..6) {
                for (c in 0..6) {
                    val isBorder = r == 0 || r == 6 || c == 0 || c == 6
                    val isCenter = r in 2..4 && c in 2..4
                    if (isBorder || isCenter) {
                        drawRect(
                            color = PauseColors.Ink,
                            topLeft = Offset((startCol + c) * cellSize, (startRow + r) * cellSize),
                            size = Size(cellSize * 0.95f, cellSize * 0.95f),
                        )
                    }
                }
            }
        }

        drawFinder(0, 0)
        drawFinder(0, gridSize - 7)
        drawFinder(gridSize - 7, 0)

        for (r in 0 until gridSize) {
            for (c in 0 until gridSize) {
                if (isFinderPattern(r, c)) continue
                val inCenterBadge = r in 8..12 && c in 8..12
                if (inCenterBadge) {
                    if (r in 9..11 && c in 9..11) {
                        drawRect(
                            color = PauseColors.Wine,
                            topLeft = Offset(c * cellSize, r * cellSize),
                            size = Size(cellSize * 0.95f, cellSize * 0.95f),
                        )
                    }
                    continue
                }
                val hash = ((r * 37 + c * 101 + seed) xor (r * c * 17)).let { if (it < 0) -it else it }
                if (hash % 3 != 0) {
                    drawRect(
                        color = PauseColors.Ink,
                        topLeft = Offset(c * cellSize, r * cellSize),
                        size = Size(cellSize * 0.92f, cellSize * 0.92f),
                    )
                }
            }
        }
    }
}

private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
    clipboard?.setPrimaryClip(ClipData.newPlainText("Pause Payment", text))
}
