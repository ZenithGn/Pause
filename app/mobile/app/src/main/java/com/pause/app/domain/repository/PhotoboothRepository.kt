package com.pause.app.domain.repository

import com.pause.app.domain.model.PhotoboothDraft
import com.pause.app.domain.model.PhotoboothTemplate

/** FR-03 – templates + saved photobooth drafts (T-03.07/08). */
interface PhotoboothRepository {

    suspend fun getActiveTemplates(): List<PhotoboothTemplate>

    suspend fun getTemplate(templateId: String): PhotoboothTemplate?

    suspend fun createDraft(
        templateId: String,
        photoIds: List<String>,
        previewUrl: String? = null,
    ): PhotoboothDraft
}
