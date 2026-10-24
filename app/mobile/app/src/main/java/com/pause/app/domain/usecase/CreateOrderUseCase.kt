package com.pause.app.domain.usecase

import com.pause.app.domain.model.PrintOrder
import com.pause.app.domain.model.ShippingInfo
import com.pause.app.domain.repository.OrderRepository

/**
 * Place a new print order for a saved photobooth draft.
 * Validates shipping info before calling the repository.
 */
class CreateOrderUseCase(private val orderRepository: OrderRepository) {

    suspend operator fun invoke(
        photoboothItemId: String,
        quantity: Int,
        unitPriceVnd: Int,
        shipping: ShippingInfo,
    ): PrintOrder {
        require(photoboothItemId.isNotBlank()) { "Photobooth item ID is required" }
        require(quantity > 0) { "Quantity must be positive" }
        require(unitPriceVnd >= 0) { "Unit price must be non-negative" }
        require(shipping.name.isNotBlank()) { "Shipping name is required" }
        require(shipping.phone.isNotBlank()) { "Shipping phone is required" }
        require(shipping.address.isNotBlank()) { "Shipping address is required" }

        return orderRepository.createOrder(
            photoboothItemId = photoboothItemId,
            quantity = quantity,
            unitPriceVnd = unitPriceVnd,
            shipping = shipping,
        )
    }
}
