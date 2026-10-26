package com.pause.app.domain.usecase

import com.pause.app.domain.model.PhotoboothDraft
import com.pause.app.domain.model.PhotoboothRenderer
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.model.PreviewUploader
import com.pause.app.domain.repository.PhotoboothRepository

/**
 * FR-03.2 / T-03.12 – renders the template + selected photos into a preview
 * image, uploads it to Cloudinary and persists the draft with its preview URL.
 */
class CreatePhotoboothUseCase(
    private val photoboothRepository: PhotoboothRepository,
    private val renderer: PhotoboothRenderer,
    private val previewUploader: PreviewUploader,
) {

    suspend operator fun invoke(
        template: PhotoboothTemplate,
        photoIds: List<String>,
        photoUrls: List<String>,
        caption: String? = null,
    ): Result<PhotoboothDraft> {
        if (photoIds.size != template.slotCount || photoUrls.size != photoIds.size) {
            return Result.failure(
                IllegalArgumentException(
                    "Template ${template.name} needs ${template.slotCount} photos " +
                        "(got ${photoIds.size})",
                ),
            )
        }

        val rendered = renderer.render(template, photoUrls, caption).getOrElse { error ->
            return Result.failure(error)
        }
        val previewUrl = previewUploader.uploadPreview(rendered).getOrElse { error ->
            return Result.failure(error)
        }

        return runCatching {
            photoboothRepository.createDraft(template.id, photoIds, previewUrl)
        }
    }
}
