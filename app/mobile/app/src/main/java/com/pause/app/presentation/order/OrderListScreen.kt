package com.pause.app.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.OrderStatus
import com.pause.app.domain.model.PrintOrder
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.theme.PauseColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderListScreen(
    state: OrderListUiState,
    onBack: () -> Unit,
    onFilterSelected: (OrderFilter) -> Unit,
    onOrderClick: (orderId: String) -> Unit,
    onRefresh: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_list_title), fontWeight = FontWeight.SemiBold) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            // Tabs
            PrimaryTabRow(
                selectedTabIndex = OrderFilter.entries.indexOf(state.selectedFilter),
                containerColor = PauseColors.Paper,
                contentColor = PauseColors.Wine,
                indicator = {
                    TabRowDefaults.PrimaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(OrderFilter.entries.indexOf(state.selectedFilter)),
                        color = PauseColors.Wine,
                    )
                },
            ) {
                OrderFilter.entries.forEach { filter ->
                    Tab(
                        selected = state.selectedFilter == filter,
                        onClick = { onFilterSelected(filter) },
                        text = {
                            Text(
                                text = filter.label,
                                fontWeight = if (state.selectedFilter == filter) FontWeight.Bold else FontWeight.Normal,
                                color = if (state.selectedFilter == filter) PauseColors.Wine else PauseColors.Muted,
                            )
                        },
                    )
                }
            }

            state.error?.let {
                PauseErrorBanner(it, Modifier.padding(16.dp))
            }

            when {
                state.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = PauseColors.Wine)
                    }
                }
                state.filteredOrders.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = stringResource(R.string.order_list_empty),
                            style = MaterialTheme.typography.bodyLarge,
                            color = PauseColors.Muted,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.filteredOrders, key = { it.id }) { order ->
                            OrderCard(order = order, onClick = { onOrderClick(order.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: PrintOrder,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(PauseColors.Surface)
            .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "#${order.id.takeLast(8).uppercase()}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Muted,
                )
                OrderStatusBadge(status = order.status)
            }

            Spacer(Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
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
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }

                Spacer(Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = order.templateName ?: "Photobooth Strip",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = PauseColors.Ink,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Số lượng: ${order.quantity}",
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = stringResource(R.string.order_format_currency, order.totalPriceVnd),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Wine,
                    )
                }

                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = PauseColors.Muted,
                )
            }
        }
    }
}

@Composable
fun OrderStatusBadge(status: OrderStatus) {
    val (bgColor, textColor) = when (status) {
        OrderStatus.PENDING -> Color(0xFFFEF3C7) to Color(0xFFB45309)
        OrderStatus.PROCESSING -> Color(0xFFDBEAFE) to Color(0xFF1E40AF)
        OrderStatus.PRINTING -> Color(0xFFE0E7FF) to Color(0xFF3730A3)
        OrderStatus.SHIPPING -> Color(0xFFEDE9FE) to Color(0xFF5B21B6)
        OrderStatus.COMPLETED -> Color(0xFFD1FAE5) to Color(0xFF065F46)
        OrderStatus.CANCELLED -> Color(0xFFFEE2E2) to Color(0xFF991B1B)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(99.dp))
            .background(bgColor)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = status.label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = textColor,
            fontSize = 11.sp,
        )
    }
}
