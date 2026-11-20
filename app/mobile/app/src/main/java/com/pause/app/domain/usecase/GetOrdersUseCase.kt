package com.pause.app.domain.usecase

import com.pause.app.domain.model.PrintOrder
import com.pause.app.domain.repository.OrderRepository

/** Fetch all orders for the current user. */
class GetOrdersUseCase(private val orderRepository: OrderRepository) {
    suspend operator fun invoke(): List<PrintOrder> = orderRepository.getOrders()
}

/** Fetch a single order by ID. */
class GetOrderDetailUseCase(private val orderRepository: OrderRepository) {
    suspend operator fun invoke(orderId: String): PrintOrder = orderRepository.getOrder(orderId)
}
