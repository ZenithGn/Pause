package com.pause.app.domain.repository

import com.pause.app.domain.model.PrintOrder
import com.pause.app.domain.model.ShippingInfo

/** FR-03 order data boundary. */
interface OrderRepository {

    /** Place a new print order for a saved photobooth draft. */
    suspend fun createOrder(
        photoboothItemId: String,
        quantity: Int,
        unitPriceVnd: Int,
        shipping: ShippingInfo,
    ): PrintOrder

    /** List all orders for the current user, newest first. */
    suspend fun getOrders(): List<PrintOrder>

    /** Fetch a single order by ID. */
    suspend fun getOrder(orderId: String): PrintOrder

    /** List orders filtered by status. */
    suspend fun getOrdersByStatus(status: String): List<PrintOrder>
}
