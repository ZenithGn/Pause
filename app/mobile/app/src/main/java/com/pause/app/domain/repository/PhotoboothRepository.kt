package com.pause.app.domain.repository

import com.pause.app.domain.model.PhotoboothDraft
import com.pause.app.domain.model.PhotoboothTemplate

/** FR-03 data boundary. RLS still determines which rows a caller may create/read. */
interface PhotoboothRepository {
    suspend fun getActiveTemplates(): List<PhotoboothTemplate>

    /** Persists the builder choices as a draft; preview rendering remains client-side for now. */
    suspend fun createDraft(templateId: String, photoIds: List<String>): PhotoboothDraft
}
