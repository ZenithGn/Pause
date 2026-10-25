package com.pause.app.presentation.common.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.presentation.common.StorageFormat
import com.pause.app.presentation.theme.PauseColors

@Composable
fun DrawerCard(
    drawer: Drawer,
    thumbnailUrl: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val fraction = if (drawer.storageLimitBytes <= 0) 0f
    else (drawer.storageUsedBytes.toFloat() / drawer.storageLimitBytes.toFloat()).coerceIn(0f, 1f)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        color = PauseColors.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
        shadowElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Thumbnail / Icon
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(PauseColors.Ink),
                contentAlignment = Alignment.Center,
            ) {
                if (thumbnailUrl != null) {
                    AsyncImage(
                        model = thumbnailUrl,
                        contentDescription = drawer.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(
                        painter = painterResource(R.drawable.pause_mark_white),
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = Color.White,
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = drawer.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        color = if (drawer.isOwner) PauseColors.CategoryBg else PauseColors.WineLight,
                        shape = RoundedCornerShape(6.dp),
                    ) {
                        Text(
                            text = if (drawer.isOwner) "Của tôi" else if (drawer.canWrite) "Chia sẻ (Sửa)" else "Chia sẻ (Xem)",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = if (drawer.isOwner) PauseColors.Muted else PauseColors.Wine,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = if (drawer.isOwner) {
                        "Supabase Sync • ${drawer.photoCount} ảnh"
                    } else {
                        "Được chia sẻ bởi ${drawer.ownerName} • ${drawer.photoCount} ảnh"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = PauseColors.Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )

                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { fraction },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = if (fraction > 0.85f) PauseColors.Error else PauseColors.Ink,
                    trackColor = PauseColors.CategoryBg,
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "${StorageFormat.bytes(drawer.storageUsedBytes)} / ${StorageFormat.bytes(drawer.storageLimitBytes)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = PauseColors.Muted,
                    )
                    Text(
                        text = "256 MB",
                        style = MaterialTheme.typography.labelSmall,
                        color = PauseColors.Muted,
                    )
                }
            }
        }
    }
}

@Composable
fun StorageIndicator(
    usedBytes: Long,
    limitBytes: Long,
    modifier: Modifier = Modifier,
) {
    val fraction = if (limitBytes <= 0) 0f
    else (usedBytes.toFloat() / limitBytes.toFloat()).coerceIn(0f, 1f)
    Column(modifier = modifier.fillMaxWidth()) {
        LinearProgressIndicator(
            progress = { fraction },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp),
            color = if (fraction > 0.9f) PauseColors.Error else PauseColors.Wine,
            trackColor = PauseColors.Line
        )
        Spacer(modifier = Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = stringResource(
                    R.string.drawers_storage_usage,
                    StorageFormat.bytes(usedBytes),
                    StorageFormat.bytes(limitBytes),
                ),
                style = MaterialTheme.typography.bodyMedium,
                color = PauseColors.Muted,
            )
            Text(
                text = stringResource(
                    R.string.drawers_storage_remaining,
                    StorageFormat.bytes((limitBytes - usedBytes).coerceAtLeast(0)),
                ),
                style = MaterialTheme.typography.bodyMedium,
                color = PauseColors.Muted,
            )
        }
    }
}

@Composable
fun BadgeChip(
    text: String,
    filled: Boolean,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = if (filled) PauseColors.Wine else PauseColors.Surface.copy(alpha = 0.92f),
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = if (filled) Color.White else PauseColors.Ink,
        )
    }
}

@Composable
fun DrawerEmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .background(PauseColors.Surface, RoundedCornerShape(24.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "✿", style = MaterialTheme.typography.headlineMedium)
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = PauseColors.Ink,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Muted,
        )
        if (actionLabel != null && onAction != null) {
            Spacer(modifier = Modifier.height(20.dp))
            OutlinedButton(onClick = onAction, shape = RoundedCornerShape(999.dp)) {
                Text(text = actionLabel)
            }
        }
    }
}
