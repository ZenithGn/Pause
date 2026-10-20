package com.pause.app.domain.usecase

import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.PhotoRepository
import com.pause.app.domain.repository.PhotoUrls

/** FR-02.6 – paginated photo loading for the detail grid. */
class GetPhotosUseCase(
    private val photoRepository: PhotoRepository,
) {
    suspend operator fun invoke(
        drawerId: String,
        offset: Int = 0,
        limit: Int = DrawerLimits.PAGE_SIZE,
    ): Result<List<Photo>> {
        if (offset < 0) {
            return Result.failure(com.pause.app.domain.model.DrawerFailure.Unknown("bad offset"))
        }
        val pageSize = limit.coerceIn(1, DrawerLimits.MAX_PAGE_SIZE)
        return drawerResult { photoRepository.getPhotos(drawerId, offset, pageSize) }
    }
}

/** Resolves signed URLs for the private photo/thumbnail buckets (T-02.12). */
class GetPhotoUrlsUseCase(
    private val photoRepository: PhotoRepository,
) {
    suspend operator fun invoke(photos: List<Photo>): Result<List<PhotoUrls>> =
        drawerResult { photoRepository.signedPhotoUrls(photos) }
}
