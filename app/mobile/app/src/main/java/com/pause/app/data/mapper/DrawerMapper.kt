package com.pause.app.data.mapper

import com.pause.app.data.remote.dto.DrawerDto
import com.pause.app.data.remote.dto.DrawerShareDto
import com.pause.app.data.remote.dto.PhotoDto
import com.pause.app.data.remote.dto.ShareInvitationDto
import com.pause.app.data.remote.dto.ShareRecipientDto
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareRecipient
import com.pause.app.domain.model.ShareStatus
import java.time.Instant

fun DrawerDto.toDomain(): Drawer = Drawer(
    id = id,
    ownerId = ownerId,
    ownerName = ownerName,
    name = name,
    description = description,
    coverPhotoPath = coverPhotoUrl,
    storageUsedBytes = storageUsedBytes,
    storageLimitBytes = storageLimitBytes,
    photoCount = photoCount,
    isPurchased = isPurchased,
    isOwner = isOwner,
    permission = SharePermission.fromWire(permission) ?: SharePermission.VIEW,
    createdAt = createdAt?.let(::parseInstant),
    updatedAt = updatedAt?.let(::parseInstant),
)

fun PhotoDto.toDomain(): Photo = Photo(
    id = id,
    drawerId = drawerId,
    uploadedBy = uploadedBy,
    originalPath = originalUrl,
    thumbnailPath = thumbnailUrl,
    sizeBytes = fileSizeBytes,
    mimeType = mimeType,
    width = width,
    height = height,
    takenAt = takenAt?.let(::parseInstant),
    uploadedAt = uploadedAt?.let(::parseInstant),
)

fun DrawerShareDto.toDomain(): DrawerShare = DrawerShare(
    id = id,
    sharedWithId = sharedWithId,
    email = email,
    displayName = displayName,
    permission = SharePermission.fromWire(permission) ?: SharePermission.VIEW,
    status = ShareStatus.fromWire(status),
    createdAt = createdAt?.let(::parseInstant),
)

fun ShareInvitationDto.toDomain(): ShareInvitation = ShareInvitation(
    id = id,
    drawerId = drawerId,
    drawerName = drawerName,
    ownerName = ownerName,
    permission = SharePermission.fromWire(permission) ?: SharePermission.VIEW,
    status = ShareStatus.fromWire(status),
    createdAt = createdAt?.let(::parseInstant),
)

fun ShareRecipientDto.toDomain(): ShareRecipient = ShareRecipient(
    id = id,
    email = email,
    displayName = displayName,
)

private fun parseInstant(value: String): Instant? =
    runCatching { Instant.parse(value) }.getOrNull()
