package com.pause.app.presentation.photobooth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.CAPTION_BOTTOM_OFFSET_PX
import com.pause.app.domain.model.CAPTION_FONT_SIZE_PX
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.model.TemplateLayout
import com.pause.app.domain.model.TemplateSlot
import com.pause.app.domain.model.TemplateText
import com.pause.app.domain.model.captionColorHex
import com.pause.app.domain.model.effectiveLayout
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.theme.PauseColors
import com.pause.app.presentation.theme.PauseTheme
import android.graphics.Color as AndroidColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TemplateListScreen(
    state: PhotoboothUiState,
    onBack: () -> Unit,
    onTemplateSelected: (String) -> Unit,
    onSlotCountSelected: (Int?) -> Unit = {},
) {
    val selectedSlot = state.selectedSlotCount
    BackHandler(enabled = selectedSlot != null) {
        onSlotCountSelected(null)
    }

    val topBarTitle = if (selectedSlot == null) {
        stringResource(R.string.photobooth_category_title)
    } else {
        stringResource(R.string.photobooth_templates_by_slot_title, selectedSlot)
    }

    val subtitle = if (selectedSlot == null) {
        stringResource(R.string.photobooth_category_subtitle)
    } else {
        stringResource(R.string.photobooth_templates_by_slot_subtitle, selectedSlot)
    }

    Scaffold(
        topBar = {
            PhotoboothTopBar(
                title = topBarTitle,
                onBack = {
                    if (selectedSlot != null) onSlotCountSelected(null) else onBack()
                },
            )
        },
        containerColor = PauseColors.Paper,
    ) { padding ->
        when {
            state.isLoadingTemplates -> LoadingBody(Modifier.padding(padding))
            else -> Column(Modifier.fillMaxSize().padding(padding)) {
                Text(
                    text = subtitle,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PauseColors.Muted,
                )
                state.error?.let { PauseErrorBanner(it, Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) }
                if (state.templates.isEmpty()) {
                    EmptyBody(R.string.photobooth_templates_empty)
                } else if (selectedSlot == null) {
                    SlotCategoryGrid(
                        templates = state.templates,
                        onSlotCountSelected = { onSlotCountSelected(it) },
                    )
                } else {
                    val slotTemplates = state.filteredTemplates
                    if (slotTemplates.isEmpty()) {
                        Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text(
                                text = stringResource(R.string.photobooth_templates_by_slot_empty, selectedSlot),
                                color = PauseColors.Muted,
                                textAlign = TextAlign.Center,
                            )
                        }
                    } else {
                        TemplateGrid(slotTemplates, onTemplateSelected)
                    }
                }
            }
        }
    }
}

private data class SlotCategorySpec(
    val slotCount: Int,
    val descriptionRes: Int,
)

private val SLOT_CATEGORIES = listOf(
    SlotCategorySpec(slotCount = 1, descriptionRes = R.string.photobooth_category_1_desc),
    SlotCategorySpec(slotCount = 2, descriptionRes = R.string.photobooth_category_2_desc),
    SlotCategorySpec(slotCount = 3, descriptionRes = R.string.photobooth_category_3_desc),
    SlotCategorySpec(slotCount = 4, descriptionRes = R.string.photobooth_category_4_desc),
)

@Composable
private fun SlotCategoryGrid(
    templates: List<PhotoboothTemplate>,
    onSlotCountSelected: (Int) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        items(SLOT_CATEGORIES, key = { it.slotCount }) { spec ->
            val templateCount = templates.count { it.slotCount == spec.slotCount }
            SlotCategoryCard(
                slotCount = spec.slotCount,
                description = stringResource(spec.descriptionRes),
                templateCount = templateCount,
                onClick = { onSlotCountSelected(spec.slotCount) },
            )
        }
    }
}

@Composable
private fun SlotCategoryCard(
    slotCount: Int,
    description: String,
    templateCount: Int,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        color = PauseColors.Surface,
        border = BorderStroke(1.dp, PauseColors.Line),
        shadowElevation = 2.dp,
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.82f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(PauseColors.BannerBg)
                    .padding(14.dp),
                contentAlignment = Alignment.Center,
            ) {
                SlotLayoutIllustration(slotCount = slotCount)

                Surface(
                    modifier = Modifier.align(Alignment.TopEnd),
                    shape = RoundedCornerShape(99.dp),
                    color = PauseColors.WineLight,
                    border = BorderStroke(1.dp, PauseColors.Wine.copy(alpha = 0.2f)),
                ) {
                    Text(
                        text = stringResource(R.string.photobooth_category_template_count, templateCount),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Wine,
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.photobooth_category_slot_title, slotCount),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = PauseColors.Ink,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = PauseColors.Muted,
                maxLines = 2,
                minLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.photobooth_category_view_templates),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = PauseColors.Wine,
            )
        }
    }
}

/**
 * Miniature schematic illustration of 1, 2, 3, or 4 photo slots inside a photobooth frame.
 */
@Composable
private fun SlotLayoutIllustration(slotCount: Int) {
    Surface(
        modifier = Modifier
            .fillMaxHeight(0.92f)
            .aspectRatio(if (slotCount == 1) 0.82f else 0.66f),
        shape = RoundedCornerShape(8.dp),
        color = PauseColors.Surface,
        border = BorderStroke(1.dp, PauseColors.Line),
        shadowElevation = 3.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
            ) {
                when (slotCount) {
                    1 -> {
                        SlotMiniBox(Modifier.fillMaxSize())
                    }
                    2 -> {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            SlotMiniBox(Modifier.weight(1f).fillMaxWidth())
                            SlotMiniBox(Modifier.weight(1f).fillMaxWidth())
                        }
                    }
                    3 -> {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            repeat(3) {
                                SlotMiniBox(Modifier.weight(1f).fillMaxWidth())
                            }
                        }
                    }
                    else -> {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            Row(
                                modifier = Modifier.weight(1f).fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                            ) {
                                SlotMiniBox(Modifier.weight(1f).fillMaxHeight())
                                SlotMiniBox(Modifier.weight(1f).fillMaxHeight())
                            }
                            Row(
                                modifier = Modifier.weight(1f).fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                            ) {
                                SlotMiniBox(Modifier.weight(1f).fillMaxHeight())
                                SlotMiniBox(Modifier.weight(1f).fillMaxHeight())
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Box(
                modifier = Modifier
                    .width(28.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(PauseColors.Wine.copy(alpha = 0.55f)),
            )
        }
    }
}

@Composable
private fun SlotMiniBox(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(PauseColors.WineLight)
            .border(1.dp, PauseColors.Wine.copy(alpha = 0.25f), RoundedCornerShape(4.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.Image,
            contentDescription = null,
            tint = PauseColors.Wine.copy(alpha = 0.55f),
            modifier = Modifier.size(14.dp),
        )
    }
}

@Composable
private fun TemplateGrid(templates: List<PhotoboothTemplate>, onTemplateSelected: (String) -> Unit) {
    val distinctCategories = templates.map { it.category }.distinct()
    val categories = if (distinctCategories.size > 1) listOf("all") + distinctCategories else emptyList()
    var selectedCategory by remember(templates) { mutableStateOf("all") }
    val visibleTemplates = templates.filter { selectedCategory == "all" || it.category == selectedCategory }
    Column(Modifier.fillMaxSize()) {
        if (categories.isNotEmpty()) {
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
    val hasCustomPreviewUrl = template.previewPath.startsWith("http") && !template.previewPath.contains("placehold.co")
    Column(Modifier.clickable(onClick = onClick)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.76f)
                .clip(RoundedCornerShape(14.dp))
                .background(PauseColors.CategoryBg)
                .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (hasCustomPreviewUrl) {
                AsyncImage(
                    model = template.previewPath,
                    contentDescription = template.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    TemplateLayoutPreview(
                        layout = template.effectiveLayout,
                        photoUrls = emptyList(),
                        caption = "",
                        modifier = Modifier
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(6.dp))
                            .border(1.dp, PauseColors.Line, RoundedCornerShape(6.dp)),
                    )
                }
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
            val selectedIndex = state.selectedPhotoIds.indexOf(photo.id)
            val selected = selectedIndex >= 0
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
                        Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(26.dp)
                            .background(PauseColors.Wine, RoundedCornerShape(99.dp))
                            .border(1.5.dp, PauseColors.Surface, RoundedCornerShape(99.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = (selectedIndex + 1).toString(),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = PauseColors.Surface,
                        )
                    }
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
    onCaptionChange: (String) -> Unit = {},
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
                    OutlinedButton(
                        onClick = onSave,
                        enabled = !state.isSaving,
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    ) {
                        Text(stringResource(R.string.photobooth_regenerate_preview), color = PauseColors.Wine)
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
                        else Text(
                            stringResource(
                                if (state.previewUrl == null) R.string.photobooth_generate_preview
                                else R.string.photobooth_regenerate_preview,
                            ),
                            fontWeight = FontWeight.Bold,
                        )
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
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(10.dp))
            Text(template?.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .width(230.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PauseColors.Surface)
                    .border(1.dp, PauseColors.Line, RoundedCornerShape(12.dp))
                    .padding(10.dp),
                contentAlignment = Alignment.Center,
            ) {
                val layout = template?.effectiveLayout
                val rendered = state.previewUrl
                when {
                    rendered != null -> AsyncImage(
                        model = rendered,
                        contentDescription = stringResource(R.string.photobooth_preview_title),
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(layout?.let { it.width.toFloat() / it.height } ?: (2f / 3f)),
                        contentScale = ContentScale.Fit,
                    )
                    layout != null -> TemplateLayoutPreview(
                        layout = layout,
                        photoUrls = state.selectedPhotoIds.map { state.photoUrls[it] },
                        caption = state.caption,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (state.isSaving) {
                    Box(
                        Modifier.matchParentSize().background(PauseColors.Surface.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center,
                    ) { CircularProgressIndicator(color = PauseColors.Wine) }
                }
            }
            Spacer(Modifier.height(12.dp))
            androidx.compose.material3.OutlinedTextField(
                value = state.caption,
                onValueChange = onCaptionChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.photobooth_caption_label)) },
                placeholder = { Text(stringResource(R.string.photobooth_caption_hint)) },
                singleLine = true,
                enabled = !state.isSaving,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.photobooth_preview_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = PauseColors.Muted,
                textAlign = TextAlign.Center,
            )
            state.error?.let { PauseErrorBanner(it, Modifier.padding(top = 12.dp)) }
            Spacer(Modifier.height(16.dp))
        }
    }
}

/**
 * Live preview drawn with the same geometry as [com.pause.app.data.media.AndroidPhotoboothRenderer]
 * (slots, frame, template texts and the user caption), scaled to the available width.
 */
@Composable
private fun TemplateLayoutPreview(
    layout: TemplateLayout,
    photoUrls: List<String?>,
    caption: String,
    modifier: Modifier = Modifier,
) {
    BoxWithConstraints(
        modifier
            .aspectRatio(layout.width.toFloat() / layout.height)
            .background(Color(parseHexColor(layout.backgroundColor, AndroidColor.WHITE))),
    ) {
        val unit = maxWidth / layout.width
        layout.slots.forEachIndexed { position, slot ->
            Box(
                Modifier
                    .offset(x = unit * slot.x, y = unit * slot.y)
                    .size(width = unit * slot.width, height = unit * slot.height)
                    .background(PauseColors.CategoryBg),
                contentAlignment = Alignment.Center,
            ) {
                val url = photoUrls.getOrNull(position)
                if (url != null) {
                    AsyncImage(url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Icon(Icons.Filled.Image, null, tint = PauseColors.Muted, modifier = Modifier.size(20.dp))
                }
            }
        }
        layout.frameUrl?.let { frame ->
            AsyncImage(frame, null, Modifier.fillMaxSize(), contentScale = ContentScale.FillBounds)
        }
        Canvas(Modifier.fillMaxSize()) {
            val ratio = size.width / layout.width
            val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = android.graphics.Paint.Align.CENTER
            }
            drawIntoCanvas { canvas ->
                layout.texts.forEach { text ->
                    paint.color = parseHexColor(text.color, AndroidColor.BLACK)
                    paint.textSize = text.fontSize * ratio
                    canvas.nativeCanvas.drawText(text.content, text.x * ratio, text.y * ratio, paint)
                }
                if (caption.isNotBlank()) {
                    paint.color = parseHexColor(layout.captionColorHex, AndroidColor.BLACK)
                    paint.textSize = CAPTION_FONT_SIZE_PX * ratio
                    canvas.nativeCanvas.drawText(
                        caption.trim().take(40),
                        size.width / 2f,
                        (layout.height - CAPTION_BOTTOM_OFFSET_PX) * ratio,
                        paint,
                    )
                }
            }
        }
    }
}

private fun parseHexColor(value: String, fallback: Int): Int =
    runCatching { AndroidColor.parseColor(value) }.getOrDefault(fallback)

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

// =============================================================================
// Android Studio Previews (No backend required – open Split/Design view)
// =============================================================================

private val PREVIEW_TEMPLATES = listOf(
    PhotoboothTemplate(
        id = "t1",
        name = "Family Portrait",
        category = "family",
        previewPath = "",
        slotCount = 1,
        isPremium = false,
        layoutConfig = TemplateLayout(
            width = 1200,
            height = 1500,
            backgroundColor = "#F7F5F2",
            slots = listOf(TemplateSlot(0, 90, 90, 1020, 1080)),
            texts = listOf(TemplateText("Gia đình", 600, 1360, 48, "#2B2B2B")),
        ),
    ),
    PhotoboothTemplate(
        id = "t2",
        name = "Classic White",
        category = "couple",
        previewPath = "",
        slotCount = 2,
        isPremium = false,
        layoutConfig = TemplateLayout(
            width = 1200,
            height = 1800,
            backgroundColor = "#FFFFFF",
            slots = listOf(
                TemplateSlot(0, 60, 120, 1080, 700),
                TemplateSlot(1, 60, 900, 1080, 700),
            ),
            texts = listOf(TemplateText("Pause", 600, 1700, 48, "#111111")),
        ),
    ),
    PhotoboothTemplate(
        id = "t3",
        name = "Minimal Strip",
        category = "general",
        previewPath = "",
        slotCount = 3,
        isPremium = false,
        layoutConfig = TemplateLayout(
            width = 1200,
            height = 1800,
            backgroundColor = "#FFFFFF",
            slots = listOf(
                TemplateSlot(0, 100, 100, 1000, 440),
                TemplateSlot(1, 100, 600, 1000, 440),
                TemplateSlot(2, 100, 1100, 1000, 440),
            ),
            texts = listOf(TemplateText("pause.", 600, 1720, 40, "#111111")),
        ),
    ),
    PhotoboothTemplate(
        id = "t4",
        name = "Vintage Memories",
        category = "friends",
        previewPath = "",
        slotCount = 4,
        isPremium = false,
        layoutConfig = TemplateLayout(
            width = 1200,
            height = 1800,
            backgroundColor = "#F6EFE4",
            slots = listOf(
                TemplateSlot(0, 60, 90, 520, 390),
                TemplateSlot(1, 620, 90, 520, 390),
                TemplateSlot(2, 60, 510, 520, 390),
                TemplateSlot(3, 620, 510, 520, 390),
            ),
            texts = listOf(TemplateText("Vintage Memories", 600, 1700, 52, "#5B4636")),
        ),
    ),
    PhotoboothTemplate(
        id = "t5",
        name = "Premium Gold",
        category = "couple",
        previewPath = "",
        slotCount = 4,
        isPremium = true,
        layoutConfig = TemplateLayout(
            width = 1200,
            height = 1800,
            backgroundColor = "#111111",
            slots = listOf(
                TemplateSlot(0, 60, 80, 520, 620),
                TemplateSlot(1, 620, 80, 520, 620),
                TemplateSlot(2, 60, 740, 520, 620),
                TemplateSlot(3, 620, 740, 520, 620),
            ),
            texts = listOf(TemplateText("PAUSE GOLD", 600, 1700, 56, "#D4AF37")),
        ),
    ),
)

@Preview(name = "1. Chọn Category Khung (1-4 ảnh)", showBackground = true, widthDp = 390, heightDp = 800)
@Composable
private fun PhotoboothCategoryPreview() {
    PauseTheme {
        var slotCount by remember { mutableStateOf<Int?>(null) }
        TemplateListScreen(
            state = PhotoboothUiState(
                isLoadingTemplates = false,
                templates = PREVIEW_TEMPLATES,
                selectedSlotCount = slotCount,
            ),
            onBack = {},
            onSlotCountSelected = { slotCount = it },
            onTemplateSelected = {},
        )
    }
}

@Preview(name = "2. Danh sách Mẫu Khung 4 ảnh", showBackground = true, widthDp = 390, heightDp = 800)
@Composable
private fun PhotoboothTemplatesStepPreview() {
    PauseTheme {
        TemplateListScreen(
            state = PhotoboothUiState(
                isLoadingTemplates = false,
                templates = PREVIEW_TEMPLATES,
                selectedSlotCount = 4,
            ),
            onBack = {},
            onSlotCountSelected = {},
            onTemplateSelected = {},
        )
    }
}

@Preview(name = "3. Xem trước Photobooth (Nền tối)", showBackground = true, widthDp = 390, heightDp = 800)
@Composable
private fun PhotoboothDarkPreviewScreenPreview() {
    PauseTheme {
        PhotoboothPreviewScreen(
            state = PhotoboothUiState(
                isLoadingTemplates = false,
                templates = PREVIEW_TEMPLATES,
                selectedTemplate = PREVIEW_TEMPLATES.last(),
                selectedPhotoIds = listOf("p1", "p2", "p3", "p4"),
                caption = "Đà Lạt 2026",
            ),
            onBack = {},
            onEditPhotos = {},
            onSave = {},
        )
    }
}
