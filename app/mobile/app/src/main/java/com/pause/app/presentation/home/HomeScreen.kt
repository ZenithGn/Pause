package com.pause.app.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import com.pause.app.presentation.common.components.PauseBottomBar
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.theme.PauseColors

/**
 * Placeholder for the Home Page (Figma screen 4).
 *
 * The real drawer carousel belongs to FR-02; this screen only proves the
 * post-login navigation target and hosts the bottom tab bar.
 */
@Composable
fun HomeScreen(
    displayName: String?,
    onOpenProfile: () -> Unit,
) {
    Scaffold(
        containerColor = PauseColors.Paper,
        bottomBar = {
            PauseBottomBar(
                selected = PauseTab.HOME,
                onSelect = { tab -> if (tab == PauseTab.PROFILE) onOpenProfile() },
            )
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
                        text = stringResource(R.string.home_drawers_placeholder),
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

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .background(PauseColors.Surface, RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = stringResource(R.string.profile_coming_soon),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = {},
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
