package com.pause.app.domain.model

/** A printable layout supplied by the photobooth_templates table. */
data class PhotoboothTemplate(
    val id: String,
    val name: String,
    val category: String,
    /** Cloudinary/CDN URL of the template preview image. */
    val previewPath: String,
    val slotCount: Int,
    val isPremium: Boolean,
    val layoutConfig: TemplateLayout? = null,
)

/** A saved photobooth (template + selected photos + rendered preview). */
data class PhotoboothDraft(
    val id: String,
    val templateId: String,
    val selectedPhotoIds: List<String>,
    val previewUrl: String? = null,
)
