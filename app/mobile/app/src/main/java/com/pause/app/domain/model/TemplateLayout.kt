package com.pause.app.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** One image region of a photobooth template (pixels in template coordinates). */
@Serializable
data class TemplateSlot(
    val index: Int = 0,
    val x: Int = 0,
    val y: Int = 0,
    val width: Int = 0,
    val height: Int = 0,
)

/** One caption baked into the template (user cannot edit it). */
@Serializable
data class TemplateText(
    val content: String = "",
    val x: Int = 0,
    val y: Int = 0,
    @SerialName("font_size") val fontSize: Int = 40,
    val color: String = "#111111",
)

/** `photobooth_templates.layout_config` (FR-03.2). */
@Serializable
data class TemplateLayout(
    val width: Int = 1200,
    val height: Int = 1800,
    @SerialName("background_color") val backgroundColor: String = "#FFFFFF",
    val slots: List<TemplateSlot> = emptyList(),
    val texts: List<TemplateText> = emptyList(),
    @SerialName("frame_url") val frameUrl: String? = null,
)

/** Parses `layout_config`; returns null when the JSON is missing/invalid. */
fun parseTemplateLayout(raw: String?): TemplateLayout? {
    if (raw.isNullOrBlank()) return null
    return runCatching { Json { ignoreUnknownKeys = true }.decodeFromString<TemplateLayout>(raw) }
        .getOrNull()
}

/** Renders template + photos into a single printable JPEG (T-03.17). */
interface PhotoboothRenderer {
    /** @param caption user caption rendered at the bottom (Edit Template screen). */
    suspend fun render(
        template: PhotoboothTemplate,
        photoUrls: List<String>,
        caption: String? = null,
    ): Result<ByteArray>
}

/** Uploads the rendered preview to Cloudinary (T-03.17 / storage-strategy.md). */
interface PreviewUploader {
    suspend fun uploadPreview(byteArray: ByteArray): Result<String>
}
