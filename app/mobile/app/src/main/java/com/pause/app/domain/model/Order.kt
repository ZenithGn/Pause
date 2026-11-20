package com.pause.app.domain.model

import java.time.Instant

/** Status lifecycle of a print order (FR-03 / print_orders.status). */
enum class OrderStatus(val wire: String, val label: String) {
    PENDING("pending", "Chờ xử lý"),
    PROCESSING("processing", "Đang xử lý"),
    PRINTING("printing", "Đang in"),
    SHIPPING("shipping", "Đang giao"),
    COMPLETED("completed", "Hoàn thành"),
    CANCELLED("cancelled", "Đã hủy"),
    ;

    companion object {
        fun fromWire(value: String?): OrderStatus =
            entries.firstOrNull { it.wire == value } ?: PENDING
    }
}

/** A print order placed by the user (FR-03.3 / print_orders table). */
data class PrintOrder(
    val id: String,
    val userId: String,
    val photoboothItemId: String,
    val quantity: Int = 1,
    val unitPriceVnd: Int,
    val totalPriceVnd: Int,
    val shippingName: String,
    val shippingPhone: String,
    val shippingAddress: String,
    val note: String? = null,
    val coverType: String = "soft",
    val paperType: String = "standard",
    val status: OrderStatus = OrderStatus.PENDING,
    val adminNotes: String? = null,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null,
    // Joined fields for display
    val templateName: String? = null,
    val previewUrl: String? = null,
)

/** Shipping info entered by the user in the checkout form. */
data class ShippingInfo(
    val name: String,
    val phone: String,
    val address: String,
    val note: String = "",
)
