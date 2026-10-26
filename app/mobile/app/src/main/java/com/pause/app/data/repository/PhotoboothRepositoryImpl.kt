package com.pause.app.data.repository

import com.pause.app.data.remote.dto.PhotoboothItemDto
import com.pause.app.data.remote.dto.PhotoboothItemInsertDto
import com.pause.app.data.remote.dto.PhotoboothPhotoInsertDto
import com.pause.app.data.remote.dto.PhotoboothTemplateDto
import com.pause.app.domain.model.PhotoboothDraft
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.model.parseTemplateLayout
import com.pause.app.domain.repository.PhotoboothRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** PostgREST implementation for FR-03 templates + drafts. */
class PhotoboothRepositoryImpl(
    private val client: SupabaseClient,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : PhotoboothRepository {

    override suspend fun getActiveTemplates(): List<PhotoboothTemplate> = withContext(ioDispatcher) {
        client.from(TEMPLATES).select {
            filter { eq("is_active", true) }
        }.decodeList<PhotoboothTemplateDto>().map { it.toDomain() }
    }

    override suspend fun getTemplate(templateId: String): PhotoboothTemplate? =
        withContext(ioDispatcher) {
            client.from(TEMPLATES).select {
                filter { eq("id", templateId) }
            }.decodeList<PhotoboothTemplateDto>().firstOrNull()?.toDomain()
        }

    override suspend fun createDraft(
        templateId: String,
        photoIds: List<String>,
        previewUrl: String?,
    ): PhotoboothDraft = withContext(ioDispatcher) {
        val userId = client.auth.currentSessionOrNull()?.user?.id
            ?: error("A signed-in user is required")

        val item = client.from(ITEMS)
            .insert(
                PhotoboothItemInsertDto(
                    userId = userId,
                    templateId = templateId,
                    previewUrl = previewUrl,
                    status = if (previewUrl != null) "completed" else "draft",
                ),
            )
            .decodeSingle<PhotoboothItemDto>()

        photoIds.forEachIndexed { index, photoId ->
            client.from(PHOTOS).insert(
                PhotoboothPhotoInsertDto(
                    photoboothItemId = item.id,
                    photoId = photoId,
                    slotIndex = index,
                ),
            )
        }
        PhotoboothDraft(item.id, item.templateId, photoIds, item.previewUrl ?: previewUrl)
    }

    private fun PhotoboothTemplateDto.toDomain() = PhotoboothTemplate(
        id = id,
        name = name,
        category = category,
        previewPath = previewUrl,
        slotCount = slotCount,
        isPremium = isPremium,
        layoutConfig = parseTemplateLayout(layoutConfig?.toString()),
    )

    private companion object {
        const val TEMPLATES = "photobooth_templates"
        const val ITEMS = "photobooth_items"
        const val PHOTOS = "photobooth_photos"
    }
}
