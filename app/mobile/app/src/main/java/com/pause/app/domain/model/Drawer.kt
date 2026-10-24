package com.pause.app.domain.model

import java.time.Instant

/** Permission level of a drawer share (FR-02.7). */
enum class SharePermission(val wire: String) {
    VIEW("view"),
    EDIT("edit"),

    /**
     * Returned by RPCs (`list_drawers`, `get_drawer`) when the authenticated
     * user is the drawer owner. Treated as full write access.
     */
    OWNER("owner"),
    ;

    val canWrite: Boolean get() = this == EDIT || this == OWNER

    companion object {
        fun fromWire(value: String?): SharePermission? =
            entries.firstOrNull { it.wire == value }
    }
}

/** Invitation lifecycle of a drawer share (T-02.22). */
enum class ShareStatus(val wire: String) {
    PENDING("pending"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    ;

    companion object {
        fun fromWire(value: String?): ShareStatus =
            entries.firstOrNull { it.wire == value } ?: PENDING
    }
}

/**
 * A Memory Drawer (FR-02.1). [isOwner] + [permission] describe the caller's access.
 */
data class Drawer(
    val id: String,
    val ownerId: String,
    val ownerName: String,
    val name: String,
    val description: String? = null,
    val coverPhotoPath: String? = null,
    val storageUsedBytes: Long = 0,
    val storageLimitBytes: Long = DEFAULT_LIMIT_BYTES,
    val photoCount: Int = 0,
    val isPurchased: Boolean = false,
    val isOwner: Boolean = true,
    val permission: SharePermission = SharePermission.EDIT,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null,
) {
    val canWrite: Boolean get() = isOwner || permission.canWrite

    val storageUsedFraction: Float
        get() = if (storageLimitBytes <= 0) 0f
        else (storageUsedBytes.toFloat() / storageLimitBytes.toFloat()).coerceIn(0f, 1f)

    val remainingBytes: Long get() = (storageLimitBytes - storageUsedBytes).coerceAtLeast(0)

    val isFull: Boolean get() = remainingBytes <= 0

    companion object {
        /** 256 MB free-tier quota (docs/03-References/storage-strategy.md). */
        const val DEFAULT_LIMIT_BYTES = 268_435_456L
    }
}

/** A memory photo inside a drawer (FR-02.6). Paths are private Storage object keys. */
data class Photo(
    val id: String,
    val drawerId: String,
    val uploadedBy: String,
    val originalPath: String,
    val thumbnailPath: String? = null,
    val sizeBytes: Long,
    val mimeType: String = "image/jpeg",
    val width: Int? = null,
    val height: Int? = null,
    val takenAt: Instant? = null,
    val uploadedAt: Instant? = null,
)

/** A share of a drawer with another Pause user (FR-02.7). */
data class DrawerShare(
    val id: String,
    val sharedWithId: String,
    val email: String,
    val displayName: String,
    val permission: SharePermission,
    val status: ShareStatus = ShareStatus.PENDING,
    val createdAt: Instant? = null,
)

/** A pending invitation the signed-in user received (T-02.23). */
data class ShareInvitation(
    val id: String,
    val drawerId: String,
    val drawerName: String,
    val ownerName: String,
    val permission: SharePermission,
    val status: ShareStatus = ShareStatus.PENDING,
    val createdAt: Instant? = null,
)

/** Result of [com.pause.app.domain.repository.ShareRepository.findRecipient]. */
data class ShareRecipient(
    val id: String,
    val email: String,
    val displayName: String,
)
