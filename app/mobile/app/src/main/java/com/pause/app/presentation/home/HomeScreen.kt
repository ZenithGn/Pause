package com.pause.app.presentation.home

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.presentation.common.components.DrawerCard
import com.pause.app.presentation.common.components.DrawerEmptyState
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.theme.PauseColors

/**
 * Figma Home Page (screen 4): greeting, recent drawers carousel, quick actions,
 * bottom tabs. FR-02 data now comes from `list_drawers()`.
 */
@Composable
fun HomeScreen(
    displayName: String?,
    recentDrawers: List<Drawer>,
    hasError: Boolean,
    onCreateDrawer: () -> Unit,
    onOpenDrawer: (Drawer) -> Unit,
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
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 20.dp),
        ) {
            val greeting = displayName?.let { stringResource(R.string.home_greeting, it) }
                ?: stringResource(R.string.home_greeting_anonymous)

            Text(
                text = greeting,
                style = MaterialTheme.typography.headlineMedium,
                color = PauseColors.Ink,
            )
            Spacer(modifier = Modifier.height(20.dp))

            Surface(
                shape = RoundedCornerShape(20.dp),
                color = PauseColors.Ink,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = stringResource(R.string.home_recent_memories),
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (recentDrawers.isEmpty()) {
                            stringResource(R.string.drawers_empty_message)
                        } else {
                            stringResource(R.string.drawers_photo_count, recentDrawers.size)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.7f),
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = stringResource(R.string.home_drawers_section),
                style = MaterialTheme.typography.titleLarge,
                color = PauseColors.Ink,
            )
            Spacer(modifier = Modifier.height(12.dp))

            when {
                recentDrawers.isNotEmpty() -> LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 4.dp),
                ) {
                    items(recentDrawers, key = { it.id }) { drawer ->
                        Box(modifier = Modifier.width(280.dp)) {
                            DrawerCard(
                                drawer = drawer,
                                thumbnailUrl = null,
                                onClick = { onOpenDrawer(drawer) },
                            )
                        }
                    }
                }

                hasError -> Text(
                    text = stringResource(R.string.error_network),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Error,
                )

                else -> DrawerEmptyState(
                    title = stringResource(R.string.drawers_empty_title),
                    message = stringResource(R.string.drawers_empty_message),
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = onCreateDrawer,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(999.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Ink,
                        contentColor = Color.White,
                    ),
                ) {
                    Text(text = stringResource(R.string.home_create_drawer))
                }
                OutlinedButton(
                    onClick = {},
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(999.dp),
                ) {
                    Text(text = stringResource(R.string.home_quick_photobooth))
                }
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
