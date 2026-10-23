package com.pause.app.data.repository

import com.pause.app.data.remote.dto.PrintOrderDto
import com.pause.app.data.remote.dto.PrintOrderInsertDto
import com.pause.app.data.remote.dto.PrintOrderWithTemplateDto
import com.pause.app.domain.model.OrderStatus
import com.pause.app.domain.model.PrintOrder
import com.pause.app.domain.model.ShippingInfo
import com.pause.app.domain.repository.OrderRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant

/** Direct PostgREST implementation for FR-03 print orders. */
class OrderRepositoryImpl(
    private val client: SupabaseClient,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : OrderRepository {

    override suspend fun createOrder(
        photoboothItemId: String,
        quantity: Int,
        unitPriceVnd: Int,
        shipping: ShippingInfo,
    ): PrintOrder = withContext(ioDispatcher) {
        val userId = client.auth.currentSessionOrNull()?.user?.id
            ?: error("A signed-in user is required")
        val totalPrice = unitPriceVnd * quantity
        val dto = client.from(TABLE).insert(
            PrintOrderInsertDto(
                userId = userId,
                photoboothItemId = photoboothItemId,
                quantity = quantity,
                unitPriceVnd = unitPriceVnd,
                totalPriceVnd = totalPrice,
                shippingName = shipping.name,
                shippingPhone = shipping.phone,
                shippingAddress = shipping.address,
                note = shipping.note.ifBlank { null },
            ),
        ).decodeSingle<PrintOrderDto>()
        dto.toDomain()
    }

    override suspend fun getOrders(): List<PrintOrder> = withContext(ioDispatcher) {
        client.from(TABLE).select(JOINED_COLUMNS) {
            order("created_at", Order.DESCENDING)
        }.decodeList<PrintOrderWithTemplateDto>().map { it.toDomain() }
    }

    override suspend fun getOrder(orderId: String): PrintOrder = withContext(ioDispatcher) {
        client.from(TABLE).select(JOINED_COLUMNS) {
            filter { eq("id", orderId) }
        }.decodeSingle<PrintOrderWithTemplateDto>().toDomain()
    }

    override suspend fun getOrdersByStatus(status: String): List<PrintOrder> = withContext(ioDispatcher) {
        client.from(TABLE).select(JOINED_COLUMNS) {
            filter { eq("status", status) }
            order("created_at", Order.DESCENDING)
        }.decodeList<PrintOrderWithTemplateDto>().map { it.toDomain() }
    }

    private fun PrintOrderDto.toDomain() = PrintOrder(
        id = id,
        userId = userId,
        photoboothItemId = photoboothItemId,
        quantity = quantity,
        unitPriceVnd = unitPriceVnd,
        totalPriceVnd = totalPriceVnd,
        shippingName = shippingName,
        shippingPhone = shippingPhone,
        shippingAddress = shippingAddress,
        note = note,
        status = OrderStatus.fromWire(status),
        adminNotes = adminNotes,
        createdAt = createdAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
        updatedAt = updatedAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
    )

    private fun PrintOrderWithTemplateDto.toDomain() = PrintOrder(
        id = id,
        userId = userId,
        photoboothItemId = photoboothItemId,
        quantity = quantity,
        unitPriceVnd = unitPriceVnd,
        totalPriceVnd = totalPriceVnd,
        shippingName = shippingName,
        shippingPhone = shippingPhone,
        shippingAddress = shippingAddress,
        note = note,
        status = OrderStatus.fromWire(status),
        adminNotes = adminNotes,
        createdAt = createdAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
        updatedAt = updatedAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
        templateName = photoboothItem?.template?.name,
        previewUrl = photoboothItem?.previewUrl ?: photoboothItem?.template?.previewUrl,
    )

    private companion object {
        const val TABLE = "print_orders"
        val JOINED_COLUMNS = Columns.raw(
            "*, photobooth_items(id, template_id, preview_url, status, photobooth_templates(name, preview_url))",
        )
    }
}
