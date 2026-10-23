package com.pause.app.data.repository

import com.pause.app.data.remote.dto.PhotoboothItemDto
import com.pause.app.data.remote.dto.PhotoboothItemInsertDto
import com.pause.app.data.remote.dto.PhotoboothPhotoInsertDto
import com.pause.app.data.remote.dto.PhotoboothTemplateDto
import com.pause.app.domain.model.PhotoboothDraft
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.repository.PhotoboothRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Direct PostgREST implementation for the currently available FR-03 schema. */
class PhotoboothRepositoryImpl(
    private val client: SupabaseClient,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : PhotoboothRepository {

    override suspend fun getActiveTemplates(): List<PhotoboothTemplate> = withContext(ioDispatcher) {
        client.from(TEMPLATES).select {
            filter { eq("is_active", true) }
        }.decodeList<PhotoboothTemplateDto>().map { dto ->
            PhotoboothTemplate(
                id = dto.id,
                name = dto.name,
                category = dto.category,
                previewPath = dto.previewUrl,
                slotCount = dto.slotCount,
                isPremium = dto.isPremium,
            )
        }
    }

    override suspend fun createDraft(templateId: String, photoIds: List<String>): PhotoboothDraft =
        withContext(ioDispatcher) {
            val userId = client.auth.currentSessionOrNull()?.user?.id
                ?: error("A signed-in user is required")
            val item = client.from(ITEMS)
                .insert(PhotoboothItemInsertDto(userId = userId, templateId = templateId))
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
            PhotoboothDraft(item.id, item.templateId, photoIds)
        }

    private companion object {
        const val TEMPLATES = "photobooth_templates"
        const val ITEMS = "photobooth_items"
        const val PHOTOS = "photobooth_photos"
    }
}
