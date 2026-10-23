package com.pause.app.domain.model

/** A printable layout supplied by the photobooth_templates table. */
data class PhotoboothTemplate(
    val id: String,
    val name: String,
    val category: String,
    val previewPath: String,
    val slotCount: Int,
    val isPremium: Boolean,
)

/** A saved draft connecting a template with the caller's selected memory photos. */
data class PhotoboothDraft(
    val id: String,
    val templateId: String,
    val selectedPhotoIds: List<String>,
)
