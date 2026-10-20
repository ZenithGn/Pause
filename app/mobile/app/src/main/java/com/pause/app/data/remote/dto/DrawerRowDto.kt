package com.pause.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** `public.drawers` row (table columns only; UI view comes from the RPCs). */
@Serializable
data class DrawerRowDto(
    val id: String,
    @SerialName("owner_id") val ownerId: String,
    val name: String,
    val description: String? = null,
    @SerialName("cover_photo_url") val coverPhotoUrl: String? = null,
    @SerialName("storage_used_bytes") val storageUsedBytes: Long = 0,
    @SerialName("storage_limit_bytes") val storageLimitBytes: Long = 268_435_456,
    @SerialName("is_purchased") val isPurchased: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** Insert payload for `public.drawers`. */
@Serializable
data class DrawerInsertDto(
    @SerialName("owner_id") val ownerId: String,
    val name: String,
    val description: String? = null,
)

/** Patch payload when the cover stays untouched (description null clears it). */
@Serializable
data class DrawerUpdateDto(
    val name: String,
    val description: String? = null,
)

/** Patch payload including a new cover photo path. */
@Serializable
data class DrawerUpdateWithCoverDto(
    val name: String,
    val description: String? = null,
    @SerialName("cover_photo_url") val coverPhotoUrl: String,
)

/** Cover-only patch (server grants cover_photo_url). */
@Serializable
data class DrawerCoverDto(
    @SerialName("cover_photo_url") val coverPhotoUrl: String? = null,
)

/** Minimal projection for counting rows. */
@Serializable
data class IdDto(val id: String)
