package com.pause.app.data.local

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareStatus

fun Drawer.toEntity(userId: String): DrawerEntity = DrawerEntity(
    userId = userId,
    id = id,
    ownerId = ownerId,
    ownerName = ownerName,
    name = name,
    description = description,
    coverPhotoPath = coverPhotoPath,
    storageUsedBytes = storageUsedBytes,
    storageLimitBytes = storageLimitBytes,
    photoCount = photoCount,
    isPurchased = isPurchased,
    isOwner = isOwner,
    permission = permission.wire,
    updatedAtMillis = updatedAt?.toEpochMilli() ?: 0L,
)

fun DrawerEntity.toDomain(): Drawer = Drawer(
    id = id,
    ownerId = ownerId,
    ownerName = ownerName,
    name = name,
    description = description,
    coverPhotoPath = coverPhotoPath,
    storageUsedBytes = storageUsedBytes,
    storageLimitBytes = storageLimitBytes,
    photoCount = photoCount,
    isPurchased = isPurchased,
    isOwner = isOwner,
    permission = SharePermission.fromWire(permission) ?: SharePermission.VIEW,
    updatedAt = if (updatedAtMillis > 0) java.time.Instant.ofEpochMilli(updatedAtMillis) else null,
)

fun Photo.toEntity(userId: String): PhotoEntity = PhotoEntity(
    userId = userId,
    id = id,
    drawerId = drawerId,
    uploadedBy = uploadedBy,
    originalPath = originalPath,
    thumbnailPath = thumbnailPath,
    sizeBytes = sizeBytes,
    mimeType = mimeType,
    width = width,
    height = height,
    uploadedAtMillis = uploadedAt?.toEpochMilli() ?: 0L,
)

fun PhotoEntity.toDomain(): Photo = Photo(
    id = id,
    drawerId = drawerId,
    uploadedBy = uploadedBy,
    originalPath = originalPath,
    thumbnailPath = thumbnailPath,
    sizeBytes = sizeBytes,
    mimeType = mimeType,
    width = width,
    height = height,
    uploadedAt = if (uploadedAtMillis > 0) java.time.Instant.ofEpochMilli(uploadedAtMillis) else null,
)

fun DrawerShare.toEntity(userId: String, drawerId: String): ShareEntity = ShareEntity(
    userId = userId,
    id = id,
    drawerId = drawerId,
    sharedWithId = sharedWithId,
    email = email,
    displayName = displayName,
    permission = permission.wire,
    status = status.wire,
    createdAtMillis = createdAt?.toEpochMilli() ?: 0L,
)

fun ShareEntity.toDomain(): DrawerShare = DrawerShare(
    id = id,
    sharedWithId = sharedWithId,
    email = email,
    displayName = displayName,
    permission = SharePermission.fromWire(permission) ?: SharePermission.VIEW,
    status = ShareStatus.fromWire(status),
    createdAt = if (createdAtMillis > 0) java.time.Instant.ofEpochMilli(createdAtMillis) else null,
)
