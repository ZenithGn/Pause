package com.pause.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PrintOrderDto(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("photobooth_item_id") val photoboothItemId: String,
    val quantity: Int = 1,
    @SerialName("unit_price_vnd") val unitPriceVnd: Int,
    @SerialName("total_price_vnd") val totalPriceVnd: Int,
    @SerialName("shipping_name") val shippingName: String,
    @SerialName("shipping_phone") val shippingPhone: String,
    @SerialName("shipping_address") val shippingAddress: String,
    val note: String? = null,
    @SerialName("cover_type") val coverType: String = "soft",
    @SerialName("paper_type") val paperType: String = "standard",
    val status: String = "pending",
    @SerialName("admin_notes") val adminNotes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class PrintOrderInsertDto(
    @SerialName("user_id") val userId: String,
    @SerialName("photobooth_item_id") val photoboothItemId: String,
    val quantity: Int = 1,
    @SerialName("unit_price_vnd") val unitPriceVnd: Int,
    @SerialName("total_price_vnd") val totalPriceVnd: Int,
    @SerialName("shipping_name") val shippingName: String,
    @SerialName("shipping_phone") val shippingPhone: String,
    @SerialName("shipping_address") val shippingAddress: String,
    val note: String? = null,
    @SerialName("cover_type") val coverType: String = "soft",
    @SerialName("paper_type") val paperType: String = "standard",
)

/** Joined query result for order list display (order + template name via photobooth_items). */
@Serializable
data class PrintOrderWithTemplateDto(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("photobooth_item_id") val photoboothItemId: String,
    val quantity: Int = 1,
    @SerialName("unit_price_vnd") val unitPriceVnd: Int,
    @SerialName("total_price_vnd") val totalPriceVnd: Int,
    @SerialName("shipping_name") val shippingName: String,
    @SerialName("shipping_phone") val shippingPhone: String,
    @SerialName("shipping_address") val shippingAddress: String,
    val note: String? = null,
    @SerialName("cover_type") val coverType: String = "soft",
    @SerialName("paper_type") val paperType: String = "standard",
    val status: String = "pending",
    @SerialName("admin_notes") val adminNotes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    // Nested from photobooth_items → photobooth_templates
    @SerialName("photobooth_items") val photoboothItem: PhotoboothItemJoinDto? = null,
)

@Serializable
data class PhotoboothItemJoinDto(
    val id: String,
    @SerialName("template_id") val templateId: String,
    @SerialName("preview_url") val previewUrl: String? = null,
    val status: String = "draft",
    @SerialName("photobooth_templates") val template: PhotoboothTemplateJoinDto? = null,
)

@Serializable
data class PhotoboothTemplateJoinDto(
    val name: String,
    @SerialName("preview_url") val previewUrl: String,
)
