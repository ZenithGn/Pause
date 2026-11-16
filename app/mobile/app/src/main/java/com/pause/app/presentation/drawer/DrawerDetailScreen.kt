package com.pause.app.presentation.drawer

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.RawPhoto
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.common.components.PausePasswordField
import com.pause.app.presentation.common.components.PausePrimaryButton
import com.pause.app.presentation.common.components.PauseTextField
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.common.components.StorageIndicator
import com.pause.app.presentation.photo.PhotoViewerScreen
import com.pause.app.presentation.theme.PauseColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** FR-02.3 → FR-02.6 – drawer detail: grid, upload, multi-select, viewer, edit, delete. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun DrawerDetailScreen(
    state: DrawerDetailUiState,
    onBack: () -> Unit,
    onShare: () -> Unit,
    onStartPhotobooth: () -> Unit,
    onPhotosPicked: (List<RawPhoto>) -> Unit,
    onToggleSelection: (String) -> Unit,
    onExitSelection: () -> Unit,
    onDeleteSelected: () -> Unit,
    onUpdateDrawer: (String, String?) -> Unit,
    onDeleteDrawer: () -> Unit,
    onLoadMore: () -> Unit,
    onConsumeToast: () -> Unit,
    onDeleted: () -> Unit,
    onSetAsCover: (Photo) -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val gridState = rememberLazyGridState()

    var viewerIndex by remember { mutableIntStateOf(-1) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showDeleteDrawerDialog by remember { mutableStateOf(false) }
    var showDeletePhotosDialog by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    var toast by remember { mutableStateOf<UiText?>(null) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(20),
    ) { uris ->
        if (uris.isNotEmpty()) {
            scope.launch {
                val raw = withContext(Dispatchers.IO) { uris.mapNotNull { readRawPhoto(context, it) } }
                onPhotosPicked(raw)
            }
        }
    }

    LaunchedEffect(state.toast) {
        state.toast?.let {
            toast = it
            onConsumeToast()
        }
    }
    LaunchedEffect(toast) {
        if (toast != null) {
            delay(2_500)
            toast = null
        }
    }
    LaunchedEffect(state.deleted) {
        if (state.deleted) onDeleted()
    }
    LaunchedEffect(gridState, state.canLoadMore, state.photos.size) {
        val lastVisible = gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
        if (state.canLoadMore && lastVisible >= state.photos.lastIndex - 2) {
            onLoadMore()
        }
    }

    Scaffold(
        containerColor = PauseColors.Paper,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = state.drawer?.name.orEmpty(),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back),
                            tint = PauseColors.Ink,
                        )
                    }
                },
                actions = {
                    if (state.drawer?.isOwner == true) {
                        IconButton(onClick = onShare) {
                            Icon(
                                imageVector = Icons.Filled.Share,
                                contentDescription = stringResource(R.string.drawer_share_action),
                                tint = PauseColors.Ink,
                            )
                        }
                    }
                    if (state.canWrite) {
                        Box {
                            IconButton(onClick = { menuOpen = true }) {
                                Icon(
                                    imageVector = Icons.Filled.MoreVert,
                                    contentDescription = stringResource(R.string.drawer_menu_more),
                                    tint = PauseColors.Ink,
                                )
                            }
                            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.drawer_create_photobooth)) },
                                    onClick = {
                                        menuOpen = false
                                        onStartPhotobooth()
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.drawer_edit_action)) },
                                    onClick = {
                                        menuOpen = false
                                        showEditDialog = true
                                    },
                                )
                                if (state.drawer?.isOwner == true) {
                                    DropdownMenuItem(
                                        text = { Text(stringResource(R.string.drawer_delete_confirm)) },
                                        onClick = {
                                            menuOpen = false
                                            showDeleteDrawerDialog = true
                                        },
                                    )
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PauseColors.Paper),
            )
        },
        floatingActionButton = {
            if (state.canWrite) {
                ExtendedFloatingActionButton(
                    onClick = {
                        picker.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                    containerColor = PauseColors.Wine,
                    contentColor = Color.White,
                    icon = { Icon(Icons.Filled.AddPhotoAlternate, contentDescription = null) },
                    text = { Text(text = stringResource(R.string.drawer_add_photos)) },
                )
            }
        },
        bottomBar = {
            if (state.isSelectionMode) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(PauseColors.Surface)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(R.string.drawer_selected_count, state.selectionCount),
                        style = MaterialTheme.typography.bodyLarge,
                        color = PauseColors.Ink,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (state.selectionCount == 1 && state.canWrite) {
                            val selectedId = state.selectedPhotoIds.firstOrNull()
                            val selectedPhoto = state.photos.firstOrNull { it.id == selectedId }
                            if (selectedPhoto != null) {
                                TextButton(
                                    onClick = {
                                        onSetAsCover(selectedPhoto)
                                        onExitSelection()
                                    }
                                ) {
                                    Text(
                                        text = stringResource(R.string.drawer_set_cover),
                                        color = PauseColors.Wine,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                        TextButton(onClick = onExitSelection) {
                            Text(text = stringResource(R.string.cancel))
                        }
                        TextButton(
                            onClick = { showDeletePhotosDialog = true },
                            enabled = state.selectionCount > 0 && !state.isDeletingPhotos,
                        ) {
                            Text(
                                text = stringResource(R.string.drawer_delete_selected),
                                color = PauseColors.Error,
                            )
                        }
                    }
                }
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            if (state.isUploading) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    Text(
                        text = stringResource(
                            R.string.drawer_uploading,
                            state.uploadCompleted,
                            state.uploadTotal,
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = {
                            if (state.uploadTotal == 0) 0f
                            else state.uploadCompleted.toFloat() / state.uploadTotal.toFloat()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp),
                        color = PauseColors.Ink,
                        trackColor = PauseColors.Line,
                        )
                }
            }

            state.error?.let { error ->
                PauseErrorBanner(
                    message = error,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                )
            }

            state.drawer?.let { drawer ->
                val coverUrl = drawer.coverPhotoPath?.takeIf { it.isNotBlank() }
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = PauseColors.Surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Line),
                    shadowElevation = 2.dp,
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        // ── Editorial Cover Banner Header ──
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .background(PauseColors.CategoryBg),
                        ) {
                            if (coverUrl != null) {
                                AsyncImage(
                                    model = coverUrl,
                                    contentDescription = drawer.name,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                                // Gradient Scrim for contrast
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(
                                                    Color.Transparent,
                                                    Color.Black.copy(alpha = 0.45f),
                                                    Color.Black.copy(alpha = 0.85f),
                                                )
                                            )
                                        )
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(
                                                    PauseColors.WineLight,
                                                    PauseColors.CategoryBg,
                                                )
                                            )
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        painter = painterResource(R.drawable.pause_mark),
                                        contentDescription = null,
                                        tint = PauseColors.Wine.copy(alpha = 0.4f),
                                        modifier = Modifier.size(64.dp),
                                    )
                                }
                            }

                            // Role Pill Top Right
                            Surface(
                                color = if (coverUrl != null) Color.Black.copy(alpha = 0.6f) else PauseColors.WineLight,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(12.dp),
                            ) {
                                Text(
                                    text = if (drawer.isOwner) {
                                        stringResource(R.string.drawers_role_owner)
                                    } else if (drawer.canWrite) {
                                        stringResource(R.string.drawers_role_edit)
                                    } else {
                                        stringResource(R.string.drawers_role_view)
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (coverUrl != null) Color.White else PauseColors.Wine,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                )
                            }

                            // Title & photo count overlayed bottom of banner
                            Column(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(16.dp),
                            ) {
                                Text(
                                    text = drawer.name,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (coverUrl != null) Color.White else PauseColors.Ink,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = listOfNotNull(
                                        stringResource(R.string.drawer_detail_photos_count_format, drawer.photoCount),
                                        if (!drawer.isOwner) stringResource(R.string.drawer_detail_owner_format, drawer.ownerName) else null,
                                    ).joinToString(" • "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (coverUrl != null) Color.White.copy(alpha = 0.85f) else PauseColors.Muted,
                                )
                            }
                        }

                        // ── Sub-info & Actions Section ──
                        Column(modifier = Modifier.padding(16.dp)) {
                            if (!drawer.description.isNullOrBlank()) {
                                Text(
                                    text = drawer.description,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PauseColors.Muted,
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                            }

                            StorageIndicator(
                                photoCount = drawer.photoCount,
                                maxPhotos = 50,
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // Action buttons: Thêm ảnh & In Photobooth
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                if (state.canWrite) {
                                    Button(
                                        onClick = {
                                            picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = PauseColors.Ink,
                                            contentColor = Color.White,
                                        ),
                                        shape = RoundedCornerShape(999.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(48.dp),
                                        contentPadding = PaddingValues(horizontal = 14.dp),
                                    ) {
                                        Icon(Icons.Filled.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Thêm ảnh",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                        )
                                    }
                                }

                                Button(
                                    onClick = onStartPhotobooth,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = PauseColors.Wine,
                                        contentColor = Color.White,
                                    ),
                                    shape = RoundedCornerShape(999.dp),
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(48.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp),
                                ) {
                                    Icon(painterResource(R.drawable.pause_mark_white), contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "In Photobooth",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            when {
                state.isLoading -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = PauseColors.Ink)
                }

                state.photos.isEmpty() -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 24.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    androidx.compose.material3.Surface(
                        modifier = Modifier.size(72.dp),
                        shape = RoundedCornerShape(22.dp),
                        color = PauseColors.WineLight,
                        border = androidx.compose.foundation.BorderStroke(1.dp, PauseColors.Wine.copy(alpha = 0.2f)),
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.AddPhotoAlternate,
                                contentDescription = null,
                                tint = PauseColors.Wine,
                                modifier = Modifier.size(32.dp),
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                    Text(
                        text = stringResource(R.string.drawer_detail_empty_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Ink,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.drawer_detail_empty_message),
                        style = MaterialTheme.typography.bodyMedium,
                        color = PauseColors.Muted,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                    if (state.canWrite) {
                        Spacer(modifier = Modifier.height(24.dp))
                        androidx.compose.material3.Button(
                            onClick = {
                                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                            shape = RoundedCornerShape(999.dp),
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = PauseColors.Wine,
                                contentColor = androidx.compose.ui.graphics.Color.White,
                            ),
                            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Filled.AddPhotoAlternate,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = stringResource(R.string.drawer_add_photos),
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }

                else -> LazyVerticalGrid(
                    state = gridState,
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    itemsIndexed(state.photos, key = { _, photo -> photo.id }) { index, photo ->
                        val selected = photo.id in state.selectedPhotoIds
                        val isCover = state.drawer?.coverPhotoPath != null &&
                            (photo.thumbnailPath == state.drawer.coverPhotoPath || photo.originalPath == state.drawer.coverPhotoPath)

                        Box(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(PauseColors.Surface)
                                .then(
                                    if (selected) {
                                        Modifier.border(2.5.dp, PauseColors.Wine, RoundedCornerShape(12.dp))
                                    } else {
                                        Modifier.border(0.5.dp, PauseColors.Line, RoundedCornerShape(12.dp))
                                    }
                                )
                                .combinedClickable(
                                    onClick = {
                                        if (state.isSelectionMode) {
                                            onToggleSelection(photo.id)
                                        } else {
                                            viewerIndex = index
                                        }
                                    },
                                    onLongClick = { onToggleSelection(photo.id) },
                                ),
                        ) {
                            val url = state.thumbnailUrls[photo.id]
                            if (url != null) {
                                AsyncImage(
                                    model = url,
                                    contentDescription = stringResource(R.string.drawer_photo_open),
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(PauseColors.Paper),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = stringResource(R.string.photo_url_missing),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = PauseColors.Muted,
                                    )
                                }
                            }

                            // Dark tint overlay when selected
                            if (selected) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(PauseColors.Wine.copy(alpha = 0.3f))
                                )
                            }

                            // Star Badge for Cover Photo
                            if (isCover) {
                                Surface(
                                    modifier = Modifier
                                        .align(Alignment.TopStart)
                                        .padding(6.dp),
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color.Black.copy(alpha = 0.7f),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Star,
                                            contentDescription = null,
                                            tint = PauseColors.GoldAccent,
                                            modifier = Modifier.size(12.dp),
                                        )
                                        Text(
                                            text = stringResource(R.string.drawer_cover_badge),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 9.sp,
                                        )
                                    }
                                }
                            }

                            // Selection Indicator
                            if (state.isSelectionMode) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(6.dp)
                                        .size(24.dp)
                                        .background(
                                            if (selected) PauseColors.Wine else Color.Black.copy(alpha = 0.4f),
                                            CircleShape,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (selected) {
                                        Icon(
                                            imageVector = Icons.Filled.CheckCircle,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(3) }) {
                        Spacer(modifier = Modifier.height(96.dp))
                    }
                }
            }
        }

        toast?.let { PauseToast(message = it.asString()) }
    }

    if (viewerIndex >= 0 && state.photos.isNotEmpty()) {
        val urls = state.photos.map { photo ->
            state.originalUrls[photo.id] ?: state.thumbnailUrls[photo.id].orEmpty()
        }
        val currentCoverIndex = state.photos.indexOfFirst {
            val cover = state.drawer?.coverPhotoPath
            cover != null && (it.thumbnailPath == cover || it.originalPath == cover)
        }.takeIf { it >= 0 }
        val dateFormatter = remember {
            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                .withZone(java.time.ZoneId.systemDefault())
        }
        val photoDates = state.photos.map { photo ->
            photo.uploadedAt?.let { dateFormatter.format(it) }
        }
        PhotoViewerScreen(
            photoUrls = urls.filter { it.isNotBlank() },
            initialIndex = viewerIndex,
            onClose = { viewerIndex = -1 },
            canSetCover = state.canWrite,
            currentCoverIndex = currentCoverIndex,
            onSetCover = { index ->
                state.photos.getOrNull(index)?.let(onSetAsCover)
            },
            onStartPhotobooth = {
                viewerIndex = -1
                onStartPhotobooth()
            },
            photoDates = photoDates,
        )
    }

    if (showEditDialog) {
        EditDrawerDialog(
            initialName = state.drawer?.name.orEmpty(),
            initialDescription = state.drawer?.description.orEmpty(),
            onDismiss = { showEditDialog = false },
            onSave = { name, description ->
                showEditDialog = false
                onUpdateDrawer(name, description)
            },
        )
    }

    if (showDeleteDrawerDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDrawerDialog = false },
            title = { Text(text = stringResource(R.string.drawer_delete_title)) },
            text = { Text(text = stringResource(R.string.drawer_delete_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDrawerDialog = false
                        onDeleteDrawer()
                    },
                ) {
                    Text(
                        text = stringResource(R.string.drawer_delete_confirm),
                        color = PauseColors.Error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDrawerDialog = false }) {
                    Text(text = stringResource(R.string.cancel))
                }
            },
        )
    }

    if (showDeletePhotosDialog) {
        AlertDialog(
            onDismissRequest = { showDeletePhotosDialog = false },
            title = { Text(text = stringResource(R.string.drawer_delete_photos_confirm_title)) },
            text = { Text(text = stringResource(R.string.drawer_delete_photos_confirm_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeletePhotosDialog = false
                        onDeleteSelected()
                    },
                ) {
                    Text(
                        text = stringResource(R.string.drawer_delete_selected),
                        color = PauseColors.Error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeletePhotosDialog = false }) {
                    Text(text = stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Composable
private fun EditDrawerDialog(
    initialName: String,
    initialDescription: String,
    onDismiss: () -> Unit,
    onSave: (String, String?) -> Unit,
) {
    var name by remember { mutableStateOf(initialName) }
    var description by remember { mutableStateOf(initialDescription) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.drawer_edit_title)) },
        text = {
            Column {
                PauseTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = stringResource(R.string.drawer_name_label),
                    placeholder = stringResource(R.string.drawer_name_placeholder),
                )
                Spacer(modifier = Modifier.height(8.dp))
                PauseTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = stringResource(R.string.drawer_description_label),
                    singleLine = false,
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(name.trim(), description.trim().ifBlank { null }) }) {
                Text(text = stringResource(R.string.drawer_save_submit))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.cancel))
            }
        },
    )
}

private fun readRawPhoto(context: Context, uri: Uri): RawPhoto? = runCatching {
    val resolver = context.contentResolver
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    val mimeType = resolver.getType(uri) ?: "image/jpeg"
    RawPhoto(bytes = bytes, mimeType = mimeType)
}.getOrNull()
