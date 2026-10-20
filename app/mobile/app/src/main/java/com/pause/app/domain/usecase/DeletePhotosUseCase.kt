package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.PhotoRepository

/** FR-02.6 – multi-select batch delete. */
class DeletePhotosUseCase(
    private val photoRepository: PhotoRepository,
) {
    suspend operator fun invoke(
        drawer: Drawer,
        photos: List<Photo>,
    ): Result<Int> {
        if (!drawer.canWrite) return Result.failure(DrawerFailure.ReadOnly)
        if (photos.isEmpty()) return Result.success(0)

        return drawerResult {
            photos.forEach { photo -> photoRepository.deletePhoto(photo) }
            photos.size
        }
    }
}
