package com.pause.app.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.theme.PauseColors

/**
 * Figma Home Page – redesigned to match the provided mockup.
 * Greeting header, search bar, photobooth banner, category row,
 * print products carousel, recent orders section.
 */
@Composable
fun HomeScreen(
    displayName: String?,
    recentDrawers: List<Drawer>,
    hasError: Boolean,
    pendingInvitationCount: Int,
    onOpenInvitations: () -> Unit,
    onCreateDrawer: () -> Unit,
    onOpenDrawer: (Drawer) -> Unit,
    onStartPhotobooth: () -> Unit,
    onViewOrders: () -> Unit = {},
    onNavigate: (PauseTab) -> Unit,
) {
    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(selected = PauseTab.HOME, onSelect = onNavigate)
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
        ) {
            // ── Header: Welcome back + icons ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Clock / logo placeholder
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(PauseColors.CategoryBg, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "P",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = PauseColors.Ink,
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.home_welcome_back),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                    Text(
                        text = displayName ?: stringResource(R.string.home_greeting_anonymous),
                        style = MaterialTheme.typography.titleLarge,
                        color = PauseColors.Ink,
                        fontWeight = FontWeight.Bold,
                    )
                }
                IconButton(onClick = onOpenInvitations) {
                    Box {
                        Icon(
                            imageVector = Icons.Filled.Notifications,
                            contentDescription = null,
                            tint = PauseColors.Ink,
                            modifier = Modifier.size(24.dp),
                        )
                        if (pendingInvitationCount > 0) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(PauseColors.Wine, CircleShape)
                                    .align(Alignment.TopEnd),
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.width(4.dp))
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(PauseColors.Wine, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            // ── Search bar ──
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(12.dp),
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
                    Text(
                        text = stringResource(R.string.home_search_placeholder),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Photobooth banner ──
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(20.dp),
                color = PauseColors.BannerBg,
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = stringResource(R.string.home_banner_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                        letterSpacing = 2.sp,
                        fontSize = 11.sp,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.home_banner_title),
                        style = MaterialTheme.typography.headlineMedium,
                        color = PauseColors.Ink,
                        fontWeight = FontWeight.ExtraBold,
                        lineHeight = 32.sp,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = stringResource(R.string.home_banner_desc),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                        lineHeight = 20.sp,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onStartPhotobooth,
                        shape = RoundedCornerShape(999.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PauseColors.Wine,
                            contentColor = Color.White,
                        ),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.home_banner_cta),
                            style = MaterialTheme.typography.labelLarge,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Ngăn kéo kỷ niệm – Category row ──
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
                    fontWeight = FontWeight.SemiBold,
                )
                TextButton(onClick = { onNavigate(PauseTab.MEMORIES) }) {
                    Text(
                        text = stringResource(R.string.home_drawers_see_all),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                CategoryIcon(
                    icon = Icons.Filled.CardGiftcard,
                    label = stringResource(R.string.home_category_birthday),
                    onClick = {},
                )
                CategoryIcon(
                    icon = Icons.Filled.Home,
                    label = stringResource(R.string.home_category_family),
                    onClick = {},
                )
                CategoryIcon(
                    icon = Icons.Filled.Flight,
                    label = stringResource(R.string.home_category_travel),
                    onClick = {},
                )
                CategoryIcon(
                    icon = Icons.Filled.Add,
                    label = stringResource(R.string.home_category_more),
                    onClick = onCreateDrawer,
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Sản phẩm in ──
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
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = stringResource(R.string.home_products_count, 4),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    ProductCard(
                        name = stringResource(R.string.home_product_polaroid),
                        price = stringResource(R.string.home_product_polaroid_price),
                        onClick = {},
                    )
                }
                item {
                    ProductCard(
                        name = stringResource(R.string.home_product_photostrip),
                        price = stringResource(R.string.home_product_photostrip_price),
                        onClick = {},
                    )
                }
                item {
                    ProductCard(
                        name = stringResource(R.string.home_product_photobook),
                        price = stringResource(R.string.home_product_photobook_price),
                        onClick = {},
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

            // Sample order card placeholder
            OrderCardPlaceholder(modifier = Modifier.padding(horizontal = 20.dp))

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

// ─────────────────────────── Sub-components ───────────────────────────

/** Circular icon + label used in the category row. */
@Composable
private fun CategoryIcon(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .background(PauseColors.CategoryBg, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = PauseColors.Ink,
                modifier = Modifier.size(24.dp),
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Muted,
            fontSize = 12.sp,
        )
    }
}

/** Print product card – thumbnail placeholder + name + price. */
@Composable
private fun ProductCard(
    name: String,
    price: String,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(120.dp)
            .clickable(onClick = onClick),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.85f),
            shape = RoundedCornerShape(16.dp),
            color = PauseColors.CategoryBg,
        ) {
            // Product image placeholder
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = "📷",
                    fontSize = 28.sp,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Ink,
            fontWeight = FontWeight.Medium,
        )
        Text(
            text = price,
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Muted,
            fontSize = 12.sp,
        )
    }
}

/** Recent order card placeholder matching the Figma design. */
@Composable
private fun OrderCardPlaceholder(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = PauseColors.Surface,
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(PauseColors.Ink, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(text = "📸", fontSize = 20.sp)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#NK-8429",
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(Color(0xFF4CAF50), CircleShape),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Đang in",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF4CAF50),
                        fontSize = 12.sp,
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Bộ ảnh Polaroids Hoài Niệm (12 ảnh)",
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontSize = 13.sp,
                )
                Text(
                    text = "Hôm nay, 10:25",
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                    fontSize = 11.sp,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "190.000đ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "Chi tiết",
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                    fontSize = 12.sp,
                )
            }
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = PauseColors.BlueBadge,
                modifier = Modifier.size(24.dp),
            )
        }
    }
}

/** Explore tab placeholder until the discover feed is specified. */
@Composable
fun ExploreScreen(onNavigate: (PauseTab) -> Unit) {
    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(selected = PauseTab.EXPLORE, onSelect = onNavigate)
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
                    text = stringResource(R.string.tab_explore),
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
