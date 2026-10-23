package com.pause.app.presentation.photobooth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.theme.PauseColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TemplateListScreen(
    state: PhotoboothUiState,
    onBack: () -> Unit,
    onTemplateSelected: (String) -> Unit,
) {
    Scaffold(
        topBar = { PhotoboothTopBar(title = stringResource(R.string.photobooth_templates_title), onBack = onBack) },
        containerColor = PauseColors.Paper,
    ) { padding ->
        when {
            state.isLoadingTemplates -> LoadingBody(Modifier.padding(padding))
            else -> Column(Modifier.fillMaxSize().padding(padding)) {
                Text(
                    text = stringResource(R.string.photobooth_templates_subtitle),
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
                state.error?.let { PauseErrorBanner(it, Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) }
                if (state.templates.isEmpty()) {
                    EmptyBody(R.string.photobooth_templates_empty)
                } else {
                    TemplateGrid(state.templates, onTemplateSelected)
                }
            }
        }
    }
}

@Composable
private fun TemplateGrid(templates: List<PhotoboothTemplate>, onTemplateSelected: (String) -> Unit) {
    val categories = listOf("all") + templates.map { it.category }.distinct()
    var selectedCategory by remember { mutableStateOf("all") }
    val visibleTemplates = templates.filter { selectedCategory == "all" || it.category == selectedCategory }
    Column(Modifier.fillMaxSize()) {
        LazyRow(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(categories.size) { index ->
                val category = categories[index]
                FilterChip(
                    selected = category == selectedCategory,
                    onClick = { selectedCategory = category },
                    label = { Text(if (category == "all") stringResource(R.string.photobooth_filter_all) else category) },
                )
            }
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            items(visibleTemplates, key = { it.id }) { template ->
                TemplateCard(template, onClick = { onTemplateSelected(template.id) })
            }
        }
    }
}

@Composable
private fun TemplateCard(template: PhotoboothTemplate, onClick: () -> Unit) {
    Column(Modifier.clickable(onClick = onClick)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.76f)
                .clip(RoundedCornerShape(14.dp))
                .background(PauseColors.CategoryBg),
            contentAlignment = Alignment.Center,
        ) {
            if (template.previewPath.startsWith("http")) {
                AsyncImage(
                    model = template.previewPath,
                    contentDescription = template.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Icon(Icons.Filled.Image, null, tint = PauseColors.Muted, modifier = Modifier.size(34.dp))
            }
            if (template.isPremium) {
                Text(
                    text = stringResource(R.string.photobooth_premium),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                        .background(PauseColors.Wine, RoundedCornerShape(99.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelLarge,
                    color = PauseColors.Surface,
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(template.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
        Text(
            text = stringResource(R.string.photobooth_slot_count, template.slotCount),
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Muted,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SelectPhotosScreen(
    state: PhotoboothUiState,
    onBack: () -> Unit,
    onDrawerSelected: (String) -> Unit,
    onPhotoToggled: (Photo) -> Unit,
    onContinue: () -> Unit,
) {
    Scaffold(
        topBar = { PhotoboothTopBar(title = stringResource(R.string.photobooth_select_photos_title), onBack = onBack) },
        bottomBar = {
            Button(
                onClick = onContinue,
                enabled = state.canPreview,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PauseColors.Wine),
            ) { Text(stringResource(R.string.photobooth_view_preview)) }
        },
        containerColor = PauseColors.Paper,
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Text(
                text = stringResource(R.string.photobooth_select_photos_hint, state.selectedPhotoIds.size, state.requiredSlots),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = PauseColors.Muted,
            )
            state.error?.let { PauseErrorBanner(it, Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) }
            DrawerPicker(state.drawers, state.selectedDrawerId, onDrawerSelected)
            when {
                state.isLoadingPhotos -> LoadingBody()
                state.drawers.isEmpty() -> EmptyBody(R.string.photobooth_drawers_empty)
                state.photos.isEmpty() -> EmptyBody(R.string.photobooth_photos_empty)
                else -> PhotoPickerGrid(state, onPhotoToggled)
            }
        }
    }
}

@Composable
private fun DrawerPicker(drawers: List<Drawer>, selectedDrawerId: String?, onDrawerSelected: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(drawers.size) { index ->
            val drawer = drawers[index]
            FilterChip(
                selected = drawer.id == selectedDrawerId,
                onClick = { onDrawerSelected(drawer.id) },
                label = { Text(drawer.name, maxLines = 1) },
            )
        }
    }
}

@Composable
private fun PhotoPickerGrid(state: PhotoboothUiState, onPhotoToggled: (Photo) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        items(state.photos, key = { it.id }) { photo ->
            val selected = photo.id in state.selectedPhotoIds
            Box(
                modifier = Modifier
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(PauseColors.CategoryBg)
                    .border(if (selected) 3.dp else 0.dp, PauseColors.Wine, RoundedCornerShape(10.dp))
                    .clickable { onPhotoToggled(photo) },
            ) {
                state.photoUrls[photo.id]?.let { url ->
                    AsyncImage(url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } ?: Icon(
                    Icons.Filled.Image,
                    null,
                    tint = PauseColors.Muted,
                    modifier = Modifier.align(Alignment.Center),
                )
                if (selected) {
                    Box(
                        Modifier.align(Alignment.TopEnd).padding(6.dp).size(24.dp)
                            .background(PauseColors.Wine, RoundedCornerShape(99.dp)),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Filled.Check, null, tint = PauseColors.Surface, modifier = Modifier.size(16.dp)) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotoboothPreviewScreen(
    state: PhotoboothUiState,
    onBack: () -> Unit,
    onEditPhotos: () -> Unit,
    onSave: () -> Unit,
    onOrderClick: (itemId: String) -> Unit = {},
) {
    val template = state.selectedTemplate
    Scaffold(
        topBar = { PhotoboothTopBar(title = stringResource(R.string.photobooth_preview_title), onBack = onBack) },
        bottomBar = {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                if (state.savedDraftId != null) {
                    Button(
                        onClick = { onOrderClick(state.savedDraftId) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PauseColors.Wine),
                    ) {
                        Text(stringResource(R.string.photobooth_order_now), fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = onSave,
                        enabled = !state.isSaving,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PauseColors.Wine),
                    ) {
                        if (state.isSaving) CircularProgressIndicator(Modifier.size(18.dp), color = PauseColors.Surface, strokeWidth = 2.dp)
                        else Text(stringResource(R.string.photobooth_save_draft), fontWeight = FontWeight.Bold)
                    }
                }
                OutlinedButton(onClick = onEditPhotos, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    Text(stringResource(R.string.photobooth_edit_photos), color = PauseColors.Wine)
                }
            }
        },
        containerColor = PauseColors.Paper,
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(10.dp))
            Text(template?.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(16.dp))
            Box(
                modifier = Modifier.width(210.dp).height(460.dp).clip(RoundedCornerShape(12.dp))
                    .background(PauseColors.Surface).border(1.dp, PauseColors.Line, RoundedCornerShape(12.dp)).padding(12.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.selectedPhotoIds.forEach { photoId ->
                        Box(Modifier.fillMaxWidth().weight(1f).clip(RoundedCornerShape(6.dp)).background(PauseColors.CategoryBg)) {
                            state.photoUrls[photoId]?.let { url ->
                                AsyncImage(url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = stringResource(R.string.photobooth_preview_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = PauseColors.Muted,
                textAlign = TextAlign.Center,
            )
            state.error?.let { PauseErrorBanner(it, Modifier.padding(top = 12.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PhotoboothTopBar(title: String, onBack: () -> Unit) {
    TopAppBar(
        title = { Text(title, fontWeight = FontWeight.SemiBold) },
        navigationIcon = { Icon(Icons.Filled.ArrowBack, stringResource(R.string.back), Modifier.padding(start = 12.dp).clickable(onClick = onBack)) },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = PauseColors.Paper),
    )
}

@Composable
private fun LoadingBody(modifier: Modifier = Modifier) = Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    CircularProgressIndicator(color = PauseColors.Wine)
}

@Composable
private fun EmptyBody(messageRes: Int) = Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
    Text(stringResource(messageRes), color = PauseColors.Muted, textAlign = TextAlign.Center)
}
