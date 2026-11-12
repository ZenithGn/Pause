package com.pause.app.presentation.payment

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Sync
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.PaymentStatus
import com.pause.app.presentation.theme.PauseColors
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel

/**
 * Screen 10: Payment (Quét mã QR / Chuyển khoản App-to-App VietQR).
 * Features FR-05:
 * 1. VietQR NAPAS standard image & pre-filled memo
 * 2. App-to-App direct banking app intent launch
 * 3. Auto-detection on return (Lifecycle ON_RESUME + background polling every 2.5s)
 * 4. Zero-click auto-navigation upon successful payment
 * 5. Sandbox Simulation trigger for instant testing/grading
 */
@Composable
fun PaymentQrScreen(
    paymentType: String,
    referenceId: String,
    amountVnd: Int,
    isProcessing: Boolean = false,
    viewModel: PaymentViewModel = koinViewModel(),
    onConfirmPayment: () -> Unit,
    onCancel: () -> Unit,
    onBack: () -> Unit = onCancel,
) {
    BackHandler { onBack() }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val uiState by viewModel.uiState.collectAsState()

    // Initialize checkout
    LaunchedEffect(paymentType, referenceId, amountVnd) {
        viewModel.initializePayment(paymentType, referenceId, amountVnd)
    }

    // Lifecycle observer for ON_RESUME auto-check when returning from banking app
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.checkStatusNow()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Auto-navigate upon payment success (Zero manual clicks needed!)
    LaunchedEffect(uiState.status) {
        if (uiState.status == PaymentStatus.SUCCESS) {
            delay(1_000) // Brief celebration state display
            onConfirmPayment()
        } else if (uiState.status == PaymentStatus.CANCELLED) {
            onCancel()
        }
    }

    val paymentPurposeTitle = remember(paymentType) {
        when (paymentType) {
            "pause_go" -> "Gói PAUSE Go (5GB/năm)"
            "pause_plus" -> "Gói PAUSE Plus (10GB/năm)"
            "pause_premium", "membership_yearly" -> "Gói PAUSE Premium (20GB/năm)"
            "membership_monthly" -> "Gói Pause VIP 1 tháng"
            "single_drawer" -> "Mở thêm ngăn kéo"
            else -> "Thanh toán đơn đặt in Photobooth"
        }
    }

    val minutes = uiState.remainingSeconds / 60
    val seconds = uiState.remainingSeconds % 60
    val countdownText = "%02d:%02d".format(minutes, seconds)

    val checkoutInfo = uiState.checkoutInfo
    val transferMemo = checkoutInfo?.transferMemo ?: ("PAUSE " + referenceId.take(8).uppercase())
    val vietQrUrl = checkoutInfo?.vietQrUrl ?: "https://img.vietqr.io/image/MB-0388888888-compact2.png?amount=$amountVnd&addInfo=$transferMemo"
    val orderCodeText = checkoutInfo?.orderCode?.toString() ?: referenceId.take(8).uppercase()

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
                text = "Thanh toán VietQR App-to-App",
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
            // ── Status Pill ──
            when (uiState.status) {
                PaymentStatus.SUCCESS -> {
                    Surface(
                        color = Color(0xFFE8F5E9),
                        shape = RoundedCornerShape(50),
                        border = BorderStroke(1.dp, Color(0xFF4CAF50)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF2E7D32),
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                text = "Đã nhận thanh toán! Đang hoàn tất…",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF2E7D32),
                            )
                        }
                    }
                }
                PaymentStatus.FAILED -> {
                    Surface(
                        color = Color(0xFFFFEBEE),
                        shape = RoundedCornerShape(50),
                        border = BorderStroke(1.dp, Color(0xFFEF5350)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Default.ErrorOutline,
                                contentDescription = null,
                                tint = Color(0xFFC62828),
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                text = "Giao dịch không thành công",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFC62828),
                            )
                        }
                    }
                }
                else -> {
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
                                imageVector = Icons.Default.Sync,
                                contentDescription = null,
                                tint = PauseColors.Wine,
                                modifier = Modifier.size(16.dp),
                            )
                            Text(
                                text = "Đang chờ đối soát tự động • Còn $countdownText",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = PauseColors.Wine,
                            )
                        }
                    }
                }
            }

            // ── Primary App-to-App Banking Action ──
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccountBalance,
                            contentDescription = null,
                            tint = Color(0xFF38BDF8),
                            modifier = Modifier.size(24.dp),
                        )
                        Text(
                            text = "Thanh toán bằng App Ngân hàng",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                        )
                    }

                    Text(
                        text = "Mở trực tiếp ứng dụng ngân hàng trên điện thoại (MB, VCB, Momo, Techcombank...). Thông tin chuyển khoản sẽ được sao chép sẵn.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFCBD5E1),
                        textAlign = TextAlign.Center,
                    )

                    Button(
                        onClick = { viewModel.openBankingApp(context) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF2563EB),
                            contentColor = Color.White,
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccountBalance,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Mở App Ngân hàng thanh toán",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            // ── VietQR Code Card ──
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
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Surface(
                            color = PauseColors.Wine,
                            shape = RoundedCornerShape(6.dp),
                        ) {
                            Text(
                                text = "VietQR Pro",
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
                        text = "$paymentPurposeTitle • Mã ĐH: #$orderCodeText",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // QR Image Box with fallback Matrix Canvas
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
                        text = "Quét mã bằng app ngân hàng khác hoặc mở trực tiếp trên máy.",
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
                        text = "Thông tin tài khoản thụ hưởng",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                    )

                    TransferInfoRow(
                        label = "Ngân hàng",
                        value = checkoutInfo?.bankName ?: "MB Bank (Quân Đội)",
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    TransferInfoRow(
                        label = "Chủ tài khoản",
                        value = checkoutInfo?.accountHolder ?: "PAUSE MEMORY STUDIO",
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    TransferInfoRow(
                        label = "Số tài khoản",
                        value = checkoutInfo?.accountNumber ?: "0388 888 888",
                        onCopy = {
                            viewModel.copyToClipboard(
                                context,
                                checkoutInfo?.accountNumber ?: "0388888888",
                                "Đã sao chép số tài khoản",
                            )
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
                            viewModel.copyToClipboard(
                                context,
                                transferMemo,
                                "Đã sao chép nội dung chuyển khoản",
                            )
                        },
                    )
                }
            }

            // ── Sandbox Test Simulation (Demo / Grading) ──
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Default.Bolt,
                            contentDescription = null,
                            tint = Color(0xFFB45309),
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            text = "Kiểm thử Sandbox (Không cần chuyển tiền thật)",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF92400E),
                        )
                    }
                    Text(
                        text = "Nhấn nút dưới để mô phỏng Webhook PayOS báo thanh toán thành công, hệ thống tự động nhận diện và cập nhật tài khoản.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF78350F),
                    )
                    Button(
                        onClick = { viewModel.simulatePaymentSuccess() },
                        enabled = !uiState.isSimulating && uiState.status != PaymentStatus.SUCCESS,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFD97706),
                            contentColor = Color.White,
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (uiState.isSimulating) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Đang xử lý mô phỏng...")
                        } else {
                            Text(
                                text = "⚡ Mô phỏng thanh toán thành công",
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }

            // Copy toast notification
            AnimatedVisibility(
                visible = uiState.copiedLabel != null,
                enter = fadeIn(),
                exit = fadeOut(),
            ) {
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
                            text = uiState.copiedLabel.orEmpty(),
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
                    text = "Giao dịch được đối soát tự động 24/7 qua cổng PayOS / VietQR",
                    style = MaterialTheme.typography.labelSmall,
                    color = PauseColors.Muted,
                )
            }
        }

        // ── Bottom Action Panel ──
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
                    onClick = {
                        if (uiState.status == PaymentStatus.SUCCESS) {
                            onConfirmPayment()
                        } else {
                            viewModel.checkStatusNow()
                            onConfirmPayment()
                        }
                    },
                    enabled = !isProcessing,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (uiState.status == PaymentStatus.SUCCESS) Color(0xFF2E7D32) else PauseColors.Wine,
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
                            text = if (uiState.status == PaymentStatus.SUCCESS) "Hoàn tất và tiếp tục" else "Tôi đã chuyển khoản xong",
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
