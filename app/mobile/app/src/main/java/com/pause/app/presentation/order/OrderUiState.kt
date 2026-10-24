package com.pause.app.presentation.order

import com.pause.app.domain.model.OrderStatus
import com.pause.app.domain.model.PrintOrder
import com.pause.app.presentation.common.UiText

/** UI state for the order checkout form. */
data class OrderFormUiState(
    val photoboothItemId: String = "",
    val templateName: String = "",
    val previewUrl: String? = null,
    val slotCount: Int = 0,
    val unitPriceVnd: Int = 25_000,
    val quantity: Int = 1,
    // Shipping fields
    val shippingName: String = "",
    val shippingPhone: String = "",
    val shippingAddress: String = "",
    val note: String = "",
    // State
    val isSubmitting: Boolean = false,
    val createdOrder: PrintOrder? = null,
    val error: UiText? = null,
) {
    val totalPriceVnd: Int get() = unitPriceVnd * quantity
    val shippingFeeVnd: Int get() = 30_000
    val grandTotalVnd: Int get() = totalPriceVnd + shippingFeeVnd

    val canSubmit: Boolean
        get() = shippingName.isNotBlank() &&
                shippingPhone.isNotBlank() &&
                shippingAddress.isNotBlank() &&
                !isSubmitting &&
                createdOrder == null
}

/** UI state for the order list screen. */
data class OrderListUiState(
    val isLoading: Boolean = true,
    val orders: List<PrintOrder> = emptyList(),
    val selectedFilter: OrderFilter = OrderFilter.ALL,
    val error: UiText? = null,
) {
    val filteredOrders: List<PrintOrder>
        get() = when (selectedFilter) {
            OrderFilter.ALL -> orders
            OrderFilter.PROCESSING -> orders.filter {
                it.status in listOf(
                    OrderStatus.PENDING,
                    OrderStatus.PROCESSING,
                    OrderStatus.PRINTING,
                    OrderStatus.SHIPPING,
                )
            }
            OrderFilter.COMPLETED -> orders.filter {
                it.status == OrderStatus.COMPLETED || it.status == OrderStatus.CANCELLED
            }
        }
}

/** Filter tabs for order list. */
enum class OrderFilter(val label: String) {
    ALL("Tất cả"),
    PROCESSING("Đang xử lý"),
    COMPLETED("Đã hoàn thành"),
}

/** UI state for order detail screen. */
data class OrderDetailUiState(
    val isLoading: Boolean = true,
    val order: PrintOrder? = null,
    val error: UiText? = null,
)
