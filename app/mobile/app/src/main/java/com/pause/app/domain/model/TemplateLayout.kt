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

/** Vertical strip used when a template has no valid `layout_config`. */
fun fallbackTemplateLayout(slotCount: Int) = TemplateLayout(
    width = 1200,
    height = 1800,
    slots = List(slotCount.coerceAtLeast(1)) { index ->
        TemplateSlot(index = index, x = 60, y = 60 + index * 560, width = 1080, height = 500)
    },
)

/** Layout shared by the on-screen preview and [PhotoboothRenderer]. */
val PhotoboothTemplate.effectiveLayout: TemplateLayout
    get() = layoutConfig?.takeIf { it.slots.isNotEmpty() } ?: fallbackTemplateLayout(slotCount)

/** Font size / bottom offset (template px) of the user caption baked into the render. */
const val CAPTION_FONT_SIZE_PX = 52f
const val CAPTION_BOTTOM_OFFSET_PX = 60f

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
