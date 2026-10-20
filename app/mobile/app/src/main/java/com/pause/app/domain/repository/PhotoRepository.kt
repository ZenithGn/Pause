package com.pause.app.domain.repository

import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareRecipient
import java.time.Instant

/** Raw pick from the gallery / camera, before compression. */
data class RawPhoto(
    val bytes: ByteArray,
    val mimeType: String,
    val takenAt: Instant? = null,
) {
    // ByteArray needs manual equals/hashCode for tests comparing payloads.
    override fun equals(other: Any?): Boolean =
        other is RawPhoto && bytes.contentEquals(other.bytes) && mimeType == other.mimeType

    override fun hashCode(): Int = 31 * bytes.contentHashCode() + mimeType.hashCode()
}

/** Compressed upload payload produced by [PhotoProcessor]. */
data class ProcessedPhoto(
    val original: ByteArray,
    val thumbnail: ByteArray,
    val mimeType: String,
    val width: Int,
    val height: Int,
    val takenAt: Instant? = null,
)

/** Signed URLs for one photo (private buckets, short TTL). */
data class PhotoUrls(
    val photoId: String,
    val thumbnailUrl: String?,
    val originalUrl: String?,
)

/** Android-side image pipeline (resize + JPEG compression + thumbnail). */
interface PhotoProcessor {
    suspend fun process(raw: RawPhoto): Result<ProcessedPhoto>
}

/** FR-02.5 / FR-02.6 – upload, paginate, delete photos and resolve signed URLs. */
interface PhotoRepository {

    suspend fun getPhotos(drawerId: String, offset: Int, limit: Int): List<Photo>

    suspend fun photoCount(drawerId: String): Int

    /** Uploads objects to Storage, inserts the DB row and returns the photo. */
    suspend fun uploadPhoto(drawerId: String, processed: ProcessedPhoto): Photo

    suspend fun deletePhoto(photo: Photo)

    /** Private buckets → short-lived signed URLs. */
    suspend fun signedPhotoUrls(photos: List<Photo>): List<PhotoUrls>
}

/** FR-02.7 – drawer sharing with invitations (T-02.21 → T-02.24). */
interface ShareRepository {

    suspend fun getShares(drawerId: String): List<DrawerShare>

    suspend fun findRecipient(email: String): ShareRecipient?

    /** Creates/updates a PENDING invitation and returns its id. */
    suspend fun share(drawerId: String, email: String, permission: SharePermission): String

    /** Pending invitations the signed-in user received. */
    suspend fun getInvitations(): List<ShareInvitation>

    /** Accept or reject an invitation (recipient only). */
    suspend fun respond(shareId: String, accept: Boolean)

    suspend fun revoke(shareId: String)
}
