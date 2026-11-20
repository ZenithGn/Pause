package com.pause.app.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.OrderStatus
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.theme.PauseColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    orderId: String,
    state: OrderDetailUiState,
    onBack: () -> Unit,
    onRefresh: (String) -> Unit,
) {
    LaunchedEffect(orderId) {
        onRefresh(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_detail_title), fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PauseColors.Paper),
            )
        },
        containerColor = PauseColors.Paper,
    ) { padding ->
        when {
            state.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = PauseColors.Wine)
                }
            }
            state.order == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    state.error?.let { PauseErrorBanner(it) }
                        ?: Text("Không tìm thấy thông tin đơn hàng", color = PauseColors.Muted)
                }
            }
            else -> {
                val order = state.order
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(20.dp),
                ) {
                    // Header card with ID and status
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(PauseColors.Surface)
                            .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                            .padding(16.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    text = stringResource(R.string.order_code_label),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PauseColors.Muted,
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    text = "#${order.id.takeLast(8).uppercase()}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = PauseColors.Ink,
                                )
                            }
                            OrderStatusBadge(status = order.status)
                        }
                    }

                    Spacer(Modifier.height(18.dp))

                    // Timeline Tracking Stepper
                    Text(
                        text = stringResource(R.string.order_timeline_title),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(PauseColors.Surface)
                            .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                            .padding(16.dp),
                    ) {
                        OrderTimeline(currentStatus = order.status)
                    }

                    Spacer(Modifier.height(18.dp))

                    // Photobooth Item Details
                    Text(
                        text = stringResource(R.string.order_summary_section),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(PauseColors.Surface)
                            .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                            .padding(14.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(PauseColors.CategoryBg),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (order.previewUrl != null && order.previewUrl.isNotBlank()) {
                                    AsyncImage(
                                        model = order.previewUrl,
                                        contentDescription = null,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop,
                                    )
                                } else {
                                    Icon(
                                        Icons.Filled.Image,
                                        contentDescription = null,
                                        tint = PauseColors.Muted,
                                        modifier = Modifier.size(28.dp),
                                    )
                                }
                            }

                            Spacer(Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = order.templateName ?: "Photobooth Strip",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = PauseColors.Ink,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = "Số lượng: ${order.quantity} bản",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PauseColors.Muted,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = stringResource(R.string.order_format_currency, order.unitPriceVnd),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = PauseColors.Wine,
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(18.dp))

                    // Recipient & Shipping Information
                    Text(
                        text = stringResource(R.string.order_recipient_section),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(PauseColors.Surface)
                            .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                            .padding(14.dp),
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Person, null, tint = PauseColors.Wine, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(order.shippingName, fontWeight = FontWeight.SemiBold, color = PauseColors.Ink)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Phone, null, tint = PauseColors.Wine, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(order.shippingPhone, color = PauseColors.Charcoal)
                            }
                            Row(verticalAlignment = Alignment.Top) {
                                Icon(Icons.Filled.LocationOn, null, tint = PauseColors.Wine, modifier = Modifier.size(18.dp).padding(top = 2.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(order.shippingAddress, color = PauseColors.Charcoal)
                            }
                            if (!order.note.isNullOrBlank()) {
                                HorizontalDivider(color = PauseColors.Line, modifier = Modifier.padding(vertical = 4.dp))
                                Text("Ghi chú: ${order.note}", style = MaterialTheme.typography.bodySmall, color = PauseColors.Muted)
                            }
                        }
                    }

                    Spacer(Modifier.height(18.dp))

                    // Price Breakdown Card
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(PauseColors.Surface)
                            .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                            .padding(14.dp),
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            DetailPriceRow(
                                label = stringResource(R.string.order_subtotal),
                                value = stringResource(R.string.order_format_currency, order.unitPriceVnd * order.quantity),
                            )
                            DetailPriceRow(
                                label = stringResource(R.string.order_shipping_fee),
                                value = stringResource(R.string.order_format_currency, 30_000),
                            )
                            HorizontalDivider(color = PauseColors.Line, modifier = Modifier.padding(vertical = 4.dp))
                            DetailPriceRow(
                                label = stringResource(R.string.order_total_amount),
                                value = stringResource(R.string.order_format_currency, order.totalPriceVnd),
                                isBold = true,
                            )
                        }
                    }

                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun OrderTimeline(currentStatus: OrderStatus) {
    val steps = listOf(
        OrderStatus.PENDING to "Chờ xử lý",
        OrderStatus.PROCESSING to "Tiếp nhận",
        OrderStatus.PRINTING to "Đang in",
        OrderStatus.SHIPPING to "Đang giao",
        OrderStatus.COMPLETED to "Đã giao",
    )

    val currentStepIndex = when (currentStatus) {
        OrderStatus.PENDING -> 0
        OrderStatus.PROCESSING -> 1
        OrderStatus.PRINTING -> 2
        OrderStatus.SHIPPING -> 3
        OrderStatus.COMPLETED -> 4
        OrderStatus.CANCELLED -> -1
    }

    if (currentStatus == OrderStatus.CANCELLED) {
        Text("Đơn hàng này đã bị huỷ.", color = PauseColors.Error, fontWeight = FontWeight.Bold)
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        steps.forEachIndexed { index, pair ->
            val isDone = index <= currentStepIndex
            val isCurrent = index == currentStepIndex

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isDone -> PauseColors.Wine
                                else -> PauseColors.CategoryBg
                            },
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (isDone) {
                        Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(14.dp))
                    }
                }

                Spacer(Modifier.width(12.dp))

                Text(
                    text = pair.second,
                    fontWeight = if (isCurrent) FontWeight.Bold else if (isDone) FontWeight.Medium else FontWeight.Normal,
                    color = if (isDone) PauseColors.Ink else PauseColors.Muted,
                    fontSize = 14.sp,
                )
            }
        }
    }
}

@Composable
private fun DetailPriceRow(label: String, value: String, isBold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = if (isBold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = if (isBold) PauseColors.Ink else PauseColors.Muted,
        )
        Text(
            text = value,
            style = if (isBold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = if (isBold) PauseColors.Wine else PauseColors.Ink,
        )
    }
}
