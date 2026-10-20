package com.pause.app.testutil

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.Photo
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareRecipient
import com.pause.app.domain.model.ShareStatus
import com.pause.app.domain.repository.DrawerRepository
import com.pause.app.domain.repository.PhotoProcessor
import com.pause.app.domain.repository.PhotoRepository
import com.pause.app.domain.repository.PhotoUrls
import com.pause.app.domain.repository.ProcessedPhoto
import com.pause.app.domain.repository.RawPhoto
import com.pause.app.domain.repository.ShareRepository

/** In-memory [DrawerRepository] for FR-02 tests. */
class FakeDrawerRepository : DrawerRepository {

    val drawers = mutableListOf<Drawer>()

    var createFailure: DrawerFailure? = null
    var updateFailure: DrawerFailure? = null
    var deleteFailure: DrawerFailure? = null
    var listFailure: DrawerFailure? = null

    var lastCreatedName: String? = null
    var lastCreatedDescription: String? = null
    val deletedDrawerIds = mutableListOf<String>()

    override suspend fun listDrawers(): List<Drawer> {
        listFailure?.let { throw it }
        return drawers.toList()
    }

    override suspend fun getDrawer(drawerId: String): Drawer =
        drawers.firstOrNull { it.id == drawerId } ?: throw DrawerFailure.NotFound

    override suspend fun ownedDrawerCount(ownerId: String): Int =
        drawers.count { it.ownerId == ownerId }

    override suspend fun createDrawer(
        ownerId: String,
        name: String,
        description: String?,
    ): Drawer {
        createFailure?.let { throw it }
        lastCreatedName = name
        lastCreatedDescription = description
        val drawer = Drawer(
            id = "drawer-${drawers.size + 1}",
            ownerId = ownerId,
            ownerName = "Me",
            name = name,
            description = description,
        )
        drawers += drawer
        return drawer
    }

    override suspend fun updateDrawer(
        drawerId: String,
        name: String,
        description: String?,
        coverPhotoPath: String?,
    ): Drawer {
        updateFailure?.let { throw it }
        val index = drawers.indexOfFirst { it.id == drawerId }
        if (index < 0) throw DrawerFailure.NotFound
        val updated = drawers[index].copy(name = name, description = description, coverPhotoPath = coverPhotoPath)
        drawers[index] = updated
        return updated
    }

    override suspend fun deleteDrawer(drawerId: String) {
        deleteFailure?.let { throw it }
        deletedDrawerIds += drawerId
        drawers.removeAll { it.id == drawerId }
    }

    override suspend fun setCoverPhoto(drawerId: String, coverPhotoPath: String?) = Unit
}

/** In-memory [PhotoRepository] for FR-02 tests. */
class FakePhotoRepository : PhotoRepository {

    val photos = mutableListOf<Photo>()

    var uploadFailure: DrawerFailure? = null
    var getFailure: DrawerFailure? = null
    val uploadedSizes = mutableListOf<Long>()
    private var counter = 0

    override suspend fun getPhotos(drawerId: String, offset: Int, limit: Int): List<Photo> {
        getFailure?.let { throw it }
        return photos.filter { it.drawerId == drawerId }.drop(offset).take(limit)
    }

    override suspend fun photoCount(drawerId: String): Int = photos.count { it.drawerId == drawerId }

    override suspend fun uploadPhoto(drawerId: String, processed: ProcessedPhoto): Photo {
        uploadFailure?.let { throw it }
        counter += 1
        val photo = Photo(
            id = "photo-$counter",
            drawerId = drawerId,
            uploadedBy = "user-id-1",
            originalPath = "$drawerId/photo-$counter.jpg",
            thumbnailPath = "$drawerId/photo-${counter}_thumb.jpg",
            sizeBytes = processed.original.size.toLong(),
        )
        uploadedSizes += processed.original.size.toLong()
        photos += photo
        return photo
    }

    override suspend fun deletePhoto(photo: Photo) {
        photos.removeAll { it.id == photo.id }
    }

    override suspend fun signedPhotoUrls(photos: List<Photo>): List<PhotoUrls> = photos.map {
        PhotoUrls(
            photoId = it.id,
            thumbnailUrl = "https://signed.test/thumb/${it.id}",
            originalUrl = "https://signed.test/original/${it.id}",
        )
    }
}

/** Configurable [PhotoProcessor] double (no Android Bitmap involved). */
class FakePhotoProcessor(
    var outputSize: Int = 1024,
    var failure: DrawerFailure? = null,
) : PhotoProcessor {

    val processedCount: Int get() = counter
    private var counter = 0

    override suspend fun process(raw: RawPhoto): Result<ProcessedPhoto> {
        failure?.let { return Result.failure(it) }
        counter += 1
        return Result.success(
            ProcessedPhoto(
                original = ByteArray(outputSize) { 1 },
                thumbnail = ByteArray(64) { 2 },
                mimeType = "image/jpeg",
                width = 100,
                height = 100,
                takenAt = raw.takenAt,
            ),
        )
    }
}

/** In-memory [ShareRepository] for FR-02 tests. */
class FakeShareRepository : ShareRepository {

    val shares = mutableListOf<DrawerShare>()
    val invitations = mutableListOf<ShareInvitation>()
    val recipients = mutableMapOf<String, ShareRecipient>()

    var findFailure: DrawerFailure? = null
    var shareFailure: DrawerFailure? = null
    val shareCalls = mutableListOf<Pair<String, SharePermission>>()

    override suspend fun getShares(drawerId: String): List<DrawerShare> =
        shares.filter { it.sharedWithId.isNotEmpty() }

    override suspend fun findRecipient(email: String): ShareRecipient? {
        findFailure?.let { throw it }
        return recipients[email.lowercase()]
    }

    override suspend fun share(drawerId: String, email: String, permission: SharePermission): String {
        shareFailure?.let { throw it }
        shareCalls += email to permission
        val recipient = recipients[email.lowercase()] ?: throw DrawerFailure.NotFound
        val share = DrawerShare(
            id = "share-${shares.size + 1}",
            sharedWithId = recipient.id,
            email = recipient.email,
            displayName = recipient.displayName,
            permission = permission,
            status = ShareStatus.PENDING,
        )
        shares.removeAll { it.email == recipient.email }
        shares += share
        return share.id
    }

    override suspend fun getInvitations(): List<ShareInvitation> = invitations.toList()

    override suspend fun respond(shareId: String, accept: Boolean) {
        val index = shares.indexOfFirst { it.id == shareId }
        if (index >= 0) {
            shares[index] = shares[index].copy(
                status = if (accept) ShareStatus.ACCEPTED else ShareStatus.REJECTED,
            )
        }
        invitations.removeAll { it.id == shareId }
    }

    override suspend fun revoke(shareId: String) {
        shares.removeAll { it.id == shareId }
    }
}

/** Convenience drawer factory for tests. */
fun testDrawer(
    id: String = "drawer-1",
    ownerId: String = "user-id-1",
    ownerName: String = "Me",
    name: String = "Đà Lạt 2026",
    storageUsedBytes: Long = 0,
    storageLimitBytes: Long = Drawer.DEFAULT_LIMIT_BYTES,
    isOwner: Boolean = true,
    permission: SharePermission = SharePermission.EDIT,
    photoCount: Int = 0,
): Drawer = Drawer(
    id = id,
    ownerId = ownerId,
    ownerName = ownerName,
    name = name,
    storageUsedBytes = storageUsedBytes,
    storageLimitBytes = storageLimitBytes,
    isOwner = isOwner,
    permission = permission,
    photoCount = photoCount,
)
