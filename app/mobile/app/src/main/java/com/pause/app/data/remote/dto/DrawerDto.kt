package com.pause.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Row returned by the `list_drawers()` / `get_drawer()` RPCs. */
@Serializable
data class DrawerDto(
    val id: String,
    @SerialName("owner_id") val ownerId: String,
    @SerialName("owner_name") val ownerName: String,
    val name: String,
    val description: String? = null,
    @SerialName("cover_photo_url") val coverPhotoUrl: String? = null,
    @SerialName("storage_used_bytes") val storageUsedBytes: Long = 0,
    @SerialName("storage_limit_bytes") val storageLimitBytes: Long = 268_435_456,
    @SerialName("is_purchased") val isPurchased: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("photo_count") val photoCount: Int = 0,
    @SerialName("is_owner") val isOwner: Boolean = true,
    val permission: String? = null,
)

/** Row of `public.photos`. */
@Serializable
data class PhotoDto(
    val id: String,
    @SerialName("drawer_id") val drawerId: String,
    @SerialName("uploaded_by") val uploadedBy: String,
    @SerialName("original_url") val originalUrl: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("file_size_bytes") val fileSizeBytes: Long,
    @SerialName("mime_type") val mimeType: String = "image/jpeg",
    val width: Int? = null,
    val height: Int? = null,
    @SerialName("taken_at") val takenAt: String? = null,
    @SerialName("uploaded_at") val uploadedAt: String? = null,
)

/** Insert payload for `public.photos`. */
@Serializable
data class PhotoInsertDto(
    @SerialName("drawer_id") val drawerId: String,
    @SerialName("uploaded_by") val uploadedBy: String,
    @SerialName("original_url") val originalUrl: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("file_size_bytes") val fileSizeBytes: Long,
    @SerialName("mime_type") val mimeType: String,
    val width: Int? = null,
    val height: Int? = null,
    @SerialName("taken_at") val takenAt: String? = null,
)

/** Row returned by `list_drawer_shares()`. */
@Serializable
data class DrawerShareDto(
    val id: String,
    @SerialName("shared_with_id") val sharedWithId: String,
    val email: String,
    @SerialName("display_name") val displayName: String,
    val permission: String,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

/** Row returned by `list_share_invitations()`. */
@Serializable
data class ShareInvitationDto(
    val id: String,
    @SerialName("drawer_id") val drawerId: String,
    @SerialName("drawer_name") val drawerName: String,
    @SerialName("owner_name") val ownerName: String,
    val permission: String,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

/** Row returned by `find_share_recipient()`. */
@Serializable
data class ShareRecipientDto(
    val id: String,
    val email: String,
    @SerialName("display_name") val displayName: String,
)
