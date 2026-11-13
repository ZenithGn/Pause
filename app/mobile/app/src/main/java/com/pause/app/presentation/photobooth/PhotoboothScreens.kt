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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    isUserPremium: Boolean = false,
    onRequireUpgrade: () -> Unit = {},
) {
    val selectedSlot = state.selectedSlotCount
    var lockedTemplate by remember { mutableStateOf<PhotoboothTemplate?>(null) }

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
                        TemplateGrid(
                            templates = slotTemplates,
                            isUserPremium = isUserPremium,
                            onTemplateSelected = { template ->
                                if (template.isPremium && !isUserPremium) {
                                    lockedTemplate = template
                                } else {
                                    onTemplateSelected(template.id)
                                }
                            },
                        )
                    }
                }
            }
        }
    }

    lockedTemplate?.let { tpl ->
        AlertDialog(
            onDismissRequest = { lockedTemplate = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.WorkspacePremium,
                        contentDescription = null,
                        tint = PauseColors.GoldAccent,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Mẫu thiết kế Premium",
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                    )
                }
            },
            text = {
                Text(
                    text = "Mẫu “${tpl.name}” thuộc bộ sưu tập độc quyền dành cho Hội viên Pause Premium. Nâng cấp ngay để mở khóa 100% mẫu in cao cấp, 15 Ngăn kéo Kỷ niệm (1 GB/tủ) và miễn phí vận chuyển!",
                    color = PauseColors.Charcoal,
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        lockedTemplate = null
                        onRequireUpgrade()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = PauseColors.Wine),
                    shape = RoundedCornerShape(8.dp),
                ) {
                    Text("Nâng cấp ngay", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { lockedTemplate = null }) {
                    Text("Để sau", color = PauseColors.Muted)
                }
            },
            containerColor = PauseColors.Surface,
            shape = RoundedCornerShape(16.dp),
        )
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
private fun TemplateGrid(
    templates: List<PhotoboothTemplate>,
    isUserPremium: Boolean,
    onTemplateSelected: (PhotoboothTemplate) -> Unit,
) {
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
                TemplateCard(
                    template = template,
                    isLocked = template.isPremium && !isUserPremium,
                    onClick = { onTemplateSelected(template) },
                )
            }
        }
    }
}

@Composable
private fun TemplateCard(
    template: PhotoboothTemplate,
    isLocked: Boolean = false,
    onClick: () -> Unit,
) {
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
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                        .background(
                            if (isLocked) PauseColors.Ink else PauseColors.GoldAccent,
                            RoundedCornerShape(99.dp),
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (isLocked) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = PauseColors.GoldAccent,
                            modifier = Modifier.size(12.dp),
                        )
                        Spacer(Modifier.width(4.dp))
                    }
                    Text(
                        text = stringResource(R.string.photobooth_premium),
                        style = MaterialTheme.typography.labelLarge,
                        color = PauseColors.Surface,
                    )
                }
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
/**
 * Step 2/3 of the print flow – pick photos for each template slot.
 * Layout follows Figma node 156:7851 ("Custom & Print (Choose photo)"),
 * recoloured with the Pause wine palette.
 */
@Composable
fun SelectPhotosScreen(
    state: PhotoboothUiState,
    onBack: () -> Unit,
    onDrawerSelected: (String) -> Unit,
    onPhotoToggled: (Photo) -> Unit,
    onContinue: () -> Unit,
) {
    val remaining = (state.requiredSlots - state.selectedPhotoIds.size).coerceAtLeast(0)
    val isFull = state.requiredSlots > 0 && remaining == 0
    val photosById = remember(state.photos) { state.photos.associateBy { it.id } }

    Scaffold(
        topBar = { SelectPhotosTopBar(onBack = onBack) },
        bottomBar = {
            SelectPhotosBottomBar(
                remaining = remaining,
                canContinue = state.canPreview,
                onContinue = onContinue,
            )
        },
        containerColor = PauseColors.Paper,
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            state.selectedTemplate?.let { template ->
                MiniStripCard(
                    templateName = template.name,
                    slotCount = state.requiredSlots,
                    selectedPhotoIds = state.selectedPhotoIds,
                    photoUrls = state.photoUrls,
                    onSlotCleared = { photoId -> photosById[photoId]?.let(onPhotoToggled) },
                    modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
                )
            }
            state.error?.let { PauseErrorBanner(it, Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) }

            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (state.drawers.isEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        SelectPhotosMessage(stringResource(R.string.photobooth_drawers_empty))
                    }
                    return@LazyVerticalGrid
                }

                item(span = { GridItemSpan(maxLineSpan) }) { DrawerSectionHeader() }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    val activeFallbackUrl = state.photos.firstOrNull()?.id?.let { state.photoUrls[it] }
                    DrawerSourceCarousel(
                        drawers = state.drawers,
                        selectedDrawerId = state.selectedDrawerId,
                        activeCoverFallbackUrl = activeFallbackUrl,
                        onDrawerSelected = onDrawerSelected,
                    )
                }

                when {
                    state.isLoadingPhotos -> item(span = { GridItemSpan(maxLineSpan) }) {
                        Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = PauseColors.Wine)
                        }
                    }

                    state.photos.isEmpty() -> item(span = { GridItemSpan(maxLineSpan) }) {
                        SelectPhotosMessage(stringResource(R.string.photobooth_photos_empty))
                    }

                    else -> items(state.photos, key = { it.id }) { photo ->
                        val selected = photo.id in state.selectedPhotoIds
                        PhotoPickerTile(
                            url = state.photoUrls[photo.id],
                            selected = selected,
                            dimmed = isFull && !selected,
                            onClick = { onPhotoToggled(photo) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectPhotosTopBar(onBack: () -> Unit) {
    TopAppBar(
        title = {
            Column {
                Text(
                    text = stringResource(R.string.photobooth_progress_label),
                    style = MaterialTheme.typography.labelSmall,
                    letterSpacing = 0.5.sp,
                    color = PauseColors.Muted,
                )
                Text(
                    text = stringResource(R.string.photobooth_select_photos_title),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = PauseColors.Ink,
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back), tint = PauseColors.Ink)
            }
        },
        actions = {
            Box(
                modifier = Modifier
                    .padding(end = 16.dp)
                    .background(PauseColors.WineLight, CircleShape)
                    .padding(horizontal = 12.dp, vertical = 4.dp),
            ) {
                Text(
                    text = stringResource(R.string.photobooth_step, 2, 3),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = PauseColors.Wine,
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = PauseColors.Paper),
    )
}

/** Sticky preview of the template slots – shows which photo lands in which slot. */
@Composable
private fun MiniStripCard(
    templateName: String,
    slotCount: Int,
    selectedPhotoIds: List<String>,
    photoUrls: Map<String, String>,
    onSlotCleared: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = PauseColors.Surface,
        shadowElevation = 1.dp,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.PhotoLibrary,
                    contentDescription = null,
                    tint = PauseColors.Wine,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = templateName,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = PauseColors.Ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier
                        .background(PauseColors.GoldLight, CircleShape)
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = stringResource(R.string.photobooth_slot_count, slotCount),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.GoldAccent,
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PauseColors.Paper, RoundedCornerShape(48.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            ) {
                repeat(slotCount) { index ->
                    val photoId = selectedPhotoIds.getOrNull(index)
                    MiniStripSlot(
                        index = index,
                        url = photoId?.let { photoUrls[it] },
                        filled = photoId != null,
                        onClick = { photoId?.let(onSlotCleared) },
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .widthIn(max = 70.dp)
                            .aspectRatio(3f / 4f),
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.photobooth_slots_assigned, selectedPhotoIds.size, slotCount),
                    style = MaterialTheme.typography.bodySmall,
                    color = PauseColors.Muted,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(slotCount) { index ->
                        Box(
                            Modifier
                                .size(8.dp)
                                .background(
                                    if (index < selectedPhotoIds.size) PauseColors.Wine else PauseColors.Line,
                                    CircleShape,
                                ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MiniStripSlot(
    index: Int,
    url: String?,
    filled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(32.dp)
    Box(
        modifier = modifier
            .clip(shape)
            .background(if (filled) PauseColors.WineLight else PauseColors.Surface)
            .clickable(enabled = filled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (filled) {
            url?.let { AsyncImage(it, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
            Box(
                Modifier
                    .align(Alignment.TopStart)
                    .padding(start = 8.dp, top = 8.dp)
                    .size(16.dp)
                    .background(PauseColors.Wine, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = (index + 1).toString(),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = PauseColors.Surface,
                )
            }
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = null,
                    tint = PauseColors.Muted,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = stringResource(R.string.photobooth_slot_label, index + 1),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Medium,
                    color = PauseColors.Muted,
                )
            }
        }
    }
}

@Composable
private fun DrawerSectionHeader() {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.FolderOpen,
            contentDescription = null,
            tint = PauseColors.Wine,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = stringResource(R.string.photobooth_drawers_section),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = PauseColors.Ink,
        )
    }
}

/** Horizontal album carousel that bleeds past the grid's 20dp side padding. */
@Composable
private fun DrawerSourceCarousel(
    drawers: List<Drawer>,
    selectedDrawerId: String?,
    activeCoverFallbackUrl: String?,
    onDrawerSelected: (String) -> Unit,
) {
    val bleed = 20.dp
    LazyRow(
        modifier = Modifier.layout { measurable, constraints ->
            val extra = bleed.roundToPx() * 2
            val placeable = measurable.measure(
                constraints.copy(
                    minWidth = constraints.maxWidth + extra,
                    maxWidth = constraints.maxWidth + extra,
                ),
            )
            layout(constraints.maxWidth, placeable.height) { placeable.place(-extra / 2, 0) }
        },
        contentPadding = PaddingValues(horizontal = bleed, vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(drawers, key = { it.id }) { drawer ->
            val isSelected = drawer.id == selectedDrawerId
            DrawerSourceCard(
                drawer = drawer,
                selected = isSelected,
                fallbackCoverUrl = if (isSelected) activeCoverFallbackUrl else null,
                onClick = { onDrawerSelected(drawer.id) },
            )
        }
    }
}

@Composable
private fun DrawerSourceCard(
    drawer: Drawer,
    selected: Boolean,
    fallbackCoverUrl: String?,
    onClick: () -> Unit,
) {
    val coverUrl = drawer.coverPhotoPath?.takeIf { it.isNotBlank() } ?: fallbackCoverUrl
    Surface(
        modifier = Modifier
            .width(176.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = if (selected) PauseColors.Surface else PauseColors.CategoryBg,
        border = if (selected) BorderStroke(1.dp, PauseColors.Wine) else null,
        shadowElevation = if (selected) 1.dp else 0.dp,
    ) {
        Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(48.dp))
                    .background(if (selected) PauseColors.WineLight else PauseColors.Line),
                contentAlignment = Alignment.Center,
            ) {
                if (!coverUrl.isNullOrBlank()) {
                    AsyncImage(coverUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Icon(
                        imageVector = Icons.Filled.PhotoLibrary,
                        contentDescription = null,
                        tint = if (selected) PauseColors.Wine else PauseColors.Muted,
                        modifier = Modifier.size(28.dp),
                    )
                }
                if (selected) {
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 8.dp)
                            .background(PauseColors.Wine, CircleShape)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.Check, null, tint = PauseColors.Surface, modifier = Modifier.size(10.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = stringResource(R.string.photobooth_drawer_selected),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = PauseColors.Surface,
                        )
                    }
                }
            }
            Text(
                text = drawer.name,
                modifier = Modifier.padding(horizontal = 4.dp),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = PauseColors.Ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = stringResource(R.string.photobooth_drawer_photo_count, drawer.photoCount),
                modifier = Modifier.padding(horizontal = 4.dp),
                fontSize = 10.sp,
                color = PauseColors.Muted,
            )
        }
    }
}

@Composable
private fun PhotoPickerTile(url: String?, selected: Boolean, dimmed: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(24.dp)
    Box(
        modifier = Modifier
            .aspectRatio(1f)
            .alpha(if (dimmed) 0.4f else 1f)
            .clip(shape)
            .background(PauseColors.CategoryBg)
            .then(if (selected) Modifier.border(2.dp, PauseColors.Wine, shape) else Modifier)
            .clickable(onClick = onClick),
    ) {
        url?.let { AsyncImage(it, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
            ?: Icon(Icons.Filled.Image, null, tint = PauseColors.Muted, modifier = Modifier.align(Alignment.Center))
        if (selected) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .size(22.dp)
                    .background(PauseColors.Wine, CircleShape)
                    .border(1.5.dp, PauseColors.Surface, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Check, null, tint = PauseColors.Surface, modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
private fun SelectPhotosMessage(message: String) {
    Box(Modifier.fillMaxWidth().padding(vertical = 40.dp, horizontal = 12.dp), contentAlignment = Alignment.Center) {
        Text(message, color = PauseColors.Muted, textAlign = TextAlign.Center)
    }
}

@Composable
private fun SelectPhotosBottomBar(remaining: Int, canContinue: Boolean, onContinue: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(PauseColors.Paper)
            .navigationBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = if (remaining > 0) {
                stringResource(R.string.photobooth_missing_photos, remaining)
            } else {
                stringResource(R.string.photobooth_strip_ready)
            },
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            color = if (remaining > 0) PauseColors.Muted else PauseColors.Wine,
        )
        Button(
            onClick = onContinue,
            enabled = canContinue,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = CircleShape,
            colors = ButtonDefaults.buttonColors(
                containerColor = PauseColors.Wine,
                contentColor = PauseColors.Surface,
                disabledContainerColor = PauseColors.Wine.copy(alpha = 0.35f),
                disabledContentColor = PauseColors.Surface,
            ),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, disabledElevation = 0.dp),
        ) {
            Text(
                text = stringResource(R.string.photobooth_preview_continue),
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.width(8.dp))
            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp))
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
        navigationIcon = { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back), Modifier.padding(start = 12.dp).clickable(onClick = onBack)) },
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

@Preview(name = "4. Chọn ảnh cho khung 4 ảnh", showBackground = true, widthDp = 390, heightDp = 860)
@Composable
private fun SelectPhotosScreenPreview() {
    PauseTheme {
        val photos = (1..7).map { index ->
            Photo(
                id = "p$index",
                drawerId = "d1",
                uploadedBy = "u1",
                originalPath = "",
                sizeBytes = 0,
            )
        }
        SelectPhotosScreen(
            state = PhotoboothUiState(
                isLoadingTemplates = false,
                templates = PREVIEW_TEMPLATES,
                selectedTemplate = PREVIEW_TEMPLATES[3],
                drawers = listOf(
                    Drawer(id = "d1", ownerId = "u1", ownerName = "Pause", name = "Kỷ niệm Đà Lạt 2024", photoCount = 7),
                    Drawer(id = "d2", ownerId = "u1", ownerName = "Pause", name = "Ảnh Kỷ Niệm Gia Đình", photoCount = 12),
                ),
                selectedDrawerId = "d1",
                photos = photos,
                selectedPhotoIds = listOf("p1", "p2"),
            ),
            onBack = {},
            onDrawerSelected = {},
            onPhotoToggled = {},
            onContinue = {},
        )
    }
}
