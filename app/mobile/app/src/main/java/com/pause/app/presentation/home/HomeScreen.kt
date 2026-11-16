package com.pause.app.presentation.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.PrintOrder
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.photobooth.AestheticSlotArt
import com.pause.app.presentation.theme.PauseColors
import com.pause.app.presentation.theme.PlayfairDisplayFontFamily

/**
 * Figma Home Page – redesigned to match the provided mockup.
 * Greeting header, search bar, photobooth banner, category row,
 * print products carousel, recent orders section.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    displayName: String?,
    isPremium: Boolean = false,
    maxDrawers: Int = 3,
    ownedDrawerCount: Int = 0,
    recentDrawers: List<Drawer>,
    hasError: Boolean = false,
    onRetry: () -> Unit = {},
    isRefreshing: Boolean = false,
    onRefresh: () -> Unit = {},
    pendingInvitationCount: Int,
    unreadNotificationCount: Int = 0,
    onOpenInvitations: () -> Unit,
    onOpenNotifications: () -> Unit = onOpenInvitations,
    onCreateDrawer: () -> Unit,
    onOpenDrawer: (Drawer) -> Unit,
    onStartPhotobooth: () -> Unit,
    onStartPhotoboothWithSlot: (Int?) -> Unit = { onStartPhotobooth() },
    recentOrders: List<PrintOrder> = emptyList(),
    onViewOrders: () -> Unit = {},
    onOrderClick: (String) -> Unit = { onViewOrders() },
    onNavigate: (PauseTab) -> Unit,
) {
    val pullToRefreshState = rememberPullToRefreshState()
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            onRefresh()
        }
    }
    LaunchedEffect(isRefreshing) {
        if (!isRefreshing && pullToRefreshState.isRefreshing) {
            pullToRefreshState.endRefresh()
        }
    }

    var searchQuery by remember { mutableStateOf("") }
    val filteredDrawers = remember(recentDrawers, searchQuery) {
        if (searchQuery.isBlank()) {
            recentDrawers
        } else {
            val q = searchQuery.trim().lowercase()
            recentDrawers.filter {
                it.name.lowercase().contains(q) || (it.description?.lowercase()?.contains(q) == true)
            }
        }
    }
    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(selected = PauseTab.HOME, onSelect = onNavigate)
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .nestedScroll(pullToRefreshState.nestedScrollConnection),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
            ) {
            // ── Top Header: Avatar + Greeting + Tier Badge + Notification ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onNavigate(PauseTab.PROFILE) },
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .background(PauseColors.Ink, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = (displayName?.trim()?.firstOrNull() ?: 'P').uppercase().toString(),
                            color = Color.White,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.home_welcome_back),
                            style = MaterialTheme.typography.bodySmall,
                            color = PauseColors.Muted,
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = displayName ?: stringResource(R.string.home_greeting_anonymous),
                                style = MaterialTheme.typography.titleMedium,
                                color = PauseColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                color = if (isPremium) PauseColors.GoldLight else PauseColors.CategoryBg,
                                shape = RoundedCornerShape(6.dp),
                            ) {
                                Text(
                                    text = if (isPremium) "PREMIUM" else "FREE",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isPremium) PauseColors.GoldAccent else PauseColors.Muted,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                )
                            }
                        }
                    }
                }

                IconButton(
                    onClick = onOpenNotifications,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(PauseColors.Surface)
                        .border(1.dp, PauseColors.Line, CircleShape),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.Notifications,
                            contentDescription = "Notifications",
                            tint = PauseColors.Ink,
                            modifier = Modifier.size(20.dp),
                        )
                        if (pendingInvitationCount > 0 || unreadNotificationCount > 0) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(PauseColors.Wine, CircleShape)
                                    .align(Alignment.TopEnd),
                            )
                        }
                    }
                }
            }

            // ── Search bar ──
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(14.dp),
                color = PauseColors.SearchBg,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Search,
                        contentDescription = null,
                        tint = PauseColors.Muted,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = stringResource(R.string.home_search_placeholder),
                                style = MaterialTheme.typography.bodyMedium,
                                color = PauseColors.Muted,
                            )
                        }
                        BasicTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodyMedium.copy(color = PauseColors.Ink),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    if (searchQuery.isNotEmpty()) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = null,
                            tint = PauseColors.Muted,
                            modifier = Modifier
                                .size(18.dp)
                                .clickable { searchQuery = "" },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // ── Quick Action Hero Banner (Option 3: Dynamic Memory Cover) ──
            val heroCoverUrl = remember(recentDrawers) {
                recentDrawers.firstOrNull { !it.coverPhotoPath.isNullOrBlank() }?.coverPhotoPath
            }
            MemoryStudioHeroBanner(
                coverPhotoUrl = heroCoverUrl,
                ownedDrawerCount = ownedDrawerCount,
                maxDrawers = maxDrawers,
                onCreateDrawer = onCreateDrawer,
                onStartPhotobooth = onStartPhotobooth,
                modifier = Modifier.padding(horizontal = 20.dp),
            )

            // ── Lời mời chia sẻ (Pending Invitations Alert) ──
            if (pendingInvitationCount > 0) {
                Spacer(modifier = Modifier.height(14.dp))
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clickable(onClick = onOpenInvitations),
                    shape = RoundedCornerShape(14.dp),
                    color = PauseColors.WineLight,
                    border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Wine.copy(alpha = 0.25f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.pause_mark),
                            contentDescription = null,
                            tint = PauseColors.Wine,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Bạn có $pendingInvitationCount lời mời chia sẻ ngăn kéo",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = PauseColors.Wine,
                            )
                            Text(
                                text = "Nhấn để xem và phản hồi lời mời",
                                style = MaterialTheme.typography.bodySmall,
                                color = PauseColors.Ink.copy(alpha = 0.75f),
                            )
                        }
                        Icon(
                            imageVector = Icons.Filled.ChevronRight,
                            contentDescription = null,
                            tint = PauseColors.Wine,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Ngăn kéo kỷ niệm – data from DrawerListViewModel / Supabase ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.home_drawers_title),
                    style = MaterialTheme.typography.titleLarge,
                    color = PauseColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                TextButton(onClick = { onNavigate(PauseTab.MEMORIES) }) {
                    Text(
                        text = stringResource(R.string.home_drawers_see_all),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Wine,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            MemoryDrawerRow(
                drawers = filteredDrawers,
                hasError = hasError,
                onRetry = onRetry,
                onOpenDrawer = onOpenDrawer,
                onCreateDrawer = onCreateDrawer,
            )

            Spacer(modifier = Modifier.height(28.dp))

            // ── Sản phẩm in (Featured Print Carousel) ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.home_products_title),
                    style = MaterialTheme.typography.titleLarge,
                    color = PauseColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = stringResource(R.string.home_products_count, 4),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    FeaturedProductCard(
                        slotCount = 1,
                        name = stringResource(R.string.home_product_polaroid),
                        price = stringResource(R.string.home_product_polaroid_price),
                        description = stringResource(R.string.photobooth_category_1_desc),
                        onClick = { onStartPhotoboothWithSlot(1) },
                    )
                }
                item {
                    FeaturedProductCard(
                        slotCount = 2,
                        name = stringResource(R.string.home_product_duo),
                        price = stringResource(R.string.home_product_duo_price),
                        description = stringResource(R.string.photobooth_category_2_desc),
                        onClick = { onStartPhotoboothWithSlot(2) },
                    )
                }
                item {
                    FeaturedProductCard(
                        slotCount = 3,
                        name = stringResource(R.string.home_product_photostrip),
                        price = stringResource(R.string.home_product_photostrip_price),
                        description = stringResource(R.string.photobooth_category_3_desc),
                        onClick = { onStartPhotoboothWithSlot(3) },
                    )
                }
                item {
                    FeaturedProductCard(
                        slotCount = 4,
                        name = stringResource(R.string.home_product_photobook),
                        price = stringResource(R.string.home_product_photobook_price),
                        description = stringResource(R.string.photobooth_category_4_desc),
                        onClick = { onStartPhotoboothWithSlot(4) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Đơn hàng gần đây ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.home_orders_title),
                    style = MaterialTheme.typography.titleLarge,
                    color = PauseColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                TextButton(onClick = onViewOrders) {
                    Text(
                        text = stringResource(R.string.home_orders_see_all),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))

            if (recentOrders.isNotEmpty()) {
                val latest = recentOrders.first()
                OrderCardPlaceholder(
                    orderCode = "#${latest.id.takeLast(8).uppercase()}",
                    statusLabel = latest.status.label,
                    title = "${latest.templateName ?: "Photobooth Strip"} (${latest.quantity} bản)",
                    priceText = stringResource(R.string.order_format_currency, latest.totalPriceVnd),
                    onClick = { onOrderClick(latest.id) },
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            } else {
                OrderCardPlaceholder(
                    onClick = onViewOrders,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        PullToRefreshContainer(
            state = pullToRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            containerColor = PauseColors.Surface,
            contentColor = PauseColors.Wine,
        )
    }
}
}

// ─────────────────────────── Sub-components ───────────────────────────

/**
 * Option 3 Hero Banner: renders the caller's latest memory cover photo (or a warm
 * atmospheric sunset backdrop when none exists yet) behind a translucent scrim,
 * paired with a tilted miniature 3-slot photobooth strip.
 */
@Composable
private fun MemoryStudioHeroBanner(
    coverPhotoUrl: String?,
    ownedDrawerCount: Int,
    maxDrawers: Int,
    onCreateDrawer: () -> Unit,
    onStartPhotobooth: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF3E0D12),
        shadowElevation = 4.dp,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(IntrinsicSize.Min),
        ) {
            if (!coverPhotoUrl.isNullOrBlank()) {
                AsyncImage(
                    model = coverPhotoUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .matchParentSize()
                        .blur(8.dp),
                )
            } else {
                AestheticSlotArt(
                    slotIndex = 0,
                    modifier = Modifier.matchParentSize(),
                )
            }

            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                Color(0xFF2B0B0E).copy(alpha = 0.78f),
                                Color(0xFF1C0A0C).copy(alpha = 0.58f),
                            ),
                        ),
                    ),
            )

            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = stringResource(R.string.home_studio_overline),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = PauseColors.WineLight,
                                letterSpacing = 1.4.sp,
                            )
                            Surface(
                                color = Color.White.copy(alpha = 0.20f),
                                shape = CircleShape,
                            ) {
                                Text(
                                    text = "$ownedDrawerCount/$maxDrawers Tủ",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Lưu giữ & In ấn Kỷ niệm",
                            fontFamily = PlayfairDisplayFontFamily,
                            fontSize = 21.sp,
                            lineHeight = 27.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.home_studio_subtitle),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.86f),
                        )
                    }

                    Surface(
                        modifier = Modifier
                            .width(58.dp)
                            .height(88.dp)
                            .graphicsLayer { rotationZ = 3f },
                        shape = RoundedCornerShape(10.dp),
                        color = Color.White,
                        shadowElevation = 6.dp,
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(5.dp),
                            verticalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            listOf(0, 2, 1).forEach { artIdx ->
                                AestheticSlotArt(
                                    slotIndex = artIdx,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f)
                                        .clip(RoundedCornerShape(3.dp)),
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Button(
                        onClick = onCreateDrawer,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = PauseColors.Ink,
                        ),
                        shape = CircleShape,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp),
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = stringResource(R.string.drawers_create),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                        )
                    }

                    Button(
                        onClick = onStartPhotobooth,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PauseColors.Wine,
                            contentColor = Color.White,
                        ),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.25f)),
                        shape = CircleShape,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp),
                    ) {
                        Icon(painterResource(R.drawable.pause_mark_white), contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Photobooth",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
}

/**
 * Compact Home representation of the caller's real drawers. The list comes
 * from Supabase through DrawerListViewModel; it is not a static category list.
 */
@Composable
private fun MemoryDrawerRow(
    drawers: List<Drawer>,
    hasError: Boolean,
    onRetry: () -> Unit,
    onOpenDrawer: (Drawer) -> Unit,
    onCreateDrawer: () -> Unit,
) {
    if (drawers.isEmpty() && hasError) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 6.dp),
            shape = RoundedCornerShape(14.dp),
            color = PauseColors.WineLight,
            border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Error.copy(alpha = 0.25f)),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = null,
                        tint = PauseColors.Error,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = stringResource(R.string.error_network),
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Error,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                TextButton(
                    onClick = onRetry,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Text(
                        text = stringResource(R.string.drawers_retry),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Wine,
                    )
                }
            }
        }
    } else if (drawers.isEmpty()) {
        Surface(
            onClick = onCreateDrawer,
            shape = RoundedCornerShape(16.dp),
            color = PauseColors.BannerBg,
            border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .height(84.dp),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(PauseColors.Wine),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp),
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.home_drawers_empty_title),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = stringResource(R.string.home_drawers_empty_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Muted,
                        fontSize = 11.sp,
                    )
                }
            }
        }
    } else {
        LazyRow(
            contentPadding = PaddingValues(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            items(drawers, key = { it.id }) { drawer ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .width(76.dp)
                        .clickable { onOpenDrawer(drawer) },
                ) {
                    Surface(
                        modifier = Modifier.size(64.dp),
                        shape = RoundedCornerShape(18.dp),
                        color = if (drawer.isOwner) PauseColors.CategoryBg else PauseColors.WineLight,
                        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
                        shadowElevation = 1.dp,
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (!drawer.coverPhotoPath.isNullOrBlank()) {
                                AsyncImage(
                                    model = drawer.coverPhotoPath,
                                    contentDescription = drawer.name,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            } else {
                                Text(
                                    text = drawer.name.trim().firstOrNull()?.uppercase() ?: "P",
                                    fontWeight = FontWeight.Bold,
                                    color = PauseColors.Wine,
                                    fontSize = 18.sp,
                                )
                            }
                            if (!drawer.isOwner) {
                                Surface(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .padding(3.dp),
                                    shape = CircleShape,
                                    color = PauseColors.Wine,
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Group,
                                        contentDescription = "Chia sẻ",
                                        tint = Color.White,
                                        modifier = Modifier
                                            .size(14.dp)
                                            .padding(2.dp),
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = drawer.name,
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Ink,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = if (drawer.isOwner) {
                            "${drawer.photoCount}/50 ảnh"
                        } else {
                            "Chia sẻ • ${drawer.photoCount}"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (drawer.isOwner) PauseColors.Muted else PauseColors.Wine,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            item {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .width(76.dp)
                        .clickable(onClick = onCreateDrawer),
                ) {
                    Surface(
                        modifier = Modifier.size(64.dp),
                        shape = RoundedCornerShape(18.dp),
                        color = PauseColors.Surface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Add,
                                contentDescription = stringResource(R.string.drawers_create),
                                tint = PauseColors.Ink,
                                modifier = Modifier.size(24.dp),
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = stringResource(R.string.drawers_create),
                        style = MaterialTheme.typography.bodySmall,
                        color = PauseColors.Ink,
                        fontWeight = FontWeight.Medium,
                        fontSize = 11.sp,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

/** Featured print product card – realistic miniature photobooth strip + pricing + action. */
@Composable
private fun FeaturedProductCard(
    slotCount: Int,
    name: String,
    price: String,
    description: String,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        color = PauseColors.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
        shadowElevation = 2.dp,
        modifier = Modifier
            .width(180.dp)
            .height(260.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp),
                shape = RoundedCornerShape(12.dp),
                color = PauseColors.BannerBg,
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    MiniPhotoboothStrip(slotCount = slotCount)

                    Surface(
                        color = PauseColors.WineLight,
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(0.5.dp, PauseColors.Wine.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.home_product_slot_badge, slotCount),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.Wine,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Column {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleSmall,
                    color = PauseColors.Ink,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = PauseColors.Muted,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = price,
                    style = MaterialTheme.typography.labelMedium,
                    color = PauseColors.Wine,
                    fontWeight = FontWeight.Bold,
                )
            }

            Surface(
                color = PauseColors.Wine,
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(34.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(R.string.home_product_create_cta),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Filled.ChevronRight,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
    }
}

/** Miniature visual mockup of the printed photobooth strip. */
@Composable
private fun MiniPhotoboothStrip(slotCount: Int) {
    Surface(
        color = Color.White,
        shape = RoundedCornerShape(4.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
        shadowElevation = 1.dp,
        modifier = Modifier
            .width(if (slotCount == 1) 70.dp else 52.dp)
            .height(if (slotCount == 1) 85.dp else 105.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 6.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                repeat(slotCount) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .clip(RoundedCornerShape(2.dp))
                            .background(PauseColors.CategoryBg),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.pause_mark),
                            contentDescription = null,
                            tint = PauseColors.Charcoal.copy(alpha = 0.25f),
                            modifier = Modifier.size(10.dp),
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "PAUSE",
                fontSize = 6.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                color = PauseColors.Muted,
            )
        }
    }
}

/** Recent order card matching the Figma design. */
@Composable
private fun OrderCardPlaceholder(
    orderCode: String = "#NK-8429",
    statusLabel: String = "Đang in",
    title: String = "Bộ ảnh Polaroids Hoài Niệm (12 ảnh)",
    priceText: String = "190.000đ",
    onClick: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = PauseColors.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
        shadowElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .background(PauseColors.WineLight, CircleShape)
                    .border(1.dp, PauseColors.Wine.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painter = painterResource(R.drawable.pause_mark),
                    contentDescription = null,
                    tint = PauseColors.Wine,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = orderCode,
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Ink,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        color = Color(0xFFE8F5E9),
                        shape = RoundedCornerShape(4.dp),
                    ) {
                        Text(
                            text = statusLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF2E7D32),
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = PauseColors.Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "Nhấn để xem chi tiết đơn in",
                    style = MaterialTheme.typography.labelSmall,
                    color = PauseColors.Wine,
                    fontSize = 11.sp,
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = priceText,
                    style = MaterialTheme.typography.titleSmall,
                    color = PauseColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Chi tiết →",
                    style = MaterialTheme.typography.labelSmall,
                    color = PauseColors.Muted,
                )
            }
        }
    }
}

/** Explore tab placeholder until the discover feed is specified. */
@Composable
fun ExploreScreen(onNavigate: (PauseTab) -> Unit) {
    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(selected = PauseTab.PHOTOBOOTH, onSelect = onNavigate)
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = stringResource(R.string.tab_photobooth),
                    style = MaterialTheme.typography.headlineMedium,
                    color = PauseColors.Ink,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.profile_coming_soon),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
            }
        }
    }
}
