package com.pause.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class PhotoboothTemplateDto(
    val id: String,
    val name: String,
    val category: String,
    @SerialName("preview_url") val previewUrl: String,
    @SerialName("slot_count") val slotCount: Int,
    @SerialName("is_premium") val isPremium: Boolean = false,
    @SerialName("layout_config") val layoutConfig: JsonElement? = null,
)

@Serializable
data class PhotoboothItemInsertDto(
    @SerialName("user_id") val userId: String,
    @SerialName("template_id") val templateId: String,
    @SerialName("preview_url") val previewUrl: String? = null,
    val status: String = "draft",
)

@Serializable
data class PhotoboothItemDto(
    val id: String,
    @SerialName("template_id") val templateId: String,
    @SerialName("preview_url") val previewUrl: String? = null,
)

@Serializable
data class PhotoboothPhotoInsertDto(
    @SerialName("photobooth_item_id") val photoboothItemId: String,
    @SerialName("photo_id") val photoId: String,
    @SerialName("slot_index") val slotIndex: Int,
)
