package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.PhotoProcessor
import com.pause.app.domain.repository.PhotoRepository
import com.pause.app.domain.repository.RawPhoto

/** Per-photo failure while uploading a batch (partial success is possible). */
data class PhotoUploadFailure(
    val index: Int,
    val failure: DrawerFailure,
)

data class UploadPhotosResult(
    val uploaded: List<Photo>,
    val failures: List<PhotoUploadFailure>,
    val remainingBytes: Long,
)

/**
 * FR-02.5 – batch upload with client-side compression and quota pre-check.
 *
 * Pipeline per photo: [PhotoProcessor.process] (resize + JPEG + thumbnail) →
 * size limit → remaining quota → Storage upload + DB insert. The server trigger
 * `enforce_photo_quota()` remains the authority.
 */
class UploadPhotosUseCase(
    private val photoRepository: PhotoRepository,
    private val photoProcessor: PhotoProcessor,
) {
    suspend operator fun invoke(
        drawer: Drawer,
        rawPhotos: List<RawPhoto>,
        onProgress: (completed: Int, total: Int) -> Unit = { _, _ -> },
    ): Result<UploadPhotosResult> {
        if (!drawer.canWrite) return Result.failure(DrawerFailure.ReadOnly)
        if (rawPhotos.isEmpty()) {
            return Result.success(UploadPhotosResult(emptyList(), emptyList(), drawer.remainingBytes))
        }
        if (drawer.isFull) {
            return Result.failure(DrawerFailure.StorageFull(drawer.storageUsedBytes, drawer.storageLimitBytes))
        }

        return try {
            val uploaded = mutableListOf<Photo>()
            val failures = mutableListOf<PhotoUploadFailure>()
            var remaining = drawer.remainingBytes

            rawPhotos.forEachIndexed { index, raw ->
                onProgress(index, rawPhotos.size)

                if (remaining <= 0) {
                    failures += PhotoUploadFailure(
                        index,
                        DrawerFailure.StorageFull(drawer.storageUsedBytes, drawer.storageLimitBytes),
                    )
                    return@forEachIndexed
                }

                val processed = photoProcessor.process(raw).getOrElse { error ->
                    failures += PhotoUploadFailure(
                        index,
                        error as? DrawerFailure ?: DrawerFailure.UnsupportedFormat,
                    )
                    return@forEachIndexed
                }

                val size = processed.original.size.toLong()
                if (size > DrawerLimits.MAX_COMPRESSED_PHOTO_BYTES) {
                    failures += PhotoUploadFailure(
                        index,
                        DrawerFailure.PhotoTooLarge(size, DrawerLimits.MAX_COMPRESSED_PHOTO_BYTES),
                    )
                    return@forEachIndexed
                }

                if (size > remaining) {
                    failures += PhotoUploadFailure(
                        index,
                        DrawerFailure.StorageFull(drawer.storageUsedBytes, drawer.storageLimitBytes),
                    )
                    return@forEachIndexed
                }

                try {
                    val photo = photoRepository.uploadPhoto(drawer.id, processed)
                    uploaded += photo
                    remaining -= size
                } catch (error: DrawerFailure) {
                    failures += PhotoUploadFailure(index, error)
                } catch (error: Exception) {
                    failures += PhotoUploadFailure(index, DrawerFailure.Unknown(error.message))
                }
            }

            onProgress(rawPhotos.size, rawPhotos.size)
            Result.success(UploadPhotosResult(uploaded, failures, remaining))
        } catch (error: Exception) {
            Result.failure(DrawerFailure.Unknown(error.message))
        }
    }
}
