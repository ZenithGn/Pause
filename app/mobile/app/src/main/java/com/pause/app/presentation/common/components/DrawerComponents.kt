package com.pause.app.presentation.common.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
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

/** Figma card: cover + name + photo count + storage usage + access badges. */
@Composable
fun DrawerCard(
    drawer: Drawer,
    thumbnailUrl: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = PauseColors.Surface,
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(PauseColors.Paper),
            ) {
                if (thumbnailUrl != null) {
                    AsyncImage(
                        model = thumbnailUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .background(PauseColors.Ink.copy(alpha = 0.9f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "PAUSE",
                            letterSpacing = 6.sp,
                            color = Color.White.copy(alpha = 0.7f),
                            style = MaterialTheme.typography.titleLarge,
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (!drawer.isOwner) {
                        BadgeChip(
                            text = stringResource(R.string.drawers_shared_badge),
                            filled = true,
                        )
                    }
                    if (!drawer.canWrite) {
                        BadgeChip(text = stringResource(R.string.drawers_view_only_badge), filled = false)
                    }
                    if (drawer.isPurchased) {
                        BadgeChip(text = stringResource(R.string.drawers_purchased_badge), filled = false)
                    }
                }
            }

            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = drawer.name,
                    style = MaterialTheme.typography.titleLarge,
                    color = PauseColors.Ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (drawer.isOwner) {
                        stringResource(R.string.drawers_photo_count, drawer.photoCount)
                    } else {
                        stringResource(R.string.drawers_photo_count, drawer.photoCount) +
                            " · " + stringResource(R.string.drawers_owner_label, drawer.ownerName)
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
                Spacer(modifier = Modifier.height(10.dp))
                StorageIndicator(
                    usedBytes = drawer.storageUsedBytes,
                    limitBytes = drawer.storageLimitBytes,
                )
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
