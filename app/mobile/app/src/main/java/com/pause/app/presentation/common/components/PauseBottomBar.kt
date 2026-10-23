package com.pause.app.presentation.common.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.pause.app.R
import com.pause.app.presentation.theme.PauseColors

enum class PauseTab(val labelRes: Int, val icon: ImageVector) {
    HOME(R.string.tab_home, Icons.Filled.Home),
    EXPLORE(R.string.tab_explore, Icons.Filled.Explore),
    MEMORIES(R.string.tab_memories, Icons.Filled.PhotoLibrary),
    PROFILE(R.string.tab_profile, Icons.Filled.Person),
}

/** Figma: sticky 4-tab bottom bar (Home / Explore / Memories / Profile). */
@Composable
fun PauseBottomBar(
    selected: PauseTab,
    onSelect: (PauseTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationBar(
        modifier = modifier,
        containerColor = PauseColors.Surface,
        tonalElevation = 0.dp,
    ) {
        PauseTab.entries.forEach { tab ->
            NavigationBarItem(
                selected = tab == selected,
                onClick = { onSelect(tab) },
                icon = { Icon(imageVector = tab.icon, contentDescription = null) },
                label = { Text(text = stringResource(tab.labelRes)) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = PauseColors.Wine,
                    selectedTextColor = PauseColors.Wine,
                    indicatorColor = PauseColors.WineLight,
                    unselectedIconColor = PauseColors.Muted,
                    unselectedTextColor = PauseColors.Muted,
                ),
            )
        }
    }
}
